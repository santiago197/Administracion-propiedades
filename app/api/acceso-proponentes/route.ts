import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { obtenerAccesosPorProceso } from '@/lib/supabase/queries'

export async function GET(request: NextRequest) {
  try {
    const { authorized } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const procesoId = request.nextUrl.searchParams.get('proceso_id')
    if (!procesoId) {
      return NextResponse.json({ error: 'proceso_id es requerido' }, { status: 400 })
    }

    const { data, error } = await obtenerAccesosPorProceso(procesoId)

    if (error) {
      console.error('[acceso-proponentes GET]', error)
      return NextResponse.json({ error: 'Error al obtener accesos' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('[acceso-proponentes GET] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
