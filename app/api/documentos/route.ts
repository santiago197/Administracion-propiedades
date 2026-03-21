import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized) return authError
  try {
    const { searchParams } = new URL(request.url)
    const propuesta_id = searchParams.get('propuesta_id')

    if (!propuesta_id) {
      return NextResponse.json(
        { error: 'propuesta_id es requerido' },
        { status: 400 }
      )
    }

    // TODO: Implementar getDocumentos en queries
    return NextResponse.json([])
  } catch (error) {
    console.error('[v0] Error fetching documentos:', error)
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized) return authError

  try {
    const body = await request.json()
    // TODO: Implementar createDocumento en queries
    return NextResponse.json(body, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating documento:', error)
    return NextResponse.json({ error: 'Error al crear documento' }, { status: 500 })
  }
}
