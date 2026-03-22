import { NextResponse, type NextRequest } from 'next/server'
import { getPropuesta, updatePropuesta, cambiarEstadoPropuesta, getPropuestaConjunto } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

type RouteContext = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// GET /api/propuestas/[id]
// Obtiene una propuesta por su UUID
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  const { data: pertenece, error: accesoError } = await getPropuestaConjunto(id, conjuntoId!)
  if (accesoError || !pertenece) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
  }

  const { data, error } = await getPropuesta(id)

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json(
      { error: status === 404 ? 'Propuesta no encontrada' : error.message },
      { status }
    )
  }

  return NextResponse.json(data)
}

// ---------------------------------------------------------------------------
// PATCH /api/propuestas/[id]
// Actualiza campos editables de una propuesta.
// No permite modificar: proceso_id, puntaje_*, votos_recibidos, created_at.
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  const { data: pertenece, error: accesoError } = await getPropuestaConjunto(id, conjuntoId!)
  if (accesoError || !pertenece) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  // Campos editables por el admin (datos del candidato).
  // El campo 'estado' NO está aquí: los cambios de estado deben pasar
  // por PATCH /api/propuestas/[id]/estado para garantizar trazabilidad.
  const EDITABLE_FIELDS = [
    'tipo_persona',
    'razon_social',
    'nit_cedula',
    'representante_legal',
    'anios_experiencia',
    'unidades_administradas',
    'telefono',
    'email',
    'direccion',
    'valor_honorarios',
    'observaciones',
  ] as const

  // Rechazar explícitamente intentos de cambiar estado por esta ruta
  if ('estado' in body) {
    return NextResponse.json(
      {
        error: 'Los cambios de estado deben realizarse a través de PATCH /api/propuestas/:id/estado',
        hint: 'Usa el endpoint dedicado para garantizar validación y trazabilidad completa.',
      },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}

  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      const value = body[field]
      if (field === 'anios_experiencia' || field === 'unidades_administradas') {
        updates[field] = value != null ? Number(value) : 0
      } else if (field === 'valor_honorarios') {
        updates[field] = value != null && value !== '' ? Number(value) : null
      } else if (field === 'tipo_persona') {
        if (!['juridica', 'natural'].includes(value as string)) {
          return NextResponse.json(
            { error: 'tipo_persona debe ser "juridica" o "natural"' },
            { status: 400 }
          )
        }
        updates[field] = value
      } else {
        updates[field] = value ? String(value).trim() || null : null
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No se enviaron campos válidos para actualizar' },
      { status: 400 }
    )
  }

  const { data, error } = await updatePropuesta(id, updates)

  if (error) {
    console.error('[propuestas] PATCH error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar propuesta', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

// ---------------------------------------------------------------------------
// DELETE /api/propuestas/[id]
// Soft-delete vía máquina de estados: transición a 'retirada'.
// Requiere observacion en el body (la transición → retirada lo exige).
// Preserva integridad referencial con evaluaciones y votos existentes.
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { authorized, response: authError, user, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  const { data: pertenece, error: accesoError } = await getPropuestaConjunto(id, conjuntoId!)
  if (accesoError || !pertenece) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
  }

  // Leer observación del body (opcional en DELETE, pero obligatorio en la transición)
  let observacion: string | null = null
  try {
    const body = await request.json().catch(() => ({}))
    observacion = body?.observacion ? String(body.observacion).trim() : null
  } catch {
    // Body vacío es aceptable; la función SQL lanzará error si falta la observación
  }

  const ip_address = request.headers.get('x-forwarded-for') ?? 'desconocida'

  const { data, error } = await cambiarEstadoPropuesta(
    id,
    'retirada',
    user?.id ?? null,
    observacion,
    { ip_address, origen: 'DELETE /api/propuestas/[id]' }
  )

  if (error) {
    const msg = error.message ?? 'Error al retirar propuesta'

    if (msg.includes('PROPUESTA_NOT_FOUND')) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
    }
    if (msg.includes('INVALID_TRANSITION')) {
      // Estado terminal — no se puede retirar (ya retirada, adjudicada, etc.)
      return NextResponse.json(
        { error: msg.replace(/^INVALID_TRANSITION:\s*/, '') },
        { status: 409 }
      )
    }
    if (msg.includes('OBSERVACION_REQUERIDA')) {
      return NextResponse.json(
        { error: 'Se requiere una observación para retirar la propuesta' },
        { status: 400 }
      )
    }

    console.error('[propuestas] DELETE error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json(data)
}
