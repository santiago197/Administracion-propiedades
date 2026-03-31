import { NextResponse, type NextRequest } from 'next/server'
import {
  createDocumento,
  deleteDocumento,
  getDocumentoConjunto,
  getDocumentos,
  getDocumentosFaltantes,
  getPropuestaConjunto,
  updateDocumento,
  validarDocumentacionObligatoria,
} from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createClient } from '@/lib/supabase/server'
import type { Documento } from '@/lib/types'

const ESTADOS_AUTO_EVALUACION = [
  'registro',
  'en_revision',
  'incompleto',
  'en_subsanacion',
  'en_validacion',
  'habilitada',
] as const

async function intentarPasarAEvaluacion(
  propuesta_id: string,
  estadoActual: string,
  userId?: string | null
) {
  const { faltantes, cubiertos } = await getDocumentosFaltantes(propuesta_id)
  const totalTipos = faltantes.length + cubiertos.length
  if (totalTipos === 0 || faltantes.length > 0) return

  if (!ESTADOS_AUTO_EVALUACION.includes(estadoActual as (typeof ESTADOS_AUTO_EVALUACION)[number])) return

  const supabase = await createClient()
  const { error } = await supabase.rpc('cambiar_estado_propuesta', {
    p_propuesta_id: propuesta_id,
    p_estado_nuevo: 'en_evaluacion',
    p_usuario_id: userId ?? null,
    p_observacion: 'Documentación completa',
    p_metadata: { origen: 'documentos' },
  })

  if (error && !String(error.message ?? '').includes('INVALID_TRANSITION')) {
    console.warn('[documentos] Error transitioning propuesta to en_evaluacion:', error)
  }
}

export async function GET(request: NextRequest) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError
  try {
    const { searchParams } = new URL(request.url)
    const propuesta_id = searchParams.get('propuesta_id')

    if (!propuesta_id) {
      return NextResponse.json(
        { error: 'propuesta_id es requerido' },
        { status: 400 }
      )
    }

    const { data: propuesta, error: accesoError } = await getPropuestaConjunto(propuesta_id, conjuntoId!)
    if (accesoError || !propuesta) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
    }

    const { data, error } = await getDocumentos(propuesta_id)
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('[v0] Error fetching documentos:', error)
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response: authError, conjuntoId, user } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()
    const required = ['propuesta_id', 'tipo', 'nombre']
    const missing = required.filter((f) => !body?.[f])
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Campos requeridos faltantes: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const { data: propuesta, error: accesoError } = await getPropuestaConjunto(
      String(body.propuesta_id),
      conjuntoId!
    )
    if (accesoError || !propuesta) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
    }

    const payload: Omit<Documento, 'id' | 'created_at' | 'updated_at'> = {
      propuesta_id: String(body.propuesta_id),
      tipo_documento_id: body.tipo_documento_id ? String(body.tipo_documento_id) : null,
      tipo: String(body.tipo),
      nombre: String(body.nombre),
      archivo_url: body.archivo_url ?? null,
      archivo_pathname: body.archivo_pathname ?? null,
      es_obligatorio: Boolean(body.es_obligatorio),
      estado: (body.estado as string) ?? 'pendiente',
      fecha_vencimiento: body.fecha_vencimiento ?? null,
      observaciones: body.observaciones ?? null,
    }

    const { data, error } = await createDocumento(payload)
    if (error) throw error

    const docCheck = await validarDocumentacionObligatoria(payload.propuesta_id).catch(() => null)
    await intentarPasarAEvaluacion(payload.propuesta_id, propuesta.estado, user?.id)

    return NextResponse.json(
      docCheck ? { ...data, documentos_completos: docCheck.completa } : data,
      { status: 201 }
    )
  } catch (error) {
    console.error('[v0] Error creating documento (raw):', JSON.stringify(error, null, 2))
    const pgError = error as Record<string, unknown> | null
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : pgError && typeof pgError === 'object' && 'message' in pgError
            ? String(pgError.message)
            : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al crear documento',
        details: message,
        code: pgError?.code ?? null,
        hint: pgError?.hint ?? null,
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const { authorized, response: authError, conjuntoId, user } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()
    const documentoId = body?.id as string | undefined
    if (!documentoId) {
      return NextResponse.json({ error: 'id del documento es requerido' }, { status: 400 })
    }

    const { data: documento, error: accesoError } = await getDocumentoConjunto(documentoId, conjuntoId!)
    if (accesoError || !documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    const updates: Partial<Documento> = {}
    const allowed = [
      'estado',
      'nombre',
      'archivo_url',
      'archivo_pathname',
      'fecha_vencimiento',
      'observaciones',
      'es_obligatorio',
      'tipo',
      'tipo_documento_id',
    ] as const

    allowed.forEach((field) => {
      if (field in body) {
        updates[field] = body[field]
      }
    })

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await updateDocumento(documentoId, updates as any)
    if (error) throw error

    const { data: propuesta } = await getPropuestaConjunto(String(documento.propuesta_id), conjuntoId!)
    if (propuesta) {
      await intentarPasarAEvaluacion(propuesta.id, propuesta.estado, user?.id)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error updating documento:', error)
    return NextResponse.json({ error: 'Error al actualizar documento' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || null
    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const { data: documento, error: accesoError } = await getDocumentoConjunto(id, conjuntoId!)
    if (accesoError || !documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    const { error } = await deleteDocumento(id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error deleting documento:', error)
    return NextResponse.json({ error: 'Error al eliminar documento' }, { status: 500 })
  }
}
