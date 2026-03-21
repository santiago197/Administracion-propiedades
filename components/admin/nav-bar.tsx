'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Settings, Home } from 'lucide-react'

export function NavBar() {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            SA
          </div>
          <span className="font-semibold text-foreground">SelecionAdm</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link href="/admin">
            <Button
              variant={pathname === '/admin' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Conjuntos
            </Button>
          </Link>
          <Link href="/admin/configuracion">
            <Button
              variant={pathname.startsWith('/admin/configuracion') ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Configuración
            </Button>
          </Link>
        </nav>

        <div className="text-xs text-muted-foreground">
          Sistema de Selección PH
        </div>
      </div>
    </header>
  )
}
