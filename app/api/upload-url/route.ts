/**
 * API admin: Genera URL pre-firmada para subir documentos directamente a Supabase Storage.
 * POST /api/upload-url
 *
 * Body: { nombre, tipo_mime, carpeta? }
 *
 * El cliente sube el archivo directamente a la URL retornada (PUT) evitando
 * el límite de 4.5 MB de las funciones serverless de Vercel.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SIZE = 50 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export async function POST(request: NextRequest) {
  const { authorized, conjuntoId } = await requireAuth(request)
  if (!authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { nombre, tipo_mime, carpeta, tamanio } = body

    if (!nombre || !tipo_mime) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, tipo_mime' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(tipo_mime)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Use PDF, DOC, DOCX, JPG, PNG o WEBP.' },
        { status: 400 }
      )
    }

    if (tamanio && tamanio > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo supera el tamaño máximo de 50 MB.' },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const safeNombre = nombre.replace(/[^\w.\-]/g, '_')
    const folder = carpeta ?? 'documentos'
    const path = `${folder}/${conjuntoId}/${timestamp}-${safeNombre}`

    const adminClient = createAdminClient()
    const { data: signedData, error: signedError } = await adminClient.storage
      .from('documentos')
      .createSignedUploadUrl(path)

    if (signedError || !signedData) {
      console.error('[upload-url]', signedError)
      return NextResponse.json({ error: 'No se pudo generar URL de subida' }, { status: 500 })
    }

    const { data: publicUrlData } = adminClient.storage
      .from('documentos')
      .getPublicUrl(path)

    return NextResponse.json({
      signed_url: signedData.signedUrl,
      path,
      url: publicUrlData.publicUrl,
    })
  } catch (error) {
    console.error('[upload-url] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
