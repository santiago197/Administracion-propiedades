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
          cookiesToSet.forEach(({ name, value }) => {
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

  // Construye un redirect a /login que también limpia las cookies de sesión.
  // Debe llamarse DESPUÉS de supabase.auth.signOut() para que setAll haya actualizado supabaseResponse.
  const buildSignOutRedirect = () => {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value, {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    })
    return redirectResponse
  }

  const isApiRoute = pathname.startsWith('/api/')

  // Las API routes manejan su propia autenticación via requireAuth().
  // El middleware solo renueva las cookies de Supabase y pasa la solicitud.
  if (isApiRoute) {
    return supabaseResponse
  }

  // A partir de aquí: solo rutas de página

  // Sin sesión → redirigir a login
  if (!isPublicRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && !isPublicRoute) {
    const { data: dbUser, error } = await supabase
      .from('usuarios')
      .select('id, activo, conjunto_id')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[auth] Error consultando usuarios:', {
        error,
        userId: user.id,
        path: pathname,
      })
      await supabase.auth.signOut()
      return buildSignOutRedirect()
    }

    if (!dbUser) {
      console.warn('[auth] Registro de usuario no encontrado', {
        userId: user.id,
        path: pathname,
      })
      await supabase.auth.signOut()
      return buildSignOutRedirect()
    }

    if (dbUser.activo === false) {
      await supabase.auth.signOut()
      return buildSignOutRedirect()
    }

    if (pathname.startsWith('/admin') && !dbUser.conjunto_id) {
      console.warn('[auth] Usuario sin conjunto asignado', {
        userId: user.id,
        path: pathname,
      })
      await supabase.auth.signOut()
      return buildSignOutRedirect()
    }
  }

  // Autenticado intentando acceder a login → redirigir a admin
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Excluye archivos estáticos, imágenes, rutas de sistema del navegador y api/upload.
    // .well-known es excluido para evitar que peticiones automáticas de Chrome/DevTools
    // interfieran con la sesión activa del usuario.
    '/((?!_next/static|_next/image|favicon.ico|api/upload|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
