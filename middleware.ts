import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Rutas públicas (sin autenticación requerida)
  const publicRoutes = ['/', '/login', '/api/auth/login', '/api/auth/logout', '/consejero']
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // Actualizar sesión (esto también retorna la respuesta)
  const response = await updateSession(request)

  // Si intenta acceder a ruta protegida sin estar autenticado
  // La protección se valida en el lado del cliente y en cada API
  if (!isPublicRoute) {
    // Verificar si hay cookie de sesión
    const hasSession = request.cookies.has('sb-access-token') || 
                       request.cookies.has('sb-refresh-token')
    
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Si está autenticado pero intenta acceder a login, redirigir a admin
  if (pathname === '/login') {
    const hasSession = request.cookies.has('sb-access-token') || 
                       request.cookies.has('sb-refresh-token')
    
    if (hasSession) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
