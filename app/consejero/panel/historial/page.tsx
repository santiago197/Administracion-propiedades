'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ClipboardList,
  Vote,
  Calendar,
  Loader2,
} from 'lucide-react'

interface Consejero {
  id: string
  nombre_completo: string
  cargo: string
  apartamento: string
  torre?: string
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

export default function HistorialPage() {
  const [data, setData] = useState<PerfilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/consejero/perfil')
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar el historial')
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
          <div className="h-4 w-56 rounded bg-muted animate-pulse mt-2" />
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
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

  // Construir línea de tiempo de actividades
  type TimelineItem = {
    icon: React.ComponentType<{ className?: string }>
    label: string
    sublabel: string
    done: boolean
  }

  const timeline: TimelineItem[] = []

  if (proceso) {
    timeline.push({
      icon: Calendar,
      label: 'Acceso al proceso',
      sublabel: proceso.nombre,
      done: true,
    })
  }

  if (progreso) {
    const evalDone = progreso.evaluadas > 0
    timeline.push({
      icon: ClipboardList,
      label: evalDone
        ? `${progreso.evaluadas} de ${progreso.total_propuestas} candidatos evaluados`
        : 'Evaluaciones pendientes',
      sublabel: evalDone
        ? progreso.evaluadas >= progreso.total_propuestas
          ? 'Evaluaciones completadas'
          : `Faltan ${progreso.total_propuestas - progreso.evaluadas} por evaluar`
        : 'Aún no has iniciado las evaluaciones',
      done: progreso.evaluadas >= progreso.total_propuestas,
    })

    timeline.push({
      icon: Vote,
      label: progreso.voto_registrado ? 'Voto emitido' : 'Votación pendiente',
      sublabel: progreso.voto_registrado
        ? 'Tu voto ha sido registrado correctamente'
        : 'Aún no has emitido tu voto',
      done: progreso.voto_registrado,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
        <p className="text-muted-foreground">Registro de actividad en el proceso de selección</p>
      </div>

      {!proceso ? (
        <Card>
          <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
            <div className="text-center">
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No hay proceso activo en este momento.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Info del proceso */}
          <Card>
            <CardHeader>
              <CardTitle>{proceso.nombre}</CardTitle>
              <CardDescription>
                Estado: {LABEL_ESTADO[proceso.estado] ?? proceso.estado}
              </CardDescription>
            </CardHeader>
            {progreso && (
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-muted-foreground text-xs mb-1">Candidatos</p>
                    <p className="font-semibold text-lg">{progreso.total_propuestas}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-muted-foreground text-xs mb-1">Evaluados</p>
                    <p className="font-semibold text-lg">
                      {progreso.evaluadas}/{progreso.total_propuestas}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-muted-foreground text-xs mb-1">Voto</p>
                    <p className="font-semibold text-lg">
                      {progreso.voto_registrado ? 'Emitido' : 'Pendiente'}
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Timeline de actividad */}
          {timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actividad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Línea vertical */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                  <div className="space-y-6">
                    {timeline.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-4 pl-10 relative">
                        {/* Ícono */}
                        <div
                          className={`absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                            item.done
                              ? 'border-green-500 bg-green-50 text-green-600'
                              : 'border-border bg-background text-muted-foreground'
                          }`}
                        >
                          {item.done ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <item.icon className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
