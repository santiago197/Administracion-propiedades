import { createClient } from './server'
import type { UsuarioConConjunto } from '../types/index'

/**
 * Obtiene el usuario autenticado actual desde auth.users
 * y sus datos extendidos desde la tabla usuarios.
 * 
 * Solo usar en Server Components o API Routes.
 */
export async function getCurrentUserWithProfile(): Promise<{
  user: UsuarioConConjunto | null
  authUser: { id: string; email: string } | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // 1. Obtener usuario de auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return { user: null, authUser: null, error: 'No hay sesión activa' }
    }

    // 2. Obtener datos extendidos de la tabla usuarios
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select(`
        *,
        conjunto:conjuntos(id, nombre)
      `)
      .eq('id', authUser.id)
      .single()

    if (usuarioError) {
      // Usuario autenticado pero sin registro en tabla usuarios
      return {
        user: null,
        authUser: { id: authUser.id, email: authUser.email ?? '' },
        error: 'Usuario no encontrado en el sistema',
      }
    }

    return {
      user: usuario as UsuarioConConjunto,
      authUser: { id: authUser.id, email: authUser.email ?? '' },
      error: null,
    }
  } catch (err) {
    console.error('[UserProfile] Error obteniendo usuario:', err)
    return { user: null, authUser: null, error: 'Error al obtener datos del usuario' }
  }
}
