import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser, getSupabaseClient } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  const { user, error } = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: error ?? 'No autorizado' }, { status: 401 })
  }

  // Obtener rol del usuario
  const supabase = await getSupabaseClient()
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol, nombre, conjunto_id')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    id: user.id,
    email: user.email,
    rol: perfil?.rol ?? null,
    nombre: perfil?.nombre ?? null,
    conjunto_id: perfil?.conjunto_id ?? null,
  })
}
