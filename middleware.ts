import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Rutas públicas (sin autenticación requerida)
  const publicRoutes = [
    '/',
    '/login',
    '/consejero',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/validate-code',
    '/api/evaluacion',
    '/api/consejero',
  ]
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  let supabaseResponse = NextResponse.next({
    request,
  })

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
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Si intenta acceder a ruta protegida sin estar autenticado
  if (!isPublicRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && !isPublicRoute) {
    // Buscar el registro en usuarios por el id de auth (PK esperada en la tabla)
    let dbUser: { id: string; activo: boolean; conjunto_id: string | null } | null = null
    let queryError: unknown | null = null

    const { data: profileData, error: profileError } = await supabase.rpc('get_current_user_profile')

    if (profileError) {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, activo, conjunto_id')
        .eq('id', user.id)
        .maybeSingle()

      dbUser = data
      queryError = error ?? profileError
    } else {
      const profile = Array.isArray(profileData) ? profileData[0] : profileData
      dbUser = profile ?? null
    }

    if (queryError) {
      console.error('[auth] Error consultando usuarios:', {
        error: queryError,
        userId: user.id,
        path: pathname,
      })
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'Error consultando usuario en el sistema')
      return NextResponse.redirect(loginUrl)
    }

    if (!dbUser) {
      console.warn('[auth] Registro de usuario no encontrado', {
        userId: user.id,
        path: pathname,
      })
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'Usuario no registrado en el sistema (tabla usuarios)')
      return NextResponse.redirect(loginUrl)
    }

    if (dbUser && dbUser.activo === false) {
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'Usuario inactivo o no autorizado')
      return NextResponse.redirect(loginUrl)
    }

    // Si es una ruta de administración (/admin/*) pero no tiene conjunto_id
    if (pathname.startsWith('/admin') && !dbUser.conjunto_id) {
      console.warn('[auth] Usuario sin conjunto asignado', {
        userId: user.id,
        path: pathname,
      })
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'Usuario sin conjunto asignado')
      return NextResponse.redirect(loginUrl)
    }
  }

  // Si está autenticado pero intenta acceder a login, redirigir a admin
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Excluye archivos estáticos, imágenes y la ruta de upload (multipart/form-data
    // se corrompe cuando el middleware clona el request al renovar cookies de Supabase).
    // La auth en /api/upload ya la maneja requireAuth() directamente en el route.
    '/((?!_next/static|_next/image|favicon.ico|api/upload|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
