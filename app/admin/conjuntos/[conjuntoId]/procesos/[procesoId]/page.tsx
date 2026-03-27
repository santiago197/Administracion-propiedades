'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  Loader,
  Users,
  FileText,
  BarChart3,
  CheckSquare,
  ClipboardList,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import type { Proceso, ProcesoStats, EstadoProceso } from '@/lib/types/index'

function ChecklistItem({
  ok,
  label,
  href,
  hrefLabel,
}: {
  ok: boolean
  label: string
  href: string
  hrefLabel: string
}) {
  return (
    <div className="flex items-start gap-2">
      {ok
        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
        : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      }
      <div className="text-xs">
        <span className={ok ? 'text-green-700 dark:text-green-300' : 'text-destructive'}>{label}</span>
        {!ok && (
          <Link href={href} className="ml-2 text-primary underline hover:no-underline">
            {hrefLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

const ESTADO_LABEL: Record<EstadoProceso, string> = {
  configuracion: 'Configuración',
  evaluacion: 'Evaluación',
  votacion: 'Votación',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

const ESTADO_COLOR: Record<EstadoProceso, string> = {
  configuracion: 'bg-yellow-500/10 text-yellow-600',
  evaluacion: 'bg-blue-500/10 text-blue-600',
  votacion: 'bg-purple-500/10 text-purple-600',
  finalizado: 'bg-green-500/10 text-green-600',
  cancelado: 'bg-destructive/10 text-destructive',
}

const SIGUIENTE_ESTADO: Partial<Record<EstadoProceso, EstadoProceso>> = {
  configuracion: 'evaluacion',
  evaluacion: 'votacion',
  votacion: 'finalizado',
}

const ACCION_LABEL: Partial<Record<EstadoProceso, string>> = {
  configuracion: 'Iniciar Evaluación',
  evaluacion: 'Pasar a Votación',
  votacion: 'Finalizar Proceso',
}

type ProcesoConCuentas = Proceso & { total_propuestas: number; total_consejeros: number }

export default function ProcesoDashboard() {
  const params = useParams()
  const router = useRouter()
  const conjuntoId = params.conjuntoId as string
  const procesoId = params.procesoId as string

  const [proceso, setProceso] = useState<ProcesoConCuentas | null>(null)
  const [stats, setStats] = useState<ProcesoStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [errorEstado, setErrorEstado] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [procRes, statsRes] = await Promise.all([
          fetch(`/api/procesos/${procesoId}`),
          fetch(`/api/procesos/stats?proceso_id=${procesoId}`),
        ])

        if (procRes.ok) {
          setProceso(await procRes.json())
        }

        if (statsRes.ok) {
          setStats(await statsRes.json())
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [procesoId])

  const handleCambiarEstado = async () => {
    if (!proceso) return
    const siguiente = SIGUIENTE_ESTADO[proceso.estado]
    if (!siguiente) return

    const label = ACCION_LABEL[proceso.estado]
    if (!confirm(`¿Confirmas que deseas ejecutar "${label}"? Esta acción no se puede deshacer.`)) {
      return
    }

    setCambiandoEstado(true)
    setErrorEstado(null)

    try {
      const res = await fetch(`/api/procesos/${procesoId}/cambiar-estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: siguiente }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorEstado(data.error ?? 'Error al cambiar el estado')
        return
      }

      setProceso((prev) => prev ? { ...prev, estado: siguiente } : prev)
    } catch {
      setErrorEstado('Error de conexión')
    } finally {
      setCambiandoEstado(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!proceso) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h2 className="text-xl mb-4">Proceso no encontrado</h2>
        <Link href={`/admin/conjuntos/${conjuntoId}`}>
          <Button>Volver al Conjunto</Button>
        </Link>
      </div>
    )
  }

  const estadoActual = proceso.estado
  const siguienteEstado = SIGUIENTE_ESTADO[estadoActual]

  const steps = [
    {
      title: 'Registro de Candidatos',
      description: 'Gestión de propuestas y documentos básicos.',
      icon: <Users className="h-6 w-6" />,
      href: `/admin/conjuntos/${conjuntoId}/propuestas`,
      status: 'completado',
    },
    {
      title: 'Validación Legal',
      description: 'Verificación de antecedentes y requisitos SARLAFT.',
      icon: <CheckSquare className="h-6 w-6" />,
      href: `/admin/conjuntos/${conjuntoId}/procesos/${procesoId}/validacion-legal`,
      status: estadoActual === 'configuracion' ? 'en_progreso' : 'completado',
    },
    {
      title: 'Evaluación Técnica',
      description: 'Calificación por criterios por parte del consejo.',
      icon: <ClipboardList className="h-6 w-6" />,
      href: `/admin/conjuntos/${conjuntoId}/procesos/${procesoId}/evaluacion`,
      status: proceso.estado === 'evaluacion' ? 'en_progreso' : (proceso.estado === 'configuracion' ? 'pendiente' : 'completado')
    },
    {
      title: 'Selección y Ranking',
      description: 'Resultados finales y generación de actas.',
      icon: <BarChart3 className="h-6 w-6" />,
      href: `/admin/conjuntos/${conjuntoId}/procesos/${procesoId}/resultados`,
      status:
        estadoActual === 'finalizado'
          ? 'completado'
          : estadoActual === 'votacion'
          ? 'en_progreso'
          : 'pendiente',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al Conjunto
          </Button>
        </Link>

        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl text-foreground">{proceso.nombre}</h1>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={`text-xs px-2 py-1 rounded-full uppercase font-medium ${ESTADO_COLOR[estadoActual]}`}
              >
                {ESTADO_LABEL[estadoActual]}
              </span>
              <span className="text-sm text-muted-foreground">
                {proceso.total_propuestas} propuesta{proceso.total_propuestas !== 1 ? 's' : ''} ·{' '}
                {proceso.total_consejeros} consejero{proceso.total_consejeros !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {siguienteEstado && (
            <Button
              onClick={handleCambiarEstado}
              disabled={cambiandoEstado}
              className="gap-2"
            >
              {cambiandoEstado ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {ACCION_LABEL[estadoActual]}
            </Button>
          )}
        </div>

        {errorEstado && (
          <Card className="mb-6 border border-destructive/20 bg-destructive/10 p-4">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">No se puede avanzar el proceso</p>
                <p className="text-sm text-destructive/80 mt-0.5">{errorEstado}</p>
              </div>
            </div>
            {/* Checklist contextual según el estado actual */}
            {estadoActual === 'configuracion' && (
              <div className="ml-8 space-y-1.5">
                <p className="text-xs font-medium text-destructive/70 uppercase tracking-wide mb-2">
                  Requisitos para iniciar evaluación
                </p>
                <ChecklistItem
                  ok={(stats?.propuestas_activas ?? 0) >= 1}
                  label={`Mínimo 1 propuesta habilitada — tienes ${stats?.propuestas_activas ?? 0}`}
                  href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}/validacion-legal`}
                  hrefLabel="Ir a validación legal"
                />
                <ChecklistItem
                  ok={(stats?.total_propuestas ?? 0) >= 3}
                  label={`Mínimo 3 candidatos registrados — tienes ${stats?.total_propuestas ?? 0}`}
                  href={`/admin/conjuntos/${conjuntoId}/propuestas`}
                  hrefLabel="Registrar candidatos"
                />
              </div>
            )}
            {estadoActual === 'evaluacion' && (
              <div className="ml-8 space-y-1.5">
                <p className="text-xs font-medium text-destructive/70 uppercase tracking-wide mb-2">
                  Requisitos para pasar a votación
                </p>
                <ChecklistItem
                  ok={(stats?.evaluaciones_completadas ?? 0) > 0}
                  label={`Todas las propuestas evaluadas — ${stats?.evaluaciones_completadas ?? 0} de ${stats?.propuestas_activas ?? 0} evaluadas`}
                  href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}/evaluacion`}
                  hrefLabel="Ir a evaluación técnica"
                />
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
          <Card className="p-4 border border-border/50 bg-card/50 flex flex-col items-center text-center">
            <span className="text-2xl">{stats?.total_propuestas || 0}</span>
            <span className="text-xs text-muted-foreground uppercase mt-1">Candidatos</span>
          </Card>
          <Card className="p-4 border border-border/50 bg-card/50 flex flex-col items-center text-center">
            <span className="text-2xl">{stats?.propuestas_activas || 0}</span>
            <span className="text-xs text-muted-foreground uppercase mt-1">Habilitados</span>
          </Card>
          <Card className="p-4 border border-border/50 bg-card/50 flex flex-col items-center text-center">
            <span className="text-2xl">{stats?.evaluaciones_completadas || 0}</span>
            <span className="text-xs text-muted-foreground uppercase mt-1">Evaluaciones</span>
          </Card>
          <Card className="p-4 border border-border/50 bg-card/50 flex flex-col items-center text-center">
            <span className="text-2xl">{stats?.votaciones_completadas || 0}</span>
            <span className="text-xs text-muted-foreground uppercase mt-1">Votos</span>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl">Flujo del Proceso</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {steps.map((step, i) => (
              <Link key={i} href={step.href}>
                <Card
                  className={`p-6 border border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer h-full ${
                    step.status === 'en_progreso' ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        step.status === 'completado'
                          ? 'bg-green-500/10 text-green-500'
                          : step.status === 'en_progreso'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-medium">{step.title}</h3>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase ${
                            step.status === 'completado'
                              ? 'bg-green-500/10 text-green-500'
                              : step.status === 'en_progreso'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {step.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
