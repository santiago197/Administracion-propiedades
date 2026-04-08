'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Vote,
  History,
  User,
  Menu,
  LogOut,
  ChevronLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Consejero {
  id: string
  nombre_completo: string
  cargo: string
  torre?: string
  apartamento: string
  email?: string
  telefono?: string
}

interface Proceso {
  id: string
  nombre: string
  estado: string
}

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/consejero/panel', icon: LayoutDashboard },
  { title: 'Candidatos', href: '/consejero/panel/candidatos', icon: Users },
  { title: 'Evaluaciones', href: '/consejero/panel/evaluaciones', icon: ClipboardList },
  { title: 'Votación', href: '/consejero/panel/votacion', icon: Vote },
  { title: 'Historial', href: '/consejero/panel/historial', icon: History },
  { title: 'Perfil', href: '/consejero/panel/perfil', icon: User },
]

export function ConsejeroShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [consejero, setConsejero] = useState<Consejero | null>(null)
  const [proceso, setProceso] = useState<Proceso | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/consejero/perfil')
      .then((r) => r.json())
      .then((data) => {
        if (data?.consejero) setConsejero(data.consejero)
        if (data?.proceso) setProceso(data.proceso)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const initials = consejero
    ? consejero.nombre_completo
        .split(' ')
        .map((word: string) => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : '?'

  async function handleLogout() {
    try {
      await fetch('/api/consejero/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    router.push('/consejero')
  }

  const conjuntoName = proceso?.nombre ?? consejero?.cargo ?? 'Panel Consejero'

  const UserSkeleton = (
    <div className="p-4">
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
        <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  )

  const SidebarContent = (
    <div className="flex h-full flex-col bg-card">
      {/* Logo y nombre del sistema */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          SA
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-semibold leading-tight truncate">SelecionAdm</p>
            <p className="text-xs text-muted-foreground truncate">Panel Consejero</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Info del conjunto */}
      {!collapsed && (
        <div className="px-4 py-3 bg-muted/30">
          <p className="text-xs text-muted-foreground">Proceso</p>
          <p className="text-sm font-medium truncate">
            {loading ? (
              <span className="inline-block h-3 w-32 rounded bg-muted animate-pulse" />
            ) : (
              conjuntoName
            )}
          </p>
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
              isActive(item.href)
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground',
              collapsed && 'justify-center px-2'
            )}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? item.title : undefined}
          >
            <item.icon className={cn('h-5 w-5 shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
            {!collapsed && <span>{item.title}</span>}
          </Link>
        ))}
      </nav>

      <Separator />

      {/* Usuario en sidebar (solo desktop) */}
      {!collapsed && (
        loading ? UserSkeleton : (
          <div className="p-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{consejero?.nombre_completo ?? '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{consejero?.cargo ?? '—'}</p>
              </div>
            </div>
          </div>
        )
      )}

      {/* Botón colapsar (solo desktop) */}
      <div className="hidden lg:block p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
          />
          {!collapsed && <span className="ml-2">Colapsar</span>}
        </Button>
      </div>
    </div>
  )

  const displayName = consejero?.nombre_completo ?? '...'
  const displayFirstName = displayName.split(' ')[0]
  const displayCargo = consejero?.cargo ?? '...'
  const displayApartamento =
    consejero
      ? [consejero.torre ? `Torre ${consejero.torre}` : null, `Apto ${consejero.apartamento}`]
          .filter(Boolean)
          .join(' - ')
      : '...'

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">
          {/* Botón menú mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Título mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              SA
            </div>
            <span className="font-semibold">Panel Consejero</span>
          </div>

          {/* Breadcrumb / título de página (desktop) */}
          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">Bienvenido,</p>
            {loading ? (
              <div className="h-4 w-32 rounded bg-muted animate-pulse mt-0.5" />
            ) : (
              <p className="font-semibold">{displayName}</p>
            )}
          </div>

          {/* Acciones derecha */}
          <div className="ml-auto flex items-center gap-3">
            {/* Info del apartamento */}
            <div className="hidden lg:block text-right">
              {loading ? (
                <div className="space-y-1">
                  <div className="h-2.5 w-24 rounded bg-muted animate-pulse ml-auto" />
                  <div className="h-3 w-16 rounded bg-muted animate-pulse ml-auto" />
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{displayCargo}</p>
                  <p className="text-sm font-medium">{displayApartamento}</p>
                </>
              )}
            </div>

            {/* Dropdown usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border px-3 py-2 bg-card hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
                    {loading ? '...' : displayFirstName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayCargo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{displayApartamento}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/consejero/panel/perfil" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Mi Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside
          className={cn(
            'hidden lg:block shrink-0 border-r bg-card/50 transition-all duration-300',
            collapsed ? 'w-[72px]' : 'w-64 lg:w-72'
          )}
        >
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            {SidebarContent}
          </div>
        </aside>

        {/* Sidebar mobile */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            {SidebarContent}
          </SheetContent>
        </Sheet>

        {/* Contenido principal */}
        <main className="flex-1 min-w-0">
          <div className="p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
