import { NextResponse, type NextRequest } from 'next/server'
<<<<<<< HEAD
import { createPropuesta, getPropuestas, contarPropuestasActivas } from '@/lib/supabase/queries'
=======
import { createPropuesta, getPropuestas, getProcesoConjunto, contarPropuestasTotales, existePropuestaPorDocumento } from '@/lib/supabase/queries'
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const proceso_id = searchParams.get('proceso_id')

    if (!proceso_id) {
      return NextResponse.json(
        { error: 'proceso_id es requerido' },
        { status: 400 }
      )
    }

    const { data, error } = await getPropuestas(proceso_id)
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching propuestas:', error)
    return NextResponse.json({ error: 'Error al obtener propuestas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()
    const { data, error } = await createPropuesta(body)
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating propuesta:', error)
    return NextResponse.json({ error: 'Error al crear propuesta' }, { status: 500 })
  }
<<<<<<< HEAD
=======

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

  const { data: proceso, error: procesoError } = await getProcesoConjunto(payload.proceso_id, conjuntoId!)
  if (procesoError || !proceso) {
    return NextResponse.json(
      { error: 'Proceso no pertenece al conjunto del usuario' },
      { status: 403 }
    )
  }

  // --- Validación: documento único por proceso ---
  const { existe, error: dupError } = await existePropuestaPorDocumento(payload.proceso_id, payload.nit_cedula)
  if (dupError) {
    console.error('[propuestas] POST duplicado check error:', dupError)
    return NextResponse.json({ error: 'Error al verificar duplicados' }, { status: 500 })
  }
  if (existe) {
    return NextResponse.json(
      { error: `Ya existe una propuesta registrada con el número de documento ${payload.nit_cedula} para este proceso.` },
      { status: 409 }
    )
  }

  const { data, error } = await createPropuesta(payload)

  if (error) {
    console.error('[propuestas] POST error:', error)
    const message = error.message || ''

    let detail = message
    if (message.includes('propuestas_estado_check')) {
      detail =
        'Error de configuración en los estados de la propuesta. Ejecuta el script scripts/003_state_machine.sql en Supabase para actualizar el constraint propuestas_estado_check.'
    }

    return NextResponse.json(
      { error: 'Error al crear propuesta', detail },
      { status: 500 }
    )
  }

  // Validación de mínimo 3 propuestas (Ley 675): informar pero no bloquear la creación
  const total = await contarPropuestasTotales(payload.proceso_id)
  const warning = total < 3 ? 'El proceso requiere mínimo 3 propuestas para avanzar' : null

  return NextResponse.json(warning ? { ...data, warning } : data, { status: 201 })
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
}
