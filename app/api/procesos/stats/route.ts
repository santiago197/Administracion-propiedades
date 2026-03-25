import { NextResponse, type NextRequest } from 'next/server'
import { getProcesoStats } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const proceso_id = searchParams.get('proceso_id')

    if (!proceso_id) {
      return NextResponse.json({ error: 'proceso_id es requerido' }, { status: 400 })
    }

    const data = await getProcesoStats(proceso_id)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching proceso stats:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
