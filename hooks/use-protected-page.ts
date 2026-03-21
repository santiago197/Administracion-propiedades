import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook para proteger páginas del cliente.
 * Valida autenticación y redirige a login si no hay sesión.
 * 
 * @returns { authenticated: boolean, loading: boolean }
 */
export function useProtectedPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
        }
      } catch (error) {
        console.error('[v0] Auth check error:', error)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])
}
