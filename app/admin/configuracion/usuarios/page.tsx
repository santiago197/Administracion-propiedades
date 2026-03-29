import { getUsuarios } from '@/lib/supabase/queries'
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

  try {
    usuarios = await getUsuarios(conjuntoId)
  } catch (error) {
    console.error('Error loading usuarios:', error)
  }

  return <UsuariosClient initialUsuarios={usuarios} />
}
