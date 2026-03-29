import { redirect } from 'next/navigation'
import { getCurrentUserWithProfile } from '@/lib/supabase/user'
import { UserProfileCard } from './user-profile-card'

/**
 * Server Component que obtiene y muestra el perfil del usuario autenticado.
 * 
 * - Obtiene datos del usuario desde el servidor (sin exponer lógica al cliente)
 * - Redirige a /login si no hay sesión
 * - Muestra error claro si falla la consulta
 */
export async function UserProfile() {
  const { user, authUser, error } = await getCurrentUserWithProfile()

  // Sin sesión → redirigir
  if (!authUser) {
    redirect('/login')
  }

  // Con sesión pero sin datos extendidos → mostrar error
  if (error || !user) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm font-medium text-destructive">
          {error || 'No se pudo cargar el perfil del usuario'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Contacta al administrador si el problema persiste.
        </p>
      </div>
    )
  }

  // Todo OK → renderizar card de perfil
  return <UserProfileCard user={user} />
}
