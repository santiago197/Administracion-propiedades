import { NextResponse, type NextRequest } from 'next/server'
import { procesarValidacionLegal } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createClient } from '@/lib/supabase/server'
import type { EstadoPropuesta, ChecklistLegal, DefinicionItemChecklist } from '@/lib/types/index'
import { ITEMS_VALIDACION_LEGAL } from '@/lib/types/index'

// Estados donde se puede cambiar entre habilitada ↔ no_apto_legal
const ESTADOS_REVALIDABLES: EstadoPropuesta[] = ['habilitada', 'no_apto_legal']

// Estados post-validación donde solo se actualizan los campos legales (sin cambio de estado)
const ESTADOS_SOLO_ACTUALIZAR: EstadoPropuesta[] = [
  'en_evaluacion', 'condicionado', 'apto', 'destacado', 'no_apto', 'adjudicado',
]

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
<<<<<<< HEAD
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
=======
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
  if (!authorized && authError) return authError

  try {
    const body = await request.json()
    const { propuesta_id, checklist, cumple: cumpleManual, observaciones: obsManual } = body

    if (!propuesta_id) {
      return NextResponse.json({ error: 'propuesta_id es requerido' }, { status: 400 })
    }

<<<<<<< HEAD
    const { success, estado } = await procesarValidacionLegal(propuesta_id, cumple, observaciones)
=======
    const { data: propuesta, error: accesoError } = await getPropuestaConjunto(propuesta_id, conjuntoId!)
    if (accesoError || !propuesta) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
    }

    const supabase = await createClient()
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449

    // Calcular cumple y observaciones desde el checklist si viene, si no usar los manuales
    const tipoPersona = propuesta.tipo_persona as 'juridica' | 'natural'
    const cumple: boolean = checklist
      ? calcularCumpleDesdeChecklist(checklist as ChecklistLegal, tipoPersona)
      : (cumpleManual ?? false)
    const observaciones: string = checklist
      ? consolidarObservaciones(checklist as ChecklistLegal, tipoPersona)
      : (obsManual ?? '')

    // Intentar actualizar con checklist_legal; si falla por columna faltante, reintentar sin él
    async function actualizarCamposLegales(conChecklist: boolean) {
      const campos = conChecklist
        ? { cumple_requisitos_legales: cumple, observaciones_legales: observaciones || null, checklist_legal: checklist ?? null }
        : { cumple_requisitos_legales: cumple, observaciones_legales: observaciones || null }
      return supabase.from('propuestas').update(campos).eq('id', propuesta_id)
    }

    const estadoActual = propuesta.estado as EstadoPropuesta

    // Helper compartido para el update con retry
    async function ejecutarUpdate() {
      let { error } = await actualizarCamposLegales(true)
      if (error?.code === 'PGRST204') {
        const retry = await actualizarCamposLegales(false)
        error = retry.error
      }
      if (error) throw error
    }

    // Caso 1: Estado en evaluación o posterior — solo actualizar campos, sin cambio de estado
    if (ESTADOS_SOLO_ACTUALIZAR.includes(estadoActual)) {
      await ejecutarUpdate()
      return NextResponse.json({ success: true, estado: estadoActual }, { status: 200 })
    }

    // Caso 2: Ya tiene decisión legal (habilitada ↔ no_apto_legal) — actualizar y re-transicionar si cambió
    if (ESTADOS_REVALIDABLES.includes(estadoActual)) {
      await ejecutarUpdate()

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

    // Caso 3: Flujo normal (en_validacion, en_revision, etc.) — transición por máquina de estados
    await ejecutarUpdate()
    const { success, estado } = await procesarValidacionLegal(propuesta_id, cumple, observaciones)
    return NextResponse.json({ success, estado }, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[validar-legal] Error processing legal validation:', msg)
    return NextResponse.json({ error: 'Error al procesar validación', detail: msg }, { status: 500 })
  }
}
