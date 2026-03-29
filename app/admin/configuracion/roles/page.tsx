import { getRoles, getPermisos } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/server'
import { RolesClient } from './roles-client'

export default async function RolesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let conjuntoId: string | null = null
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('conjunto_id')
      .eq('id', user.id)
      .single()
    conjuntoId = usuario?.conjunto_id ?? null
  }

  let roles: Awaited<ReturnType<typeof getRoles>> = []
  let permisos: Awaited<ReturnType<typeof getPermisos>> = []

  try {
    ;[roles, permisos] = await Promise.all([
      getRoles(conjuntoId),
      getPermisos(),
    ])
  } catch (error) {
    console.error('Error loading roles/permisos:', error)
  }

  return <RolesClient initialRoles={roles} permisos={permisos} />
}
