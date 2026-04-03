import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'

import { requireAuth } from '@/lib/supabase/auth-utils'
import { getContrato } from '@/lib/supabase/queries'

/**
 * GET: Servir archivo de contrato (private blob)
 * 
 * Los archivos de contrato se almacenan en Vercel Blob con acceso privado.
 * Esta ruta verifica la autenticación y autorización antes de servir el archivo.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authorized) return auth.response!

  try {
    const pathname = request.nextUrl.searchParams.get('pathname')

    if (!pathname) {
      return NextResponse.json({ error: 'Pathname requerido' }, { status: 400 })
    }

    // Verificar que el pathname pertenece a un contrato del conjunto del usuario
    // El pathname tiene formato: contratos/{conjunto_id}/{timestamp}-{filename}
    const pathParts = pathname.split('/')
    if (pathParts.length < 2 || pathParts[0] !== 'contratos') {
      return NextResponse.json({ error: 'Ruta invalida' }, { status: 400 })
    }

    const conjuntoIdFromPath = pathParts[1]
    if (conjuntoIdFromPath !== auth.conjuntoId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return new NextResponse('Archivo no encontrado', { status: 404 })
    }

    // Blob no ha cambiado - usar cache del navegador
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'Content-Disposition': `inline; filename="${pathname.split('/').pop()}"`,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('[v0] Error sirviendo archivo de contrato:', error)
    return NextResponse.json({ error: 'Error al servir archivo' }, { status: 500 })
  }
}
