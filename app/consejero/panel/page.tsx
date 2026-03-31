'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ClipboardList,
  Users,
  Vote,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
  Bell,
  Clock,
  FileText,
  Calendar,
  TrendingUp,
} from 'lucide-react'

interface Consejero {
  id: string
  nombre_completo: string
  cargo: string
  torre?: string
  apartamento: string
}

interface Proceso {
  id: string
  nombre: string
  estado: string
}

interface Progreso {
  total_propuestas: number
  evaluadas: number
  voto_registrado: boolean
}

interface PerfilData {
  consejero: Consejero | null
  proceso: Proceso | null
  progreso: Progreso | null
}

const LABEL_ESTADO: Record<string, string> = {
  activo: 'Activo',
  en_evaluacion: 'En evaluación',
  en_votacion: 'En votación',
  finalizado: 'Finalizado',
  suspendido: 'Suspendido',
}

export default function ConsejeroDashboardPage() {
  const [data, setData] = useState<PerfilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/consejero/perfil')
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar el dashboard')
        return r.json()
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-40 rounded bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse mt-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error ?? 'No se pudo cargar la información.'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { proceso, progreso } = data

  const totalCandidatos = progreso?.total_propuestas ?? 0
  const evaluadas = progreso?.evaluadas ?? 0
  const yaVoto = progreso?.voto_registrado ?? false
  const todasEvaluadas = totalCandidatos > 0 && evaluadas >= totalCandidatos
  const evaluadasPct = totalCandidatos > 0 ? Math.round((evaluadas / totalCandidatos) * 100) : 0

  const stats = [
    {
      title: 'Candidatos',
      value: totalCandidatos > 0 ? String(totalCandidatos) : '—',
      description: 'Propuestas habilitadas',
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Evaluaciones',
      value: totalCandidatos > 0 ? `${evaluadas}/${totalCandidatos}` : '—',
      description: todasEvaluadas ? 'Completadas' : 'Pendientes',
      icon: ClipboardList,
      color: todasEvaluadas ? 'text-green-500' : 'text-amber-500',
    },
    {
      title: 'Votación',
      value: yaVoto ? 'Registrado' : todasEvaluadas ? 'Disponible' : 'Pendiente',
      description: yaVoto
        ? 'Tu voto fue emitido'
        : todasEvaluadas
        ? 'Puedes votar ahora'
        : 'Evalúa primero',
      icon: Vote,
      color: yaVoto ? 'text-green-500' : todasEvaluadas ? 'text-purple-500' : 'text-muted-foreground',
    },
    {
      title: 'Estado',
      value: proceso ? (LABEL_ESTADO[proceso.estado] ?? proceso.estado) : 'Sin proceso',
      description: proceso ? 'Proceso en curso' : 'No hay proceso activo',
      icon: CheckCircle,
      color: proceso?.estado === 'finalizado' ? 'text-gray-400' : 'text-green-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen del proceso de selección de administrador
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Proceso activo */}
      {proceso ? (
        <Card>
          <CardHeader>
            <CardTitle>Proceso Actual</CardTitle>
            <CardDescription>{proceso.nombre}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Barra de progreso evaluaciones */}
            {totalCandidatos > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progreso de evaluaciones</span>
                  <span className="text-muted-foreground">
                    {evaluadas} de {totalCandidatos} candidatos
                  </span>
                </div>
                <Progress value={evaluadasPct} className="h-2" />
                <p className="text-xs text-muted-foreground">{evaluadasPct}% completado</p>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-wrap gap-3">
              {yaVoto ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Ya emitiste tu voto</span>
                </div>
              ) : todasEvaluadas ? (
                <Button asChild>
                  <Link href="/consejero/panel/votacion">
                    <Vote className="mr-2 h-4 w-4" />
                    Ir a votar
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/consejero/panel/evaluaciones">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Ir a evaluar
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}

              <Button variant="outline" asChild>
                <Link href="/consejero/panel/candidatos">
                  <Users className="mr-2 h-4 w-4" />
                  Ver candidatos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No hay proceso activo en este momento.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas y Actividad Reciente */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alertas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Alertas</CardTitle>
            </div>
            <CardDescription>Notificaciones importantes del proceso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {!todasEvaluadas && totalCandidatos > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-800">Evaluaciones pendientes</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Te faltan {totalCandidatos - evaluadas} candidatos por evaluar
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" asChild>
                    <Link href="/consejero/panel/evaluaciones">Evaluar</Link>
                  </Button>
                </div>
              )}
              
              {todasEvaluadas && !yaVoto && (
                <div className="flex items-start gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
                  <Vote className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-purple-800">Votacion habilitada</p>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Ya puedes emitir tu voto para seleccionar al administrador
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" asChild>
                    <Link href="/consejero/panel/votacion">Votar</Link>
                  </Button>
                </div>
              )}

              {yaVoto && (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800">Proceso completado</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      Has completado todas tus tareas para este proceso
                    </p>
                  </div>
                </div>
              )}

              {!proceso && (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <p className="text-sm">No hay alertas pendientes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Actividad Reciente</CardTitle>
            </div>
            <CardDescription>Tu historial de acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proceso ? (
                <>
                  {evaluadas > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <ClipboardList className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Evaluaciones realizadas</p>
                        <p className="text-xs text-muted-foreground">
                          {evaluadas} de {totalCandidatos} candidatos evaluados
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {evaluadasPct}%
                      </Badge>
                    </div>
                  )}

                  {yaVoto && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                        <Vote className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Voto emitido</p>
                        <p className="text-xs text-muted-foreground">
                          Participaste en la votacion del proceso actual
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-green-600 border-green-200">
                        Completado
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Proceso asignado</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {proceso.nombre}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {LABEL_ESTADO[proceso.estado] ?? proceso.estado}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <p className="text-sm">Sin actividad reciente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acceso rapido */}
      {proceso && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Acceso Rapido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <Link href="/consejero/panel/candidatos">
                  <Users className="mr-3 h-5 w-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Candidatos</p>
                    <p className="text-xs text-muted-foreground">{totalCandidatos} propuestas</p>
                  </div>
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <Link href="/consejero/panel/evaluaciones">
                  <ClipboardList className="mr-3 h-5 w-5 text-amber-500" />
                  <div className="text-left">
                    <p className="font-medium">Evaluaciones</p>
                    <p className="text-xs text-muted-foreground">{totalCandidatos - evaluadas} pendientes</p>
                  </div>
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <Link href="/consejero/panel/votacion">
                  <Vote className="mr-3 h-5 w-5 text-purple-500" />
                  <div className="text-left">
                    <p className="font-medium">Votacion</p>
                    <p className="text-xs text-muted-foreground">{yaVoto ? 'Completada' : 'Pendiente'}</p>
                  </div>
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <Link href="/consejero/panel/historial">
                  <Calendar className="mr-3 h-5 w-5 text-gray-500" />
                  <div className="text-left">
                    <p className="font-medium">Historial</p>
                    <p className="text-xs text-muted-foreground">Ver procesos</p>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
