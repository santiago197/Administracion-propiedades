'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  Users,
  Vote,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
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
                  <Link href="/consejero/votacion">
                    <Vote className="mr-2 h-4 w-4" />
                    Ir a votar
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/consejero/evaluaciones">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Ir a evaluar
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}

              <Button variant="outline" asChild>
                <Link href="/consejero/candidatos">
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
    </div>
  )
}
