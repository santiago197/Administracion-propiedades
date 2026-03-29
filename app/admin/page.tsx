<<<<<<< HEAD
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NavBar } from '@/components/admin/nav-bar'
import { Plus, ChevronRight, Calendar, MapPin, Users, Loader } from 'lucide-react'
import type { Conjunto } from '@/lib/types/index'
import { createClient } from '@/lib/supabase/client'

export default function AdminHome() {
  const router = useRouter()
  const [conjuntos, setConjuntos] = useState<Conjunto[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        // Si no hay usuario, redirigir a login
        if (!user) {
          router.push('/login')
          return
        }

        setAuthorized(true)

        // Cargar conjuntos
        const response = await fetch('/api/conjuntos')
        if (response.status === 401) {
          router.push('/login')
          return
        }
        const data = await response.json()
        setConjuntos(data || [])
      } catch (error) {
        console.error('[v0] Error fetching conjuntos:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetch()
  }, [router])

  // No renderizar nada hasta validar autorización
  if (!authorized && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Validando sesión...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Conjuntos Residenciales</h1>
            <p className="mt-2 text-muted-foreground">
              Administra los procesos de selección de administradores
            </p>
          </div>
          <Link href="/admin/nuevo-conjunto">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Conjunto
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-card/50" />
            ))}
          </div>
        ) : conjuntos.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto max-w-sm">
              <h2 className="text-xl font-semibold text-foreground mb-2">No hay conjuntos registrados</h2>
              <p className="text-muted-foreground mb-6">
                Comienza creando tu primer conjunto residencial para iniciar procesos de selección.
              </p>
              <Link href="/admin/nuevo-conjunto">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Primer Conjunto
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {conjuntos.map((conjunto) => (
              <Link key={conjunto.id} href={`/admin/conjuntos/${conjunto.id}`}>
                <Card className="group border border-border/50 bg-card/50 p-6 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        {conjunto.nombre}
                      </h3>
                      <p className="text-sm text-muted-foreground">Conjunto residencial</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{conjunto.ciudad}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{conjunto.anio}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      {conjunto.direccion}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
=======
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getConjunto, getProcesos } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ArrowRight, Plus, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import type { EstadoProceso, Proceso } from '@/lib/types/index'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<EstadoProceso, string> = {
  configuracion: 'Configuración',
  evaluacion: 'Evaluación',
  votacion: 'Votación',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

const ESTADO_BADGE: Record<EstadoProceso, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  configuracion: 'secondary',
  evaluacion: 'default',
  votacion: 'outline',
  finalizado: 'secondary',
  cancelado: 'destructive',
}

const PROCESO_AVANCE: Record<EstadoProceso, number> = {
  configuracion: 25,
  evaluacion: 50,
  votacion: 75,
  finalizado: 100,
  cancelado: 0,
}

// 4 etapas reales del proceso — sincronizadas con el tablero del proceso
const ETAPAS: { key: EstadoProceso; label: string; helper: string }[] = [
  { key: 'configuracion', label: 'Registro y configuración', helper: 'Candidatos, documentos y validación legal' },
  { key: 'evaluacion',    label: 'Evaluación técnica',       helper: 'Calificación por consejeros y admin' },
  { key: 'votacion',      label: 'Votación',                 helper: 'Consejeros seleccionan al ganador' },
  { key: 'finalizado',    label: 'Finalizado',               helper: 'Acta y resultado publicado' },
]

function getEtapaStatus(etapaKey: EstadoProceso, procesoEstado: EstadoProceso) {
  const order: EstadoProceso[] = ['configuracion', 'evaluacion', 'votacion', 'finalizado']
  const etapaIdx = order.indexOf(etapaKey)
  const actualIdx = order.indexOf(procesoEstado)
  if (etapaIdx < actualIdx) return 'completado'
  if (etapaIdx === actualIdx) return 'en_progreso'
  return 'pendiente'
}

function ProcesoCard({ proceso, conjuntoId }: { proceso: Proceso; conjuntoId: string }) {
  const avance = PROCESO_AVANCE[proceso.estado] ?? 0
  return (
    <Link href={`/admin/conjuntos/${conjuntoId}/procesos/${proceso.id}`}>
      <div className="rounded-lg border bg-muted/40 p-4 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-semibold group-hover:text-primary transition-colors">{proceso.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(proceso.fecha_inicio).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={ESTADO_BADGE[proceso.estado] ?? 'secondary'}>
              {ESTADO_LABEL[proceso.estado] ?? proceso.estado}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={avance} className="flex-1 h-1.5" />
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">{avance}%</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {ESTADO_LABEL[proceso.estado]} · Click para gestionar
        </p>
      </div>
    </Link>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const cookieStore = await cookies()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await requireAuth({ cookies: cookieStore } as any)

  console.log('[admin/page] requireAuth result:', {
    authorized: user.authorized,
    conjuntoId: user.conjuntoId,
    userId: user.user?.id ?? null,
  })

  if (!user.authorized || !user.conjuntoId) {
    console.log('[admin/page] redirigiendo a /login')
    redirect('/login')
  }

  const { data: conjunto } = await getConjunto(user.conjuntoId)
  const { data: procesos } = await getProcesos(user.conjuntoId)

  const procesosActivos = procesos?.filter(
    (p) => p.estado !== 'finalizado' && p.estado !== 'cancelado'
  ) ?? []
  const procesoActivo = procesosActivos[0] ?? null
  const avanceGlobal = procesoActivo ? PROCESO_AVANCE[procesoActivo.estado] : 0

  return (
    <div className="space-y-8">

      {/* Encabezado + CTA principal */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Panel general</p>
          <h1 className="text-2xl tracking-tight">
            {conjunto?.nombre ?? 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión del proceso de selección de administrador — Ley 675
          </p>
        </div>

        {procesoActivo ? (
          <Link href={`/admin/conjuntos/${user.conjuntoId}/procesos/${procesoActivo.id}`}>
            <Button className="gap-2 shrink-0">
              Ir al proceso activo
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Link href={`/admin/conjuntos/${user.conjuntoId}`}>
            <Button className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Crear primer proceso
            </Button>
          </Link>
        )}
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Conjunto',
            value: conjunto?.nombre?.substring(0, 2).toUpperCase() ?? '--',
            helper: conjunto?.nombre ?? 'Sin nombre',
            sub: conjunto?.ciudad ?? '',
          },
          {
            title: 'Procesos activos',
            value: procesosActivos.length.toString(),
            helper: procesosActivos.length === 1 ? 'proceso en curso' : 'procesos en curso',
            sub: procesosActivos.length > 0 ? `Estado: ${ESTADO_LABEL[procesosActivos[0].estado]}` : 'Sin procesos activos',
          },
          {
            title: 'Avance global',
            value: `${avanceGlobal}%`,
            helper: procesoActivo ? `Etapa: ${ESTADO_LABEL[procesoActivo.estado]}` : 'Sin proceso activo',
            sub: procesoActivo ? procesoActivo.nombre : '–',
          },
          {
            title: 'Total histórico',
            value: (procesos?.length ?? 0).toString(),
            helper: 'procesos realizados',
            sub: `${procesos?.filter((p) => p.estado === 'finalizado').length ?? 0} finalizados`,
          },
        ].map((card) => (
          <Card key={card.title} className="bg-card/70">
            <CardHeader className="pb-2">
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-0.5">
              <p>{card.helper}</p>
              <p className="text-xs opacity-70">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">

        {/* Proceso activo + etapas */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>
              {procesoActivo ? procesoActivo.nombre : 'Sin proceso activo'}
            </CardTitle>
            <CardDescription>
              {procesoActivo
                ? `Estado actual: ${ESTADO_LABEL[procesoActivo.estado]}`
                : 'Crea un nuevo proceso para comenzar el flujo de selección'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {procesoActivo ? (
              <>
                {/* Barra de avance */}
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1.5">Avance global del proceso</p>
                    <div className="flex items-center gap-3">
                      <Progress value={avanceGlobal} className="flex-1" />
                      <span className="text-sm font-semibold tabular-nums">{avanceGlobal}%</span>
                    </div>
                  </div>
                </div>

                {/* Etapas sincronizadas con el tablero */}
                <div className="space-y-2">
                  {ETAPAS.map((etapa) => {
                    const status = getEtapaStatus(etapa.key, procesoActivo.estado)
                    return (
                      <div
                        key={etapa.key}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                          status === 'completado'
                            ? 'border-emerald-200/60 bg-emerald-50 dark:bg-emerald-900/20'
                            : status === 'en_progreso'
                            ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                            : 'border-muted bg-card/50'
                        }`}
                      >
                        {status === 'completado' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : status === 'en_progreso' ? (
                          <Loader2 className="h-4 w-4 text-primary mt-0.5 shrink-0 animate-spin" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-medium ${
                              status === 'completado' ? 'text-emerald-800 dark:text-emerald-100' :
                              status === 'en_progreso' ? 'text-primary' : 'text-muted-foreground'
                            }`}>
                              {etapa.label}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase tracking-wide shrink-0 ${
                                status === 'completado' ? 'border-emerald-300 text-emerald-700' :
                                status === 'en_progreso' ? 'border-primary/50 text-primary' :
                                'text-muted-foreground'
                              }`}
                            >
                              {status === 'completado' ? 'Listo' : status === 'en_progreso' ? 'En curso' : 'Pendiente'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{etapa.helper}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <Link href={`/admin/conjuntos/${user.conjuntoId}/procesos/${procesoActivo.id}`}>
                  <Button variant="outline" className="w-full gap-2 mt-2">
                    Gestionar proceso
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm mb-4">
                  No hay un proceso activo. Crea uno para iniciar la selección de administrador.
                </p>
                <Link href={`/admin/conjuntos/${user.conjuntoId}`}>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ir al conjunto y crear proceso
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accesos rápidos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Accesos rápidos</CardTitle>
            <CardDescription>Navega directamente a cualquier módulo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              {
                label: 'Conjunto y procesos',
                href: `/admin/conjuntos/${user.conjuntoId}`,
                desc: 'Ver y crear procesos',
              },
              {
                label: 'Consejeros',
                href: `/admin/conjuntos/${user.conjuntoId}/consejeros`,
                desc: 'Gestionar códigos de acceso',
              },
              ...(procesoActivo
                ? [
                    {
                      label: 'Candidatos',
                      href: `/admin/conjuntos/${user.conjuntoId}/propuestas`,
                      desc: 'Registrar y gestionar',
                    },
                    {
                      label: 'Validación legal',
                      href: `/admin/conjuntos/${user.conjuntoId}/procesos/${procesoActivo.id}/validacion-legal`,
                      desc: 'SARLAFT y antecedentes',
                    },
                    {
                      label: 'Evaluación técnica',
                      href: `/admin/conjuntos/${user.conjuntoId}/procesos/${procesoActivo.id}/evaluacion`,
                      desc: 'Calificación por criterios',
                    },
                    {
                      label: 'Resultados',
                      href: `/admin/conjuntos/${user.conjuntoId}/procesos/${procesoActivo.id}/resultados`,
                      desc: 'Ranking y votación',
                    },
                  ]
                : []),
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer group">
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Todos los procesos */}
      {(procesos?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Todos los procesos</CardTitle>
            <CardDescription>
              Historial completo. Haz clic en cualquier proceso para gestionarlo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {procesos!.map((proceso) => (
              <ProcesoCard key={proceso.id} proceso={proceso} conjuntoId={user.conjuntoId!} />
            ))}
          </CardContent>
        </Card>
      )}
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
    </div>
  )
}
