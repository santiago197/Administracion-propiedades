import { NextResponse, type NextRequest } from 'next/server'
import { procesarValidacionLegal, getPropuestaConjunto } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createClient } from '@/lib/supabase/server'
import type { EstadoPropuesta, ChecklistLegal, DefinicionItemChecklist } from '@/lib/types/index'
import { ITEMS_VALIDACION_LEGAL } from '@/lib/types/index'

// Estados que permiten re-validación directa por la máquina de estados
const ESTADOS_REVALIDABLES: EstadoPropuesta[] = ['habilitada', 'no_apto_legal']

/**
 * Dado un checklist completo, calcula si la propuesta cumple o no.
 * Un ítem crítico en 'no_cumple' = no aprueba.
 * Todos los críticos en 'cumple' = aprueba (importants/condicionantes no bloquean).
 */
function calcularCumpleDesdeChecklist(
  checklist: ChecklistLegal,
  tipoPersona: 'juridica' | 'natural'
): boolean {
  const itemsCriticos = ITEMS_VALIDACION_LEGAL.filter(
    (def: DefinicionItemChecklist) =>
      def.criticidad === 'critico' &&
      (def.aplica_a === 'ambos' || def.aplica_a === tipoPersona)
  )

  return itemsCriticos.every((def) => {
    const item = checklist[def.id]
    return item?.estado === 'cumple'
  })
}

/**
 * Consolida las observaciones de ítems con no_cumple en un string legible.
 */
function consolidarObservaciones(
  checklist: ChecklistLegal,
  tipoPersona: 'juridica' | 'natural'
): string {
  const itemsConProblema = ITEMS_VALIDACION_LEGAL.filter((def) => {
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
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()
    const { propuesta_id, checklist, cumple: cumpleManual, observaciones: obsManual } = body

    if (!propuesta_id) {
      return NextResponse.json({ error: 'propuesta_id es requerido' }, { status: 400 })
    }

    const { data: propuesta, error: accesoError } = await getPropuestaConjunto(propuesta_id, conjuntoId!)
    if (accesoError || !propuesta) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
    }

    const supabase = await createClient()

    // Calcular cumple y observaciones desde el checklist si viene, si no usar los manuales
    const tipoPersona = propuesta.tipo_persona as 'juridica' | 'natural'
    const cumple: boolean = checklist
      ? calcularCumpleDesdeChecklist(checklist as ChecklistLegal, tipoPersona)
      : (cumpleManual ?? false)
    const observaciones: string = checklist
      ? consolidarObservaciones(checklist as ChecklistLegal, tipoPersona)
      : (obsManual ?? '')

    const camposLegales = {
      cumple_requisitos_legales: cumple,
      observaciones_legales: observaciones || null,
      checklist_legal: checklist ?? null,
    }

    // Si la propuesta ya tiene una decisión legal, actualizar directamente
    if (ESTADOS_REVALIDABLES.includes(propuesta.estado as EstadoPropuesta)) {
      const { error: updateErr } = await supabase.from('propuestas').update(camposLegales).eq('id', propuesta_id)
      if (updateErr) throw updateErr

      const estadoActual = propuesta.estado as EstadoPropuesta
      const estadoObjetivo: EstadoPropuesta = cumple ? 'habilitada' : 'no_apto_legal'

      if (estadoActual !== estadoObjetivo) {
        const { error: rpcErr } = await supabase.rpc('cambiar_estado_propuesta', {
          p_propuesta_id: propuesta_id,
          p_estado_nuevo: estadoObjetivo,
          p_usuario_id: null,
          p_observacion: observaciones || null,
          p_metadata: { origen: 're_validacion_legal', cumple_requisitos: cumple },
        })
        if (rpcErr) throw rpcErr
      }

      return NextResponse.json({ success: true, estado: estadoObjetivo }, { status: 200 })
    }

    // Flujo normal: propuesta en revisión — actualizar campos antes de cambiar estado
    const { error: updateErr } = await supabase.from('propuestas').update(camposLegales).eq('id', propuesta_id)
    if (updateErr) throw updateErr

    const { success, estado } = await procesarValidacionLegal(propuesta_id, cumple, observaciones)
    return NextResponse.json({ success, estado }, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[validar-legal] Error processing legal validation:', msg)
    return NextResponse.json({ error: 'Error al procesar validación', detail: msg }, { status: 500 })
  }
}
