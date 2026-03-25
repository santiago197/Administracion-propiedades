import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Obtiene el usuario actual y valida su sesión.
 * Usa en rutas de API que requieren autenticación.
 */
export async function getCurrentUser(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              console.error('[v0] Error setting cookies:', error)
            }
          },
        },
      }
    )

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { user: null, error: 'No autorizado' }
    }

    return { user, error: null }
  } catch (error) {
    console.error('[v0] Error getting user:', error)
    return { user: null, error: 'Error al obtener usuario' }
  }
}

/**
 * Middleware para proteger rutas de API.
 * Retorna error 401 si no está autenticado.
 */
export async function requireAuth(request: NextRequest): Promise<{ authorized: boolean; response: NextResponse | null; user: any }> {
  const { user, error } = await getCurrentUser(request)

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: error || 'No autorizado' },
        { status: 401 }
      ),
      user: null,
    }
  }

  return {
    authorized: true,
    response: null,
    user,
  }
}

/**
 * Obtiene el cliente Supabase para consultas de servidor.
 */
export async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            console.error('[v0] Error setting cookies:', error)
          }
        },
      },
    }
  )
}
