import { getUsuarios, getPermisos } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/server'
import { UsuariosClient } from './usuarios-client'

export default async function UsuariosPage() {
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

  let usuarios: Awaited<ReturnType<typeof getUsuarios>> = []
  let permisos: Awaited<ReturnType<typeof getPermisos>> = []

  try {
    ;[usuarios, permisos] = await Promise.all([
      getUsuarios(conjuntoId),
      getPermisos(),
    ])
  } catch (error) {
    console.error('Error loading usuarios:', error)
  }

  return <UsuariosClient initialUsuarios={usuarios} permisos={permisos} />
}
