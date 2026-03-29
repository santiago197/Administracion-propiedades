import { NextResponse, type NextRequest } from 'next/server'
import { getUsuarios } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const usuarios = await getUsuarios(conjuntoId)
    return NextResponse.json(usuarios)
  } catch (error) {
    console.error('[usuarios] GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuarios', detail: (error as Error).message },
      { status: 500 }
    )
  }
}
