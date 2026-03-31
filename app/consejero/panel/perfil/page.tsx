'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  Vote,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'

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

interface Progreso {
  total_propuestas: number
  evaluadas: number
  voto_registrado: boolean
}

interface PerfilData {
  consejero: Consejero
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

const COLOR_ESTADO: Record<string, string> = {
  activo: 'bg-green-100 text-green-800',
  en_evaluacion: 'bg-blue-100 text-blue-800',
  en_votacion: 'bg-purple-100 text-purple-800',
  finalizado: 'bg-gray-100 text-gray-700',
  suspendido: 'bg-red-100 text-red-800',
}

export default function PerfilPage() {
  const [data, setData] = useState<PerfilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/consejero/perfil')
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar el perfil')
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
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 w-full rounded bg-muted animate-pulse" />
                ))}
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
          <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error ?? 'No se pudo cargar la información del perfil.'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { consejero, proceso, progreso } = data
  const apartamentoDisplay = [
    consejero.torre ? `Torre ${consejero.torre}` : null,
    `Apto ${consejero.apartamento}`,
  ]
    .filter(Boolean)
    .join(' - ')

  const evaluadasPct =
    progreso && progreso.total_propuestas > 0
      ? Math.round((progreso.evaluadas / progreso.total_propuestas) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">Información personal y estado de participación</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Nombre</p>
              <p className="font-medium">{consejero.nombre_completo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cargo</p>
              <p className="font-medium">{consejero.cargo}</p>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Unidad</p>
                <p className="font-medium">{apartamentoDisplay}</p>
              </div>
            </div>
            {consejero.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                  <p className="font-medium">{consejero.email}</p>
                </div>
              </div>
            )}
            {consejero.telefono && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Teléfono</p>
                  <p className="font-medium">{consejero.telefono}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proceso activo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Proceso Activo
            </CardTitle>
            {proceso && (
              <CardDescription>{proceso.nombre}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {proceso ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado del proceso</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[proceso.estado] ?? 'bg-muted text-muted-foreground'}`}
                  >
                    {LABEL_ESTADO[proceso.estado] ?? proceso.estado}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Clock className="h-4 w-4" />
                <p className="text-sm">No hay proceso activo en este momento.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progreso de participación */}
      {progreso && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Resumen de Participación
            </CardTitle>
            <CardDescription>Tu avance en el proceso de selección</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Evaluaciones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Evaluaciones completadas</span>
                <span className="text-muted-foreground">
                  {progreso.evaluadas} / {progreso.total_propuestas} candidatos
                </span>
              </div>
              <Progress value={evaluadasPct} className="h-2" />
              <p className="text-xs text-muted-foreground">{evaluadasPct}% completado</p>
            </div>

            {/* Voto */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Vote className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Votación</p>
                  <p className="text-xs text-muted-foreground">
                    {progreso.voto_registrado
                      ? 'Tu voto ha sido registrado correctamente'
                      : progreso.evaluadas < progreso.total_propuestas
                      ? 'Completa todas las evaluaciones para poder votar'
                      : 'Listo para votar'}
                  </p>
                </div>
              </div>
              {progreso.voto_registrado ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
