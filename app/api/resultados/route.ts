import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getResultadosFinales, getProcesoConjunto, getMatrizEvaluacionAdmin, getDatosActa } from '@/lib/supabase/queries'
import { requireAuth, getSupabaseClient } from '@/lib/supabase/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { ITEMS_VALIDACION_LEGAL } from '@/lib/types/index'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId, user } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const procesoId = searchParams.get('proceso_id')
    const type = searchParams.get('type')

    if (!procesoId) {
      return NextResponse.json({ error: 'proceso_id es requerido' }, { status: 400 })
    }

    const { data: proceso, error: procError } = await getProcesoConjunto(procesoId, conjuntoId!)
    if (procError || !proceso) {
      return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
    }

    if (type === 'stats') {
      const supabase = await createClient()
      return await getStats(supabase, procesoId)
    }

    if (type === 'matriz') {
      const matriz = await getMatrizEvaluacionAdmin(procesoId)
      return NextResponse.json(matriz)
    }

    if (type === 'no_apto_legal') {
      return await getNoAptoLegal(procesoId)
    }

    if (type === 'acta') {
      let generadoPor: string | undefined
      if (user) {
        const supabase = await getSupabaseClient()
        const { data: perfil } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', user.id)
          .single()
        generadoPor = perfil?.nombre ?? user.email ?? undefined
      }
      const datos = await getDatosActa(procesoId, generadoPor)
      return NextResponse.json(datos)
    }

    const resultados = await getResultadosFinales(procesoId)
    return NextResponse.json(resultados)
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
  }
}

/**
 * POST /api/resultados?proceso_id=<uuid>
 * Dispara el recálculo completo de puntajes del proceso.
 * Solo accesible por admins autenticados.
 */
export async function POST(request: NextRequest) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const procesoId = searchParams.get('proceso_id')

    if (!procesoId) {
      return NextResponse.json({ error: 'proceso_id es requerido' }, { status: 400 })
    }

    const { data: proceso, error: procError } = await getProcesoConjunto(procesoId, conjuntoId!)
    if (procError || !proceso) {
      return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
    }

    const supabase = createAdminClient()
    // recalcular_resultados retorna VOID — solo verificamos que no haya error
    const { error } = await supabase
      .rpc('recalcular_resultados', { p_proceso_id: procesoId })

    if (error) {
      console.error('[resultados/calcular]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[resultados/calcular] error:', error)
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
  }
}

async function getNoAptoLegal(procesoId: string) {
  const supabase = createAdminClient()

  const { data: propuestas, error } = await supabase
    .from('propuestas')
    .select('id, razon_social, tipo_persona, checklist_legal, observaciones_legales')
    .eq('proceso_id', procesoId)
    .eq('estado', 'no_apto_legal')
    .order('razon_social')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!propuestas || propuestas.length === 0) return NextResponse.json([])

  const ids = propuestas.map((p: { id: string }) => p.id)

  const { data: historial } = await supabase
    .from('historial_estados_propuesta')
    .select('propuesta_id, observacion, created_at')
    .in('propuesta_id', ids)
    .eq('estado_nuevo', 'no_apto_legal')
    .order('created_at', { ascending: false })

  // Keep only the most recent rejection entry per propuesta
  const historialMap = new Map<string, string | null>()
  for (const h of historial ?? []) {
    if (!historialMap.has(h.propuesta_id)) {
      historialMap.set(h.propuesta_id, h.observacion ?? null)
    }
  }

  const ORDEN_CRITICIDAD: Record<string, number> = { critico: 0, importante: 1, condicionante: 2, informativo: 3 }

  const result = propuestas.map((p: {
    id: string
    razon_social: string
    tipo_persona: string
    checklist_legal: Record<string, { id: string; estado: string; observacion: string }> | null
    observaciones_legales: string | null
  }) => {
    const ckl = p.checklist_legal
    const tipoPersona = p.tipo_persona as 'juridica' | 'natural'

    const applicableItems = ITEMS_VALIDACION_LEGAL.filter(
      (d) => (d.aplica_a === 'ambos' || d.aplica_a === tipoPersona) && d.obligatorio !== false
    )

    let pctCumplimiento: number | null = null
    let itemsFallidos: { id: string; label: string; criticidad: string; observacion: string }[] = []

    if (ckl && Object.keys(ckl).length > 0) {
      const noCumple = applicableItems.filter((d) => ckl[d.id]?.estado === 'no_cumple')
      pctCumplimiento = Math.round(((applicableItems.length - noCumple.length) / applicableItems.length) * 100)

      itemsFallidos = noCumple
        .map((d) => ({
          id: d.id,
          label: d.label,
          criticidad: d.criticidad,
          observacion: ckl[d.id]?.observacion ?? '',
        }))
        .sort((a, b) => (ORDEN_CRITICIDAD[a.criticidad] ?? 9) - (ORDEN_CRITICIDAD[b.criticidad] ?? 9))
    }

    return {
      propuesta_id: p.id,
      razon_social: p.razon_social,
      tipo_persona: p.tipo_persona,
      observaciones_legales: p.observaciones_legales ?? null,
      razon_rechazo: historialMap.get(p.id) ?? null,
      pct_cumplimiento: pctCumplimiento,
      items_fallidos: itemsFallidos,
    }
  })

  return NextResponse.json(result)
}

async function getStats(supabase: any, procesoId: string) {
  try {
    const [consRes, evalRes, votRes, propRes] = await Promise.all([
      supabase
        .from('consejeros')
        .select('id')
        .eq('conjunto_id',
          (
            await supabase
              .from('procesos')
              .select('conjunto_id')
              .eq('id', procesoId)
              .single()
          ).data?.conjunto_id
        ),
      supabase
        .from('evaluaciones')
        .select('id', { head: true, count: 'exact' })
        .eq('proceso_id', procesoId),
      supabase
        .from('votos')
        .select('id', { head: true, count: 'exact' })
        .eq('proceso_id', procesoId),
      supabase
        .from('propuestas')
        .select('id', { head: true, count: 'exact' })
        .eq('proceso_id', procesoId)
        .eq('estado', 'activa'),
    ])

    return NextResponse.json({
      total_consejeros: consRes.data?.length || 0,
      evaluaciones_completadas: evalRes.count || 0,
      votaciones_completadas: votRes.count || 0,
      propuestas_activas: propRes.count || 0,
    })
  } catch (error) {
    console.error('[v0] Stats error:', error)
    return NextResponse.json({ error: 'Error obteniendo estadísticas' }, { status: 500 })
  }
}
