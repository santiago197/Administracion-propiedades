import { NextResponse, type NextRequest } from 'next/server'
import {
  cambiarEstadoPropuesta,
  getHistorialEstados,
  getTransicionesDisponibles,
  getPropuesta,
  getPropuestaConjunto,
  validarDocumentacionObligatoria,
} from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import type { EstadoPropuesta } from '@/lib/types/index'

type RouteContext = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// Conjunto completo de estados válidos (debe coincidir con el CHECK de la DB)
// ---------------------------------------------------------------------------
const ESTADOS_VALIDOS: EstadoPropuesta[] = [
  'registro', 'en_revision', 'incompleto', 'en_subsanacion',
  'en_validacion', 'no_apto_legal', 'habilitada', 'en_evaluacion',
  'condicionado', 'apto', 'destacado', 'no_apto',
  'entrevistado', 'preseleccionado',
  'adjudicado', 'descalificada', 'retirada',
]

// ---------------------------------------------------------------------------
// Mapa para convertir errores de Postgres en códigos HTTP semánticos.
// Los prefijos están definidos en la función cambiar_estado_propuesta (SQL).
// ---------------------------------------------------------------------------
function httpStatusFromPgError(message: string): number {
  if (message.includes('PROPUESTA_NOT_FOUND'))  return 404
  if (message.includes('INVALID_TRANSITION'))   return 422
  if (message.includes('OBSERVACION_REQUERIDA')) return 400
  return 500
}

// ---------------------------------------------------------------------------
// GET /api/propuestas/[id]/estado
//
// Devuelve:
//   - estado actual de la propuesta
//   - transiciones disponibles desde ese estado
//   - historial completo de cambios de estado
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  const { data: pertenece, error: accesoError } = await getPropuestaConjunto(id, conjuntoId!)
  if (accesoError || !pertenece) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
  }

  // Obtener propuesta y su estado actual
  const { data: propuesta, error: propError } = await getPropuesta(id)
  if (propError || !propuesta) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
  }

  // Obtener transiciones disponibles desde el estado actual
  const { data: transiciones, error: transError } = await getTransicionesDisponibles(
    propuesta.estado as EstadoPropuesta
  )
  if (transError) {
    console.error('[estado] GET transiciones error:', transError)
  }

  // Obtener historial completo
  const { data: historial, error: histError } = await getHistorialEstados(id)
  if (histError) {
    console.error('[estado] GET historial error:', histError)
  }

  return NextResponse.json({
    estado_actual:           propuesta.estado,
    transiciones_disponibles: transiciones ?? [],
    historial:               historial ?? [],
  })
}

// ---------------------------------------------------------------------------
// PATCH /api/propuestas/[id]/estado
//
// Body esperado:
//   {
//     estado: EstadoPropuesta,      // requerido
//     observacion?: string          // requerido en transiciones que lo exigen
//   }
//
// Respuesta exitosa (200):
//   {
//     success: true,
//     propuesta_id: string,
//     estado_anterior: EstadoPropuesta,
//     estado_nuevo: EstadoPropuesta,
//     razon_social: string
//   }
//
// Errores:
//   400 — campo requerido faltante, observación faltante
//   404 — propuesta no encontrada
//   422 — transición no permitida por el flujo
//   500 — error interno
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { authorized, response: authError, user, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  const { data: pertenece, error: accesoError } = await getPropuestaConjunto(id, conjuntoId!)
  if (accesoError || !pertenece) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
  }

  // Parsear body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const { estado, observacion } = body

  // Validar presencia del campo estado
  if (!estado) {
    return NextResponse.json(
      { error: 'El campo "estado" es requerido' },
      { status: 400 }
    )
  }

  // Validar que el valor sea un estado conocido antes de llamar a la DB
  if (!ESTADOS_VALIDOS.includes(estado as EstadoPropuesta)) {
    return NextResponse.json(
      {
        error: `Estado "${estado}" no es válido`,
        estados_validos: ESTADOS_VALIDOS,
      },
      { status: 400 }
    )
  }

  // Bloqueo: antes de pasar a validación legal, todos los docs obligatorios deben estar completos
  if (estado === 'en_validacion') {
    try {
      const { completa, documentos_faltantes } = await validarDocumentacionObligatoria(id)
      if (!completa) {
        return NextResponse.json(
          {
            error: 'DOCUMENTACION_INCOMPLETA',
            mensaje: 'No se puede iniciar la validación legal hasta que todos los documentos obligatorios estén completos.',
            documentos_faltantes,
          },
          { status: 422 }
        )
      }
    } catch {
      return NextResponse.json({ error: 'Error al verificar documentación' }, { status: 500 })
    }
  }

  // Recopilar metadata de contexto para trazabilidad
  const ip_address =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'desconocida'
  const user_agent = request.headers.get('user-agent') ?? 'desconocido'

  const { data, error } = await cambiarEstadoPropuesta(
    id,
    estado as EstadoPropuesta,
    user?.id ?? null,
    observacion ? String(observacion).trim() : null,
    { ip_address, user_agent, usuario_email: user?.email ?? null }
  )

  if (error) {
    const msg    = error.message ?? 'Error al cambiar estado'
    const status = httpStatusFromPgError(msg)

    // Limpiar el prefijo técnico del mensaje antes de devolver al cliente
    const clientMsg = msg
      .replace(/^INVALID_TRANSITION:\s*/,    '')
      .replace(/^PROPUESTA_NOT_FOUND:\s*/,   '')
      .replace(/^OBSERVACION_REQUERIDA:\s*/, '')

    console.error(`[estado] PATCH error (${status}):`, msg)
    return NextResponse.json({ error: clientMsg }, { status })
  }

  return NextResponse.json(data)
}
