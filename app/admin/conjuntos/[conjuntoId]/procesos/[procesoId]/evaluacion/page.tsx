'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { PanelEvaluacion } from '@/components/admin/panel-evaluacion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Loader2,
  BarChart4,
  Trophy,
  CheckCircle2,
  Clock,
  Users,
  ChevronRight,
} from 'lucide-react'
import { LABEL_ESTADO } from '@/lib/types/index'
import type { Propuesta, ClasificacionPropuesta, EstadoPropuesta } from '@/lib/types/index'

// ---------------------------------------------------------------------------
// Constantes de presentación
// ---------------------------------------------------------------------------

const CLAS_BADGE: Record<ClasificacionPropuesta, string> = {
  destacado: 'bg-green-500/10 text-green-700 border-green-200',
  apto: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  condicionado: 'bg-orange-500/10 text-orange-700 border-orange-200',
  no_apto: 'bg-red-500/10 text-red-700 border-red-200',
}

const CLAS_LABEL: Record<ClasificacionPropuesta, string> = {
  destacado: 'Destacado',
  apto: 'Apto',
  condicionado: 'Condicionado',
  no_apto: 'No Apto',
}

const ESTADO_COLOR: Partial<Record<EstadoPropuesta, string>> = {
  en_evaluacion: 'bg-blue-500/10 text-blue-700',
  habilitada: 'bg-green-500/10 text-green-700',
  no_apto_legal: 'bg-red-500/10 text-red-700',
  incompleto: 'bg-amber-500/10 text-amber-700',
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function EvaluacionPage() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string
  const procesoId = params.procesoId as string

  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPropuesta, setSelectedPropuesta] = useState<Propuesta | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const fetchPropuestas = useCallback(async () => {
    try {
      const res = await fetch(`/api/propuestas?proceso_id=${procesoId}`)
      if (res.ok) setPropuestas(await res.json())
    } catch (err) {
      console.error('Error al cargar propuestas:', err)
    } finally {
      setLoading(false)
    }
  }, [procesoId])

  useEffect(() => { fetchPropuestas() }, [fetchPropuestas])

  const handleEvaluar = (p: Propuesta) => {
    setSelectedPropuesta(p)
    setPanelOpen(true)
  }

  const handleSaved = useCallback(() => {
    fetchPropuestas()
  }, [fetchPropuestas])

  // Propuestas ordenadas: primero por puntaje desc, luego las sin evaluar
  const sorted = [...propuestas].sort((a, b) => b.puntaje_evaluacion - a.puntaje_evaluacion)

  const evaluadas = propuestas.filter((p) => p.puntaje_evaluacion > 0).length
  const evaluables = propuestas.filter((p) => p.estado === 'en_evaluacion').length
  const pendientes = evaluables - evaluadas

  // ---------------------------------------------------------------------------
  // Renders
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8">

        {/* Volver */}
        <Link href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}`}>
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al Tablero
          </Button>
        </Link>

        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl flex items-center gap-2 sm:gap-3">
            <BarChart4 className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            Evaluación Técnica de Candidatos
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Califica a cada candidato según los criterios ponderados. Los puntajes se guardan automáticamente.
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 shrink-0">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{propuestas.length}</p>
              <p className="text-sm text-muted-foreground">Total candidatos</p>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 shrink-0">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{evaluadas}</p>
              <p className="text-sm text-muted-foreground">Evaluados</p>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/10 shrink-0">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.max(pendientes, 0)}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </Card>
        </div>

        {/* Tabla de candidatos */}
        {propuestas.length === 0 ? (
          <Card className="p-8 sm:p-16 text-center border-dashed">
            <BarChart4 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay candidatos registrados en este proceso.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-border/60">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="px-3 sm:px-4 py-3 w-8 sm:w-10">#</th>
                  <th className="px-3 sm:px-4 py-3">Candidato</th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-center hidden md:table-cell">Unidades</th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Estado</th>
                  <th className="px-3 sm:px-4 py-3 w-32 sm:w-44">Puntaje</th>
                  <th className="px-4 py-3 text-center w-36 hidden md:table-cell">Clasificación</th>
                  <th className="px-3 sm:px-4 py-3 text-right w-24 sm:w-32">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sorted.map((p, i) => {
                  const esLider = i === 0 && p.puntaje_evaluacion > 0
                  const evaluado = p.puntaje_evaluacion > 0
                  const evaluable = p.estado === 'en_evaluacion'
                  const estadoColor = ESTADO_COLOR[p.estado] ?? 'bg-muted/50 text-muted-foreground'

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-muted/20 transition-colors ${esLider ? 'bg-amber-500/5' : ''}`}
                    >
                      {/* Posición */}
                      <td className="px-4 py-4">
                        {esLider ? (
                          <Trophy className="h-5 w-5 text-amber-500" />
                        ) : (
                          <span className="text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                        )}
                      </td>

                      {/* Nombre */}
                      <td className="px-3 sm:px-4 py-4">
                        <p className="font-semibold leading-snug text-sm sm:text-base">{p.razon_social}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {p.nit_cedula}
                          {p.representante_legal && ` · ${p.representante_legal}`}
                        </p>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-4 text-center hidden sm:table-cell">
                        <Badge variant="outline" className="capitalize text-xs">
                          {p.tipo_persona}
                        </Badge>
                      </td>

                      {/* Unidades */}
                      <td className="px-4 py-4 text-center font-medium tabular-nums text-sm hidden md:table-cell">
                        {p.unidades_administradas.toLocaleString()}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-4 text-center hidden sm:table-cell">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoColor}`}>
                          {LABEL_ESTADO[p.estado]}
                        </span>
                      </td>

                      {/* Puntaje */}
                      <td className="px-4 py-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className={`font-bold tabular-nums ${evaluado ? 'text-primary' : 'text-muted-foreground'}`}>
                              {evaluado ? p.puntaje_evaluacion : '–'}
                            </span>
                            <span className="text-muted-foreground">/100</span>
                          </div>
                          <Progress value={Math.min(p.puntaje_evaluacion, 100)} className="h-1.5" />
                        </div>
                      </td>

                      {/* Clasificación */}
                      <td className="px-4 py-4 text-center hidden md:table-cell">
                        {p.clasificacion ? (
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${CLAS_BADGE[p.clasificacion]}`}>
                            {CLAS_LABEL[p.clasificacion]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Pendiente</span>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-4 text-right">
                        <Button
                          size="sm"
                          variant={evaluado ? 'outline' : 'default'}
                          onClick={() => handleEvaluar(p)}
                          disabled={!evaluable}
                          className="gap-1.5"
                        >
                          {evaluado ? 'Re-evaluar' : 'Evaluar'}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Footer informativo */}
            <div className="px-6 py-3 bg-muted/30 border-t border-border/60 text-xs text-muted-foreground flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              El candidato con mayor puntaje aparece destacado. Solo candidatos en estado
              <span className="font-medium text-foreground mx-1">"En Evaluación"</span>
              pueden ser calificados.
            </div>
          </Card>
        )}

      </main>

      {/* Panel lateral de evaluación */}
      <PanelEvaluacion
        propuesta={selectedPropuesta}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onSaved={handleSaved}
      />
    </div>
  )
}
