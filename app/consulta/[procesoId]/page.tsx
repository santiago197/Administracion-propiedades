'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Vote,
  ClipboardList,
  Megaphone,
  Info,
} from 'lucide-react'

// Datos mock para el panel público
const mockProceso = {
  conjunto: 'Conjunto Residencial Los Pinos',
  nombre: 'Selección Administrador 2025',
  etapa: 'evaluacion',
  fechaInicio: '2025-01-15',
  fechaEstimadaFin: '2025-02-28',
  totalCandidatos: 5,
  evaluacionesCompletadas: 60,
  votacionCompletada: 0,
}

const mockCronograma = [
  { fecha: '2025-01-15', evento: 'Apertura de convocatoria', completado: true },
  { fecha: '2025-01-25', evento: 'Cierre de recepción de propuestas', completado: true },
  { fecha: '2025-01-28', evento: 'Inicio de evaluación técnica', completado: true },
  { fecha: '2025-02-10', evento: 'Cierre de evaluación técnica', completado: false },
  { fecha: '2025-02-15', evento: 'Inicio de votación del consejo', completado: false },
  { fecha: '2025-02-20', evento: 'Cierre de votación', completado: false },
  { fecha: '2025-02-28', evento: 'Publicación de resultados', completado: false },
]

const mockComunicados = [
  {
    id: 1,
    fecha: '2025-01-28',
    titulo: 'Inicio del proceso de evaluación',
    mensaje: 'Informamos a la comunidad que el consejo de administración ha iniciado la fase de evaluación técnica de las propuestas recibidas.',
  },
  {
    id: 2,
    fecha: '2025-01-25',
    titulo: 'Cierre de convocatoria',
    mensaje: 'Se cierra la recepción de propuestas con un total de 5 candidatos postulados. Agradecemos a todos los participantes.',
  },
  {
    id: 3,
    fecha: '2025-01-15',
    titulo: 'Apertura del proceso de selección',
    mensaje: 'El consejo de administración comunica la apertura oficial del proceso de selección de administrador para el periodo 2025-2026.',
  },
]

const ETAPAS = {
  convocatoria: { label: 'Convocatoria', color: 'bg-blue-500' },
  recepcion: { label: 'Recepción de propuestas', color: 'bg-purple-500' },
  evaluacion: { label: 'Evaluación técnica', color: 'bg-amber-500' },
  votacion: { label: 'Votación', color: 'bg-indigo-500' },
  finalizado: { label: 'Finalizado', color: 'bg-green-500' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function ConsultaPublicaPage() {
  const proceso = mockProceso
  const cronograma = mockCronograma
  const comunicados = mockComunicados
  const etapaInfo = ETAPAS[proceso.etapa as keyof typeof ETAPAS] || ETAPAS.convocatoria

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header institucional */}
      <header className="border-b bg-background">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{proceso.conjunto}</h1>
              <p className="text-sm text-muted-foreground">{proceso.nombre}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="space-y-6">
          {/* Aviso informativo */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Panel de consulta pública</p>
              <p className="text-sm text-blue-700 mt-1">
                Este espacio permite a los copropietarios consultar el estado general del proceso de selección de administrador. 
                La información detallada de candidatos y evaluaciones es confidencial.
              </p>
            </div>
          </div>

          {/* Estado del proceso */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Estado del Proceso</CardTitle>
              </div>
              <CardDescription>Información general sobre el estado actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Etapa actual</p>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${etapaInfo.color}`} />
                    <span className="font-medium">{etapaInfo.label}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Fecha de inicio</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatDate(proceso.fechaInicio)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Fecha estimada de cierre</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatDate(proceso.fechaEstimadaFin)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progreso */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Progreso del Proceso</CardTitle>
              </div>
              <CardDescription>Avance general de las etapas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                {/* Candidatos */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{proceso.totalCandidatos}</p>
                      <p className="text-xs text-muted-foreground">Candidatos</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Propuestas recibidas y en evaluación
                  </p>
                </div>

                {/* Evaluaciones */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{proceso.evaluacionesCompletadas}%</p>
                      <p className="text-xs text-muted-foreground">Evaluación</p>
                    </div>
                  </div>
                  <Progress value={proceso.evaluacionesCompletadas} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Evaluación técnica en curso
                  </p>
                </div>

                {/* Votación */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                      <Vote className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{proceso.votacionCompletada}%</p>
                      <p className="text-xs text-muted-foreground">Votación</p>
                    </div>
                  </div>
                  <Progress value={proceso.votacionCompletada} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {proceso.votacionCompletada === 0 ? 'Pendiente de iniciar' : 'Votación en curso'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cronograma y Comunicados */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cronograma */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Cronograma</CardTitle>
                </div>
                <CardDescription>Fechas clave del proceso</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cronograma.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        item.completado 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.completado ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium ${
                            item.completado ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {item.evento}
                          </p>
                          {item.completado && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              Completado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(item.fecha)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Comunicados */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Comunicados</CardTitle>
                </div>
                <CardDescription>Mensajes del consejo de administración</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comunicados.map((comunicado) => (
                    <div key={comunicado.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-medium">{comunicado.titulo}</h4>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {formatDate(comunicado.fecha)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {comunicado.mensaje}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer informativo */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>
              Para más información, comuníquese con el consejo de administración.
            </p>
            <p className="mt-1">
              Proceso regido por la Ley 675 de 2001.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
