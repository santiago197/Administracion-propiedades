import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createClient } from '@/lib/supabase/server'
import type { ChecklistLegal, DefinicionItemChecklist, ValidacionLegalItemConfig } from '@/lib/types/index'
import { ITEMS_VALIDACION_LEGAL } from '@/lib/types/index'

const UMBRAL_APTO_CON_OBS = 70

function mapItemConfigToDef(item: ValidacionLegalItemConfig): DefinicionItemChecklist {
  return {
    id: item.codigo,
    seccion: item.seccion,
    label: item.nombre,
    descripcion: item.descripcion,
    criticidad: item.categoria,
    aplica_a: item.aplica_a,
    obligatorio: item.obligatorio,
  }
}

function calcularResultadoChecklist(
  checklist: ChecklistLegal,
  tipoPersona: 'juridica' | 'natural',
  items: DefinicionItemChecklist[]
): { cumple: boolean; pct: number } {
  const itemsObligatorios = items.filter(
    (def) =>
      def.obligatorio !== false &&
      (def.aplica_a === 'ambos' || def.aplica_a === tipoPersona)
  )

  const totalNoCumple = itemsObligatorios.filter(
    (def) => checklist[def.id]?.estado === 'no_cumple'
  ).length

  const pct =
    itemsObligatorios.length > 0
      ? Math.round(((itemsObligatorios.length - totalNoCumple) / itemsObligatorios.length) * 100)
      : 0

  const criticosPendientes = itemsObligatorios.some(
    (def) => def.criticidad === 'critico' && (checklist[def.id]?.estado ?? 'pendiente') === 'pendiente'
  )

  return {
    cumple: !criticosPendientes && pct >= UMBRAL_APTO_CON_OBS,
    pct,
  }
}

function consolidarObservaciones(
  checklist: ChecklistLegal,
  tipoPersona: 'juridica' | 'natural',
  items: DefinicionItemChecklist[]
): string {
  const itemsConProblema = items.filter((def) => {
    if (def.aplica_a !== 'ambos' && def.aplica_a !== tipoPersona) return false
    return checklist[def.id]?.estado === 'no_cumple'
  })

  if (itemsConProblema.length === 0) return ''

  return itemsConProblema
    .map((def) => {
      const obs = checklist[def.id]?.observacion?.trim()
      return obs ? `${def.label}: ${obs}` : `${def.label}: No cumple`
    })
    .join(' | ')
}

export async function POST(request: NextRequest) {
  const { authorized, response: authError, conjuntoId, user } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json().catch(() => ({}))
    const procesoId = typeof body?.proceso_id === 'string' ? body.proceso_id : null
    if (!procesoId) {
      return NextResponse.json({ error: 'proceso_id es requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: proceso, error: procesoError } = await supabase
      .from('procesos')
      .select('id,conjunto_id')
      .eq('id', procesoId)
      .single()
    if (procesoError || !proceso || proceso.conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Proceso no encontrado o sin acceso' }, { status: 403 })
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('validacion_legal_items')
      .select('*')
      .eq('activo', true)
      .order('seccion', { ascending: true })
      .order('orden', { ascending: true })
    if (itemsError) throw itemsError

    const definiciones: DefinicionItemChecklist[] = (itemsData ?? []).length > 0
      ? (itemsData ?? []).map((row) => mapItemConfigToDef(row as ValidacionLegalItemConfig))
      : ITEMS_VALIDACION_LEGAL

    const query = supabase
      .from('propuestas')
      .select('id,tipo_persona,checklist_legal,estado')
      .eq('proceso_id', procesoId)
      .eq('estado', 'no_apto_legal')

    const { data: propuestas, error: propuestasError } = await query
    if (propuestasError) throw propuestasError

    const errores: Array<{ propuesta_id: string; error: string }> = []
    let promovidas = 0
    let omitidasSinChecklist = 0
    let evaluadas = 0

    for (const propuesta of propuestas ?? []) {
      const checklist = propuesta.checklist_legal as ChecklistLegal | null
      if (!checklist || Object.keys(checklist).length === 0) {
        omitidasSinChecklist++
        continue
      }

      const tipoPersona = propuesta.tipo_persona as 'juridica' | 'natural'
      const { cumple, pct } = calcularResultadoChecklist(checklist, tipoPersona, definiciones)
      evaluadas++

      if (!cumple) continue

      const observaciones = consolidarObservaciones(checklist, tipoPersona, definiciones)

      const { error: updateError } = await supabase
        .from('propuestas')
        .update({
          cumple_requisitos_legales: true,
          observaciones_legales: observaciones || null,
        })
        .eq('id', propuesta.id)

      if (updateError) {
        errores.push({ propuesta_id: propuesta.id, error: updateError.message })
        continue
      }

      const { error: reabrirError } = await supabase.rpc('cambiar_estado_propuesta', {
        p_propuesta_id: propuesta.id,
        p_estado_nuevo: 'en_validacion',
        p_usuario_id: user?.id ?? null,
        p_observacion: observaciones || null,
        p_metadata: {
          origen: 'recalculo_umbral_validacion_legal_reapertura',
          umbral: UMBRAL_APTO_CON_OBS,
          porcentaje: pct,
        },
      })
      if (reabrirError) {
        const msg = reabrirError.message ?? ''
        if (msg.includes('INVALID_TRANSITION')) {
          errores.push({
            propuesta_id: propuesta.id,
            error: 'Falta transición no_apto_legal -> en_validacion. Ejecuta scripts/026_reabrir_no_apto_legal.sql en Supabase.',
          })
          continue
        }
        errores.push({ propuesta_id: propuesta.id, error: reabrirError.message })
        continue
      }

      const { error: rpcError } = await supabase.rpc('cambiar_estado_propuesta', {
        p_propuesta_id: propuesta.id,
        p_estado_nuevo: 'habilitada',
        p_usuario_id: user?.id ?? null,
        p_observacion: observaciones || null,
        p_metadata: {
          origen: 'recalculo_umbral_validacion_legal',
          umbral: UMBRAL_APTO_CON_OBS,
          porcentaje: pct,
        },
      })

      if (rpcError) {
        errores.push({ propuesta_id: propuesta.id, error: rpcError.message })
        continue
      }

      promovidas++
    }

    return NextResponse.json({
      success: true,
      umbral: UMBRAL_APTO_CON_OBS,
      total_no_apto: (propuestas ?? []).length,
      evaluadas,
      promovidas,
      omitidas_sin_checklist: omitidasSinChecklist,
      errores,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : JSON.stringify(error)
    return NextResponse.json({ error: 'Error al recalcular validación legal', detail }, { status: 500 })
  }
}

