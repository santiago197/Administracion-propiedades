import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { logAuthEvent } from '@/lib/supabase/audit'
// import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  // if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
  //   return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 })
  // }

  const { email, password } = await request.json()
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email y contraseña son requeridos' },
      { status: 400 }
    )
  }

  try {
    // La respuesta se crea primero para que setAll pueda escribir cookies en ella.
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('[login] signInWithPassword result:', {
      userId: data.user?.id,
      hasSession: !!data.session,
      error: error?.message,
    })

    if (error) {
      await logAuthEvent({
        request,
        accion: 'LOGIN_FAILED',
        entidadId: null,
        datosNuevos: { email: normalizedEmail },
      })
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'No se pudo crear sesión' },
        { status: 500 }
      )
    }

    let conjuntoId: string | null = null
    const { data: usuarioRow, error: usuarioError } = await supabase
      .from('usuarios')
      .select('conjunto_id')
      .eq('id', data.user.id)
      .maybeSingle()
    if (usuarioError) {
      console.warn('[login] No se pudo obtener conjunto_id:', usuarioError.message)
    }
    conjuntoId = usuarioRow?.conjunto_id ?? null

    // Actualizar ultimo_acceso del usuario
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ ultimo_acceso: new Date().toISOString() })
      .eq('id', data.user.id)

    if (updateError) {
      console.warn('[login] No se pudo actualizar ultimo_acceso:', updateError.message)
    }

    await logAuthEvent({
      request,
      accion: 'LOGIN_SUCCESS',
      entidadId: data.user.id,
      conjuntoId,
      supabase,
    })

    const setCookieHeaders = response.cookies.getAll().map(c => c.name)
    console.log('[login] cookies en respuesta:', setCookieHeaders)

    return response
  } catch (error) {
    console.error('[auth] Login error:', error)
    await logAuthEvent({
      request,
      accion: 'LOGIN_FAILED',
      entidadId: null,
      datosNuevos: { email: normalizedEmail },
    })
    return NextResponse.json(
      { error: 'Error al procesar login' },
      { status: 500 }
    )
  }
}
