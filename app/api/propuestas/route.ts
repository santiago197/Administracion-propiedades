import { NextResponse, type NextRequest } from 'next/server'
import { createPropuesta, getPropuestas } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

// ---------------------------------------------------------------------------
// GET /api/propuestas?proceso_id=<uuid>
// Lista todas las propuestas de un proceso
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { searchParams } = new URL(request.url)
  const proceso_id = searchParams.get('proceso_id')

  if (!proceso_id) {
    return NextResponse.json(
      { error: 'El parámetro proceso_id es requerido' },
      { status: 400 }
    )
  }

  const { data, error } = await getPropuestas(proceso_id)

  if (error) {
    console.error('[propuestas] GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener propuestas', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data ?? [])
}

// ---------------------------------------------------------------------------
// POST /api/propuestas
// Crea una nueva propuesta. Valida campos requeridos antes de llamar a Supabase.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  // --- Validación de campos requeridos ---
  const requiredFields: Array<keyof typeof body> = [
    'proceso_id',
    'tipo_persona',
    'razon_social',
    'nit_cedula',
  ]
  const missing = requiredFields.filter((f) => !body[f])
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Campos requeridos faltantes: ${missing.join(', ')}` },
      { status: 400 }
    )
  }

  // --- Validación de enumerados ---
  if (!['juridica', 'natural'].includes(body.tipo_persona as string)) {
    return NextResponse.json(
      { error: 'tipo_persona debe ser "juridica" o "natural"' },
      { status: 400 }
    )
  }

  // --- Sanitización: extraer solo los campos permitidos ---
  const payload = {
    proceso_id: String(body.proceso_id),
    tipo_persona: body.tipo_persona as 'juridica' | 'natural',
    razon_social: String(body.razon_social).trim(),
    nit_cedula: String(body.nit_cedula).trim(),
    representante_legal: body.representante_legal
      ? String(body.representante_legal).trim()
      : null,
    anios_experiencia: Number(body.anios_experiencia ?? 0),
    unidades_administradas: Number(body.unidades_administradas ?? 0),
    telefono: body.telefono ? String(body.telefono).trim() : null,
    email: body.email ? String(body.email).trim().toLowerCase() : null,
    direccion: body.direccion ? String(body.direccion).trim() : null,
    valor_honorarios:
      body.valor_honorarios != null && body.valor_honorarios !== ''
        ? Number(body.valor_honorarios)
        : null,
    observaciones: body.observaciones ? String(body.observaciones).trim() : null,
  }

  const { data, error } = await createPropuesta(payload)

  if (error) {
    console.error('[propuestas] POST error:', error)
    // Devolver el mensaje real de Supabase (constraint violations, etc.)
    return NextResponse.json(
      { error: 'Error al crear propuesta', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}
