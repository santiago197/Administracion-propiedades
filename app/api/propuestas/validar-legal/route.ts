import { NextResponse, type NextRequest } from 'next/server'
import { procesarValidacionLegal, getPropuestaConjunto } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { getRequestMeta } from '@/lib/supabase/audit'
import type { EstadoPropuesta, ChecklistLegal, DefinicionItemChecklist, ValidacionLegalItemConfig } from '@/lib/types/index'
import { ITEMS_VALIDACION_LEGAL } from '@/lib/types/index'

// Estados donde se puede cambiar entre habilitada ↔ no_apto_legal
const ESTADOS_REVALIDABLES: EstadoPropuesta[] = ['habilitada', 'no_apto_legal']

// Estados post-validación donde solo se actualizan los campos legales (sin cambio de estado)
const ESTADOS_SOLO_ACTUALIZAR: EstadoPropuesta[] = [
  'en_evaluacion', 'condicionado', 'apto', 'destacado', 'no_apto', 'adjudicado',
]
const ESTADOS_PREVALIDACION: EstadoPropuesta[] = ['en_revision', 'en_subsanacion']

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

/**
 * Dado un checklist completo, calcula si la propuesta cumple o no.
 * Un ítem crítico en 'no_cumple' = no aprueba.
 * Todos los críticos en 'cumple' = aprueba (importants/condicionantes no bloquean).
 */
function calcularCumpleDesdeChecklist(
  checklist: ChecklistLegal,
  tipoPersona: 'juridica' | 'natural',
  items: DefinicionItemChecklist[]
): boolean {
  const itemsCriticos = items.filter(
    (def: DefinicionItemChecklist) =>
      def.criticidad === 'critico' &&
      def.obligatorio !== false &&
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

    // Calcular cumple y observaciones desde el checklist si viene, si no usar los manuales
    const tipoPersona = propuesta.tipo_persona as 'juridica' | 'natural'
    const cumple: boolean = checklist
      ? calcularCumpleDesdeChecklist(checklist as ChecklistLegal, tipoPersona, definiciones)
      : (cumpleManual ?? false)
    const observaciones: string = checklist
      ? consolidarObservaciones(checklist as ChecklistLegal, tipoPersona, definiciones)
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
          p_usuario_id: user?.id ?? null,
          p_observacion: observaciones || null,
          p_metadata: { origen: 're_validacion_legal', cumple_requisitos: cumple },
        })
        if (rpcErr) throw rpcErr
      }

      return NextResponse.json({ success: true, estado: estadoObjetivo }, { status: 200 })
    }

    if (estadoActual === 'registro' || estadoActual === 'incompleto') {
      return NextResponse.json(
        { error: 'La propuesta aún no está lista para validación legal' },
        { status: 409 }
      )
    }

    if (ESTADOS_PREVALIDACION.includes(estadoActual)) {
      const { error: toValidacionErr } = await supabase.rpc('cambiar_estado_propuesta', {
        p_propuesta_id: propuesta_id,
        p_estado_nuevo: 'en_validacion',
        p_usuario_id: user?.id ?? null,
        p_observacion: null,
        p_metadata: { origen: 'validar_legal_pretransicion' },
      })
      if (toValidacionErr) throw toValidacionErr
    }

    // Caso 3: Flujo normal (en_validacion) — transición por máquina de estados
    await ejecutarUpdate()
    const { success, estado } = await procesarValidacionLegal(propuesta_id, cumple, observaciones)

    // Registrar quién realizó la validación legal
    const { ip, userAgent } = getRequestMeta(request)
    await supabase.from('audit_log').insert({
      accion: cumple ? 'VALIDACION_LEGAL_APROBADA' : 'VALIDACION_LEGAL_RECHAZADA',
      entidad: 'propuestas',
      entidad_id: propuesta_id,
      conjunto_id: conjuntoId,
      datos_nuevos: {
        usuario_id: user?.id ?? null,
        cumple_requisitos: cumple,
        observaciones: observaciones || null,
      },
      ip_address: ip,
      user_agent: userAgent,
    }).then(({ error: auditErr }) => {
      if (auditErr) console.warn('[validar-legal] Error inserting audit_log:', auditErr)
    })

    return NextResponse.json({ success, estado }, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[validar-legal] Error processing legal validation:', msg)
    return NextResponse.json({ error: 'Error al procesar validación', detail: msg }, { status: 500 })
  }
}
