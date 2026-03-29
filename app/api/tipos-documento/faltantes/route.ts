import { NextResponse, type NextRequest } from 'next/server'
import { getDocumentosFaltantes } from '@/lib/supabase/queries'
import { getCurrentUser } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  const { user, error } = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: error ?? 'No autorizado' }, { status: 401 })

  const propuesta_id = request.nextUrl.searchParams.get('propuesta_id')
  if (!propuesta_id) {
    return NextResponse.json({ error: 'Se requiere propuesta_id' }, { status: 400 })
  }

  try {
    const result = await getDocumentosFaltantes(propuesta_id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[tipos-documento/faltantes] GET error:', err)
    return NextResponse.json({ error: 'Error al obtener documentos faltantes' }, { status: 500 })
  }
}
