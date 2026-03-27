'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Settings, Home, LogOut } from 'lucide-react'
import { useState } from 'react'

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('[v0] Logout error:', error)
      setLoggingOut(false)
    }
  }

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="flex items-center justify-between px-3 py-3 sm:px-6 sm:py-4">
        <Link href="/admin" className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
            SA
          </div>
          <span className="hidden sm:block font-semibold text-foreground">SelecionAdm</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link href="/admin">
            <Button
              variant={pathname === '/admin' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5 sm:gap-2"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Conjuntos</span>
            </Button>
          </Link>
          <Link href="/admin/configuracion">
            <Button
              variant={pathname.startsWith('/admin/configuracion') ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5 sm:gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuración</span>
            </Button>
          </Link>
        </nav>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="gap-1.5 sm:gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  )
}
