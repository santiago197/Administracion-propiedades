import { NextResponse, type NextRequest } from 'next/server'
<<<<<<< HEAD
import { getDocumentos, createDocumento } from '@/lib/supabase/queries'
=======
import {
  createDocumento,
  deleteDocumento,
  getDocumentoConjunto,
  getDocumentos,
  getPropuestaConjunto,
  updateDocumento,
  validarDocumentacionObligatoria,
} from '@/lib/supabase/queries'
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
<<<<<<< HEAD
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
=======
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
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

<<<<<<< HEAD
    const { data, error } = await getDocumentos(propuesta_id)
    if (error) throw error
    return NextResponse.json(data)
=======
    const { data: propuesta, error: accesoError } = await getPropuestaConjunto(propuesta_id, conjuntoId!)
    if (accesoError || !propuesta) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
    }

    const { data, error } = await getDocumentos(propuesta_id)
    if (error) throw error

    return NextResponse.json(data ?? [])
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
  } catch (error) {
    console.error('[v0] Error fetching documentos:', error)
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
  }
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
<<<<<<< HEAD
    const { data, error } = await createDocumento(body)
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
=======
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

    return NextResponse.json(
      docCheck ? { ...data, documentos_completos: docCheck.completa } : data,
      { status: 201 }
    )
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
  } catch (error) {
    console.error('[v0] Error creating documento:', error)
    return NextResponse.json({ error: 'Error al crear documento' }, { status: 500 })
  }
}
