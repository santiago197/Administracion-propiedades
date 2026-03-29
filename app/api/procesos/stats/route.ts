import { NextResponse, type NextRequest } from 'next/server'
import { getProcesoConjunto, getProcesoStats } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const proceso_id = searchParams.get('proceso_id')

    if (!proceso_id) {
      return NextResponse.json({ error: 'proceso_id es requerido' }, { status: 400 })
    }

    const { data: proceso, error: procesoError } = await getProcesoConjunto(proceso_id, conjuntoId!)
    if (procesoError || !proceso) {
      return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
    }

    const data = await getProcesoStats(proceso.id)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching proceso stats:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
