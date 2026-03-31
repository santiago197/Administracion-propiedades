import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/supabase/auth-utils'

const ACCIONES_LOGIN = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'] as const

export async function GET(request: NextRequest) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const usuarioId = searchParams.get('usuario_id')
    const consejeroId = searchParams.get('consejero_id')
    const limitParam = Number(searchParams.get('limit') ?? '100')
    const offsetParam = Number(searchParams.get('offset') ?? '0')
    const limit = Number.isNaN(limitParam) ? 100 : Math.min(Math.max(limitParam, 1), 500)
    const offset = Number.isNaN(offsetParam) ? 0 : Math.max(offsetParam, 0)

    const supabase = await createClient()
    let query = supabase
      .from('audit_log')
      .select('*')
      .eq('entidad', 'auth')
      .in('accion', [...ACCIONES_LOGIN])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (usuarioId) {
      query = query.eq('entidad_id', usuarioId)
    }

    if (consejeroId) {
      query = query.eq('consejero_id', consejeroId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[audit/logins] Error:', error)
    return NextResponse.json({ error: 'Error al obtener auditoría' }, { status: 500 })
  }
}
