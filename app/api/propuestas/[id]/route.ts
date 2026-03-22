import { NextResponse, type NextRequest } from 'next/server'
import { getPropuesta, updatePropuesta } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

type RouteContext = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// GET /api/propuestas/[id]
// Obtiene una propuesta por su UUID
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

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
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  // Campos que el admin puede editar libremente
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

  // Estado se maneja por separado con validación de enumerado
  const ALLOWED_ESTADOS = ['activa', 'descalificada', 'retirada'] as const
  type EstadoPropuesta = (typeof ALLOWED_ESTADOS)[number]

  // Construir objeto de actualización con solo campos permitidos
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

  // Validar estado si viene en el body
  if ('estado' in body) {
    if (!ALLOWED_ESTADOS.includes(body.estado as EstadoPropuesta)) {
      return NextResponse.json(
        {
          error: `Estado inválido. Valores permitidos: ${ALLOWED_ESTADOS.join(', ')}`,
        },
        { status: 400 }
      )
    }
    updates.estado = body.estado
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
// Soft-delete: cambia estado a 'retirada'. No borra el registro.
// Esto preserva integridad referencial con evaluaciones y votos existentes.
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  // Verificar que exista antes de retirar
  const { data: existing, error: fetchError } = await getPropuesta(id)
  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
  }

  if (existing.estado === 'retirada') {
    return NextResponse.json(
      { error: 'La propuesta ya está retirada' },
      { status: 409 }
    )
  }

  const { data, error } = await updatePropuesta(id, { estado: 'retirada' })

  if (error) {
    console.error('[propuestas] DELETE error:', error)
    return NextResponse.json(
      { error: 'Error al retirar propuesta', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
