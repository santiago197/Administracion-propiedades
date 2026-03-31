import { redirect } from 'next/navigation'

// Redirige al dashboard para resolver el conflicto de ruta con (dashboard)/perfil
export default function PerfilRedirect() {
  redirect('/consejero/dashboard')
}
