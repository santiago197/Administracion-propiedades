'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, Globe, Users, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProcesoPublico {
  conjunto: string
  nombre: string
  estado: string
  fecha_inicio: string
  fecha_estimado_fin: string
  total_candidatos: number
  evaluaciones_completadas: number
  votacion_completada: number
  comunicados: string[]
}

export default function ConsultaPublicaPage() {
  const params = useParams()
  const slug = params.slug as string
  const [proceso, setProceso] = useState<ProcesoPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProceso = async () => {
      if (!slug) return

      try {
        const res = await fetch(`/api/procesos/${slug}/publico`)

        if (!res.ok) {
          const errorData = await res.json()
          setError(errorData.error || 'No se encontró el proceso')
          setLoading(false)
          return
        }

        const data = await res.json()
        setProceso(data)
      } catch (err) {
        console.error('[consulta] Error:', err)
        setError('Error al cargar el proceso')
      } finally {
        setLoading(false)
      }
    }

    fetchProceso()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando información del proceso...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!proceso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Proceso no encontrado</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const estadoColor: Record<string, string> = {
    configuracion: 'bg-gray-100 text-gray-800',
    abierto: 'bg-blue-100 text-blue-800',
    en_revision: 'bg-yellow-100 text-yellow-800',
    evaluacion: 'bg-purple-100 text-purple-800',
    finalizado: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Globe className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{proceso.conjunto}</p>
                  <h1 className="text-3xl font-bold tracking-tight">{proceso.nombre}</h1>
                </div>
              </div>
            </div>
            <Badge className={`${estadoColor[proceso.estado] || 'bg-gray-100 text-gray-800'} capitalize`}>
              {proceso.estado}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fechas del Proceso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Inicio</p>
                  <p className="font-medium">
                    {new Date(proceso.fecha_inicio).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimado de finalización</p>
                  <p className="font-medium">
                    {new Date(proceso.fecha_estimado_fin).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Candidatos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{proceso.total_candidatos}</p>
                <p className="text-sm text-muted-foreground">Candidatos en evaluación</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progreso del Proceso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Evaluaciones completadas</span>
                  <span className="text-sm text-muted-foreground">{proceso.evaluaciones_completadas}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(proceso.evaluaciones_completadas, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Votación completada</span>
                  <span className="text-sm text-muted-foreground">{proceso.votacion_completada}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(proceso.votacion_completada, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta es una consulta pública del proceso de selección. Los detalles específicos de los
              candidatos permanecen confidenciales conforme a la regulación de propiedad horizontal.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}
