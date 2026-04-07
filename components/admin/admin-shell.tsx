'use client'

import { useMemo, useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Bell,
  Building2,
  CheckSquare,
  FileText,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Layers,
  ClipboardList,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './theme-toggle'

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Perfil del Conjunto', href: '/admin/perfil', icon: Building2 },
  { title: 'Consejo', href: '/admin/consejeros', icon: Users },
  { title: 'Procesos de Selección', href: '/admin/procesos', icon: Flag },
  { title: 'Propuestas', href: '/admin/propuestas', icon: Layers },
  { title: 'Documentación', href: '/admin/documentos', icon: FileText },
  { title: 'Validación Legal', href: '/admin/validacion-legal', icon: ShieldCheck },
  { title: 'Evaluación Técnica', href: '/admin/evaluacion', icon: ClipboardList },
  { title: 'Ranking', href: '/admin/ranking', icon: BarChart3 },
  { title: 'Votación Consejo', href: '/admin/votacion', icon: CheckSquare },
  { title: 'Contratos', href: '/admin/contratos', icon: ScrollText },
  { title: 'Finanzas', href: '/admin/finanzas', icon: BarChart3 },
  { title: 'Informes / Auditoría', href: '/admin/reportes', icon: ScrollText },
  {
    title: 'Configuración',
    href: '/admin/configuracion/roles',
    icon: Settings,
    children: [
      { title: 'Roles y accesos', href: '/admin/configuracion/roles', icon: ShieldCheck },
      { title: 'Usuarios', href: '/admin/configuracion/usuarios', icon: Users },
      { title: 'Tipos de documentos', href: '/admin/configuracion/documentos', icon: CheckSquare },
      { title: 'Criterios de evaluación', href: '/admin/configuracion/criterios', icon: ClipboardList },
      { title: 'Validación legal', href: '/admin/configuracion/validacion-legal', icon: ShieldCheck },
      { title: 'Consulta Pública', href: '/admin/configuracion/consulta-publica', icon: Globe },
    ],
  },
]

interface UserData {
  email: string
  conjuntoNombre: string
  logoUrl?: string
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userData, setUserData] = useState<UserData>({ email: '', conjuntoNombre: '' })
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    async function fetchUserData() {
      try {
        const [conjuntoRes, meRes] = await Promise.all([
          fetch('/api/conjuntos'),
          fetch('/api/me'),
        ])
        const [conjunto, me] = await Promise.all([
          conjuntoRes.ok ? conjuntoRes.json() : Promise.resolve({}),
          meRes.ok ? meRes.json() : Promise.resolve({}),
        ])
        setUserData({
          email: (me.email as string) ?? '',
          conjuntoNombre: (conjunto.nombre as string) ?? 'SelecionAdm',
          logoUrl: conjunto.logo_url as string | undefined,
        })
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
      window.location.href = '/login'
    } catch {
      setLoggingOut(false)
    }
  }

  const activePath = useMemo(
    () => (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  )

  const initials = userData.conjuntoNombre
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'SA'

  const SidebarContent = (
    <div className="flex h-full flex-col bg-card/70">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          {initials}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Conjunto</p>
          <p className="font-semibold leading-tight">{userData.conjuntoNombre || 'Cargando...'}</p>
        </div>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <div key={item.title}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                activePath(item.href) && 'bg-primary/10 text-primary',
              )}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.title}</span>
              {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
            </Link>
            {item.children && (
              <div className="ml-8 mt-1 space-y-1">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60',
                      activePath(child.href) && 'bg-primary/10 text-primary',
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-border" />
                    <span className="flex-1">{child.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="flex h-16 items-center gap-3 px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden lg:flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm overflow-hidden">
              {userData.logoUrl ? (
                <Image
                  src={userData.logoUrl}
                  alt="Logo"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Panel Administrativo</p>
              <p className="font-semibold">{userData.conjuntoNombre || 'SelecionAdm'}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-full border px-3 py-2 bg-card/70 hover:bg-accent/50 transition-colors"
                >
                  <div className="text-left text-xs leading-tight">
                    <p className="text-muted-foreground">Admin</p>
                    <p className="font-semibold max-w-[120px] truncate">{userData.email || 'Usuario'}</p>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
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
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-screen-2xl">
        <aside className="hidden w-64 shrink-0 border-r lg:w-72 lg:block">{SidebarContent}</aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            {SidebarContent}
          </SheetContent>
        </Sheet>

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-10">
          <div className="rounded-2xl border bg-card/80 p-4 shadow-sm md:p-6">{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
