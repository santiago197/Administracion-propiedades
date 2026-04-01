/**
 * API pública: Genera URL pre-firmada para subir un documento directamente a Supabase Storage.
 * POST /api/proponente/upload-url
 *
 * Body: { codigo, nombre, tipo_mime }
 *
 * El cliente sube el archivo directamente a la URL retornada (PUT) sin pasar por Vercel,
 * evitando el límite de 4.5 MB de las funciones serverless.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validarCodigoProponente } from '@/lib/supabase/queries'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png',
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codigo, nombre, tipo_mime, tamanio } = body

    if (!codigo || !nombre || !tipo_mime) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: codigo, nombre, tipo_mime' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(tipo_mime)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Use PDF, DOC, DOCX, JPG o PNG.' },
        { status: 400 }
      )
    }

    if (tamanio && tamanio > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'El archivo supera el tamaño máximo de 50 MB.' },
        { status: 400 }
      )
    }

    // Validar código de acceso
    const { data: acceso, error: validarError } = await validarCodigoProponente(codigo)
    if (validarError || !acceso) {
      return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 403 })
    }

    const propuestaId = acceso.propuesta_id
    const timestamp = Date.now()
    const safeNombre = nombre.replace(/[^\w.\-]/g, '_')
    const path = `proponentes/${propuestaId}/${timestamp}-${safeNombre}`

    // Generar URL pre-firmada de subida (válida 60 minutos)
    const adminClient = createAdminClient()
    const { data: signedData, error: signedError } = await adminClient.storage
      .from('documentos')
      .createSignedUploadUrl(path)

    if (signedError || !signedData) {
      console.error('[proponente/upload-url]', signedError)
      return NextResponse.json({ error: 'No se pudo generar URL de subida' }, { status: 500 })
    }

    // URL pública que se guardará en BD una vez completada la subida
    const { data: publicUrlData } = adminClient.storage
      .from('documentos')
      .getPublicUrl(path)

    return NextResponse.json({
      signed_url: signedData.signedUrl,
      token: signedData.token,
      path,
      public_url: publicUrlData.publicUrl,
    })
  } catch (error) {
    console.error('[proponente/upload-url] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
