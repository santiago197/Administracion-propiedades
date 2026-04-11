import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clearConsejeroSessionCookie, getConsejeroSessionFromRequest } from '@/lib/consejero-session'

export async function GET(request: NextRequest) {
  const session = getConsejeroSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesión de consejero no válida o expirada' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    const { data: consejero, error: consejeroError } = await supabase
      .from('consejeros')
      .select('id, conjunto_id, nombre_completo, cargo, torre, apartamento, email, telefono, activo, puede_votar')
      .eq('id', session.consejeroId)
      .eq('activo', true)
      .single()

    if (consejeroError || !consejero) {
      const response = NextResponse.json({ error: 'Consejero no encontrado o inactivo' }, { status: 403 })
      clearConsejeroSessionCookie(response)
      return response
    }

    // Buscar proceso activo del conjunto: primero por session.procesoId si existe,
    // si no, buscar dinámicamente por conjunto (resuelve sesiones creadas antes de activar el proceso)
    let proceso: { id: string; conjunto_id: string; nombre: string; estado: string } | null = null

    if (session.procesoId) {
      const { data } = await supabase
        .from('procesos')
        .select('id, conjunto_id, nombre, estado')
        .eq('id', session.procesoId)
        .eq('conjunto_id', consejero.conjunto_id)
        .single()
      proceso = data ?? null
    }

    if (!proceso) {
      // Buscar el proceso activo o finalizado más reciente del conjunto
      const { data } = await supabase
        .from('procesos')
        .select('id, conjunto_id, nombre, estado')
        .eq('conjunto_id', consejero.conjunto_id)
        .in('estado', ['evaluacion', 'votacion', 'finalizado'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      proceso = data ?? null
    }

    if (!proceso) {
      return NextResponse.json({
        consejero,
        proceso: null,
        progreso: {
          total_propuestas: 0,
          evaluadas: 0,
          voto_registrado: false,
        },
        mensaje: 'No hay un proceso de evaluación activo para este conjunto en este momento.',
      })
    }

    const [{ count: propuestasPendientes }, { data: evaluaciones }, { data: voto }] = await Promise.all([
      supabase
        .from('propuestas')
        .select('*', { count: 'exact', head: true })
        .eq('proceso_id', proceso.id)
        .in('estado', ['en_evaluacion', 'apto', 'condicionado', 'destacado', 'no_apto', 'entrevistado', 'preseleccionado']),
      supabase
        .from('evaluaciones')
        .select('propuesta_id')
        .eq('proceso_id', proceso.id)
        .eq('consejero_id', consejero.id),
      supabase
        .from('votos')
        .select('id, created_at')
        .eq('proceso_id', proceso.id)
        .eq('consejero_id', consejero.id)
        .maybeSingle(),
    ])

    const propuestasEvaluadas = evaluaciones ? new Set(evaluaciones.map((row) => row.propuesta_id)).size : 0

    // Cargar propuestas y documentos del proceso para el dashboard de consejeros
    const { data: propuestas } = await supabase
      .from('propuestas')
      .select(
        'id, razon_social, tipo_persona, nit_cedula, representante_legal, anios_experiencia, unidades_administradas, telefono, email, direccion, valor_honorarios, estado, cumple_requisitos_legales, observaciones_legales, puntaje_evaluacion, votos_recibidos, puntaje_final'
      )
      .eq('proceso_id', proceso.id)

    let documentos: {
      id: string
      propuesta_id: string
      tipo: string
      nombre: string
      estado: string
      es_obligatorio: boolean
      fecha_vencimiento: string | null
      archivo_url: string | null
    }[] = []

    if (propuestas && propuestas.length > 0) {
      const { data: docs } = await supabase
        .from('documentos')
        .select('id, propuesta_id, tipo, nombre, estado, es_obligatorio, fecha_vencimiento, archivo_url')
        .in('propuesta_id', propuestas.map((p) => p.id))

      documentos = docs ?? []
    }

    // Observación de preselección por entrevista
    const idsPresel = (propuestas ?? []).filter((p) => p.estado === 'preseleccionado' || p.estado === 'entrevistado').map((p) => p.id)
    const observacionPreselMap: Record<string, string> = {}
    if (idsPresel.length > 0) {
      const { data: historial } = await supabase
        .from('historial_estados_propuesta')
        .select('propuesta_id, observacion, created_at')
        .in('propuesta_id', idsPresel)
        .in('estado_nuevo', ['preseleccionado', 'entrevistado'])
        .order('created_at', { ascending: false })
      for (const h of historial ?? []) {
        if (!observacionPreselMap[h.propuesta_id] && h.observacion) {
          observacionPreselMap[h.propuesta_id] = h.observacion
        }
      }
    }

    // Preseleccionados primero, luego entrevistados, luego alfabético
    const ORDEN_ESTADO: Record<string, number> = { preseleccionado: 0, entrevistado: 1 }
    const propuestasSorted = (propuestas ?? []).slice().sort((a, b) => {
      const aP = ORDEN_ESTADO[a.estado] ?? 2
      const bP = ORDEN_ESTADO[b.estado] ?? 2
      if (aP !== bP) return aP - bP
      return a.razon_social.localeCompare(b.razon_social, 'es')
    })

    return NextResponse.json({
      consejero,
      proceso,
      progreso: {
        total_propuestas: propuestasPendientes ?? 0,
        evaluadas: propuestasEvaluadas,
        voto_registrado: Boolean(voto),
      },
      propuestas: propuestasSorted.map((p) => ({
        ...p,
        observacion_entrevista: observacionPreselMap[p.id] ?? null,
      })),
      documentos,
    })
  } catch (error) {
    console.error('[consejero/perfil] error:', error)
    return NextResponse.json({ error: 'Error al consultar perfil de consejero' }, { status: 500 })
  }
}
