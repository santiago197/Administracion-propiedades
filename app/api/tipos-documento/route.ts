import { NextResponse, type NextRequest } from 'next/server'
import { getTiposDocumento } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { data, error } = await getTiposDocumento()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching tipos-documento:', error)
    return NextResponse.json({ error: 'Error al obtener tipos de documento' }, { status: 500 })
  }
}
