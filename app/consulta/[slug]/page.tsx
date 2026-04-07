'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, Globe, Users, Calendar, ClipboardList, Building2, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CriterioPublico {
  nombre: string
  descripcion: string | null
  peso: number
}

interface CandidatoPublico {
  razon_social: string
  tipo_persona: string
  estado: string
}

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
  candidatos: CandidatoPublico[]
  criterios: CriterioPublico[]
}

const ESTADO_LABEL: Record<string, string> = {
  registro: 'Registro',
  en_revision: 'En revisión',
  incompleto: 'Incompleto',
  en_subsanacion: 'En subsanación',
  en_validacion: 'En validación',
  no_apto_legal: 'No apto legal',
  habilitada: 'Habilitada',
  en_evaluacion: 'En evaluación',
  condicionado: 'Condicionado',
  apto: 'Apto',
  destacado: 'Destacado',
  no_apto: 'No apto',
  adjudicado: 'Adjudicado',
  descalificada: 'Descalificado',
  retirada: 'Retirado',
}

const ESTADO_BADGE: Record<string, string> = {
  registro: 'bg-gray-100 text-gray-700',
  en_revision: 'bg-yellow-100 text-yellow-800',
  incompleto: 'bg-orange-100 text-orange-800',
  en_subsanacion: 'bg-orange-100 text-orange-800',
  en_validacion: 'bg-blue-100 text-blue-800',
  habilitada: 'bg-sky-100 text-sky-800',
  en_evaluacion: 'bg-purple-100 text-purple-800',
  condicionado: 'bg-indigo-100 text-indigo-800',
  apto: 'bg-green-100 text-green-800',
  destacado: 'bg-emerald-100 text-emerald-800',
  adjudicado: 'bg-green-700 text-white',
  no_apto: 'bg-red-100 text-red-800',
  no_apto_legal: 'bg-red-100 text-red-800',
}

const PROCESO_ESTADO_COLOR: Record<string, string> = {
  configuracion: 'bg-gray-100 text-gray-800',
  abierto: 'bg-blue-100 text-blue-800',
  en_revision: 'bg-yellow-100 text-yellow-800',
  evaluacion: 'bg-purple-100 text-purple-800',
  finalizado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
}

const PROCESO_ESTADO_LABEL: Record<string, string> = {
  configuracion: 'Configuración',
  abierto: 'Abierto',
  en_revision: 'En revisión',
  evaluacion: 'En evaluación',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
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
        setProceso(await res.json())
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{proceso.conjunto}</p>
                <h1 className="text-2xl font-bold tracking-tight">{proceso.nombre}</h1>
              </div>
            </div>
            <Badge className={`${PROCESO_ESTADO_COLOR[proceso.estado] ?? 'bg-gray-100 text-gray-800'} shrink-0`}>
              {PROCESO_ESTADO_LABEL[proceso.estado] ?? proceso.estado}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">

        {/* Fecha de inicio + candidatos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de inicio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{formatFecha(proceso.fecha_inicio)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Candidatos en evaluación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{proceso.total_candidatos}</p>
              <p className="text-sm text-muted-foreground">
                {proceso.total_candidatos === 1 ? 'candidato activo' : 'candidatos activos'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de candidatos */}
        {proceso.candidatos && proceso.candidatos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Candidatos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {proceso.candidatos.map((c, i) => (
                  <li key={i} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      {c.tipo_persona === 'juridica' ? (
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium truncate">{c.razon_social}</span>
                    </div>
                    <Badge className={`${ESTADO_BADGE[c.estado] ?? 'bg-gray-100 text-gray-700'} shrink-0 text-xs`}>
                      {ESTADO_LABEL[c.estado] ?? c.estado}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Criterios de selección */}
        {proceso.criterios && proceso.criterios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Criterios de selección
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proceso.criterios.map((criterio, i) => (
                  <li key={i} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{criterio.nombre}</p>
                      {criterio.descripcion && (
                        <p className="text-xs text-muted-foreground mt-0.5">{criterio.descripcion}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0">{criterio.peso}%</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta es una consulta pública del proceso de selección. Los detalles específicos de evaluación
            permanecen confidenciales conforme a la regulación de propiedad horizontal.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
