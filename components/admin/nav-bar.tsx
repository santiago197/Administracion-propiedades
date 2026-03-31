'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings, Home, LogOut, ClipboardList, LayoutDashboard, Users, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useActiveProceso } from '@/hooks/use-active-proceso'

interface UserData {
  email: string
  nombre?: string
}

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [userData, setUserData] = useState<UserData>({ email: '' })
  const { conjunto, proceso } = useActiveProceso()

  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch('/api/me')
        if (res.ok) {
          const data = await res.json()
          setUserData({
            email: data.email ?? '',
            nombre: data.nombre ?? data.email?.split('@')[0] ?? 'Usuario',
          })
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }
    fetchUserData()
  }, [])

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

  const procesoHref = conjunto && proceso
    ? `/admin/conjuntos/${conjunto.id}/procesos/${proceso.id}`
    : null

  const evaluacionHref = conjunto && proceso && proceso.estado === 'evaluacion'
    ? `/admin/conjuntos/${conjunto.id}/procesos/${proceso.id}/evaluacion`
    : null

  const consejerosHref = conjunto
    ? `/admin/conjuntos/${conjunto.id}/consejeros`
    : null

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

          {procesoHref && (
            <Link href={procesoHref}>
              <Button
                variant={pathname.includes('/procesos/') && !pathname.includes('/evaluacion') ? 'default' : 'ghost'}
                size="sm"
                className="gap-1.5 sm:gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Proceso</span>
              </Button>
            </Link>
          )}

          {evaluacionHref && (
            <Link href={evaluacionHref}>
              <Button
                variant={pathname.includes('/evaluacion') ? 'default' : 'ghost'}
                size="sm"
                className="gap-1.5 sm:gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Evaluación</span>
              </Button>
            </Link>
          )}

          {consejerosHref && (
            <Link href={consejerosHref}>
              <Button
                variant={pathname.includes('/consejeros') ? 'default' : 'ghost'}
                size="sm"
                className="gap-1.5 sm:gap-2"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Consejeros</span>
              </Button>
            </Link>
          )}

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border px-2 py-1.5 sm:px-3 sm:py-2 bg-card/70 hover:bg-accent/50 transition-colors"
            >
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarFallback className="text-xs">
                  {userData.nombre?.substring(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left text-xs leading-tight">
                <p className="font-medium max-w-[100px] truncate">{userData.nombre || 'Usuario'}</p>
                <p className="text-muted-foreground max-w-[100px] truncate">{userData.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userData.nombre || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground truncate">{userData.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
