import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { logAuthEvent } from '@/lib/supabase/audit'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true }, { status: 200 })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    let conjuntoId: string | null = null

    if (user) {
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('conjunto_id')
        .eq('id', user.id)
        .maybeSingle()
      if (usuarioError) {
        console.warn('[logout] No se pudo obtener conjunto_id:', usuarioError.message)
      }
      conjuntoId = usuario?.conjunto_id ?? null

      await logAuthEvent({
        request,
        accion: 'LOGOUT',
        entidadId: user.id,
        conjuntoId,
        supabase,
      })
    }

    await supabase.auth.signOut({ scope: 'global' })

    return response
  } catch (error) {
    console.error('[auth] Logout error:', error)
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}
