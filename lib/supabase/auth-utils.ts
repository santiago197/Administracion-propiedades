import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

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
<<<<<<< HEAD
export async function requireAuth(request: NextRequest): Promise<{ authorized: boolean; response: NextResponse | null; user: any }> {
=======
export async function requireAuth(
  request: NextRequest
): Promise<{ authorized: boolean; response: NextResponse | null; user: User | null; conjuntoId: string | null }> {
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
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

<<<<<<< HEAD
  return {
    authorized: true,
    response: null,
    user,
=======
  try {
    const supabase = await getSupabaseClient()
    let perfil: { conjunto_id: string | null } | null = null
    let perfilError: unknown | null = null

    const { data: perfilData, error: perfilRpcError } = await supabase.rpc('get_current_user_profile')

    if (perfilRpcError) {
      const { data, error } = await supabase
        .from('usuarios')
        .select('conjunto_id, activo')
        .eq('id', user.id)
        .single()

      perfil = data
      perfilError = error   // solo falla si el fallback directo también falla
    } else {
      perfil = (Array.isArray(perfilData) ? perfilData[0] : perfilData) ?? null
    }

    if (perfilError) {
      console.error('[v0] Error obteniendo perfil de usuario:', perfilError)
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        ),
        user: null,
        conjuntoId: null,
      }
    }

    if (!perfil?.activo) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        ),
        user: null,
        conjuntoId: null,
      }
    }

    if (!perfil.conjunto_id) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Usuario sin conjunto asignado' },
          { status: 403 }
        ),
        user,
        conjuntoId: null,
      }
    }

    return {
      authorized: true,
      response: null,
      user,
      conjuntoId: perfil.conjunto_id as string,
    }
  } catch (err) {
    console.error('[v0] Error validando conjunto de usuario:', err)
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Error al validar sesión' },
        { status: 500 }
      ),
      user: null,
      conjuntoId: null,
    }
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
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
