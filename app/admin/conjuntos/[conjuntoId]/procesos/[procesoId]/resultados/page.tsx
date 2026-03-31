'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, TrendingUp, CheckCircle2, XCircle, AlertCircle, RefreshCw, FileDown } from 'lucide-react'
import type { ResultadoFinal, ProcesoStats, FilaMatrizEvaluacion } from '@/lib/types/index'
import { LABEL_CLASIFICACION } from '@/lib/types/index'

export default function PaginaResultados() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string
  const procesoId = params.procesoId as string

  const [resultados, setResultados] = useState<ResultadoFinal[]>([])
  const [stats, setStats] = useState<ProcesoStats | null>(null)
  const [matriz, setMatriz] = useState<FilaMatrizEvaluacion[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculando, setRecalculando] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)

  const fetchData = async () => {
    try {
      const [resRes, statsRes, matrizRes] = await Promise.all([
        fetch(`/api/resultados?proceso_id=${procesoId}`),
        fetch(`/api/resultados?proceso_id=${procesoId}&type=stats`),
        fetch(`/api/resultados?proceso_id=${procesoId}&type=matriz`),
      ])
      if (resRes.ok) setResultados((await resRes.json()) || [])
      if (statsRes.ok) setStats(await statsRes.json())
      if (matrizRes.ok) setMatriz((await matrizRes.json()) || [])
    } catch (error) {
      console.error('[resultados] Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [procesoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerarActa = async () => {
    setGenerandoPDF(true)
    try {
      const res = await fetch(`/api/resultados?proceso_id=${procesoId}&type=acta`)
      if (!res.ok) throw new Error('Error al obtener datos del acta')
      const datos = await res.json()
      const { generarActaPDF } = await import('@/lib/pdf/generar-acta')
      generarActaPDF(datos)
    } catch (error) {
      console.error('[acta] Error generando PDF:', error)
    } finally {
      setGenerandoPDF(false)
    }
  }

  const handleRecalcular = async () => {
    setRecalculando(true)
    try {
      await fetch(`/api/resultados?proceso_id=${procesoId}`, { method: 'POST' })
      await fetchData()
    } catch (error) {
      console.error('[resultados] Error recalculando:', error)
    } finally {
      setRecalculando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-20 animate-pulse bg-card/50" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>

        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">Resultados Finales</h1>
            <p className="text-muted-foreground">
              Ranking de propuestas basado en evaluación y votación
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRecalcular}
              disabled={recalculando}
              className="gap-2 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${recalculando ? 'animate-spin' : ''}`} />
              {recalculando ? 'Recalculando...' : 'Recalcular puntajes'}
            </Button>
            <Button
              onClick={handleGenerarActa}
              disabled={generandoPDF || resultados.length === 0}
              className="gap-2 shrink-0"
            >
              <FileDown className={`h-4 w-4 ${generandoPDF ? 'animate-pulse' : ''}`} />
              {generandoPDF ? 'Generando...' : 'Generar Acta PDF'}
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mb-8">
            <Card className="border border-border/50 bg-card/50 p-6">
              <p className="text-sm text-muted-foreground mb-2">Consejeros Totales</p>
              <p className="text-3xl font-bold text-foreground">{stats.total_consejeros}</p>
            </Card>
            <Card className="border border-border/50 bg-card/50 p-6">
              <p className="text-sm text-muted-foreground mb-2">Evaluaciones Completadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.evaluaciones_completadas}</p>
            </Card>
            <Card className="border border-border/50 bg-card/50 p-6">
              <p className="text-sm text-muted-foreground mb-2">Votaciones Completadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.votaciones_completadas}</p>
            </Card>
            <Card className="border border-border/50 bg-card/50 p-6">
              <p className="text-sm text-muted-foreground mb-2">Propuestas Activas</p>
              <p className="text-3xl font-bold text-foreground">{stats.propuestas_activas}</p>
            </Card>
          </div>
        )}

        <Tabs defaultValue="resumen">
          <TabsList className="mb-6">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="matriz">Matriz de Evaluación</TabsTrigger>
          </TabsList>

          {/* ── TAB RESUMEN ── */}
          <TabsContent value="resumen">
            {resultados.length > 0 ? (
              <div className="space-y-4">
                {resultados.map((resultado) => (
                  <Card
                    key={resultado.propuesta_id}
                    className="border border-border/50 bg-card/50 p-6 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-muted font-bold text-lg">
                            #{resultado.posicion}
                          </div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {resultado.razon_social}
                          </h3>
                          <SemaforoBadge estado={resultado.estado_semaforo} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold mb-1">
                              PUNTAJE EVALUACIÓN
                            </p>
                            <p className="text-2xl font-bold text-foreground">
                              {Number(resultado.puntaje_evaluacion ?? 0).toFixed(1)}
                              <span className="text-sm font-normal text-muted-foreground">/100</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold mb-1">
                              VOTOS RECIBIDOS
                            </p>
                            <p className="text-2xl font-bold text-foreground">
                              {resultado.votos_recibidos ?? 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold mb-1">
                              PUNTAJE FINAL
                            </p>
                            <p className="text-2xl font-bold text-primary">
                              {Number(resultado.puntaje_final ?? 0).toFixed(1)}
                              <span className="text-sm font-normal text-muted-foreground">/100</span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-muted-foreground mb-2">
                            <span>Puntaje final</span>
                            <span>{Number(resultado.puntaje_final ?? 0).toFixed(1)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                resultado.estado_semaforo === 'verde'
                                  ? 'bg-green-500'
                                  : resultado.estado_semaforo === 'amarillo'
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(Number(resultado.puntaje_final ?? 0), 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed p-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No hay resultados disponibles aún. Asegúrate de que todos los consejeros hayan completado sus evaluaciones y votos.
                </p>
              </Card>
            )}
          </TabsContent>

          {/* ── TAB MATRIZ ── */}
          <TabsContent value="matriz">
            {matriz.length > 0 ? (
              <div className="space-y-8">
                {/* Tabla resumen */}
                <Card className="border border-border/50 overflow-hidden">
                  <div className="px-6 py-4 border-b bg-muted/30">
                    <h2 className="font-semibold text-foreground">Resumen por Candidato</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="text-left px-6 py-3 text-muted-foreground font-semibold">Candidato</th>
                          <th className="text-center px-4 py-3 text-muted-foreground font-semibold">Puntaje</th>
                          <th className="text-center px-4 py-3 text-muted-foreground font-semibold">Estado Final</th>
                          <th className="text-center px-4 py-3 text-muted-foreground font-semibold">Fecha Evaluación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matriz.map((fila) => (
                          <tr key={fila.propuesta_id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">{fila.razon_social}</td>
                            <td className="px-4 py-4 text-center">
                              <span className={`font-bold tabular-nums ${fila.puntaje_total >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                                {fila.puntaje_total}%
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <EstadoFinalBadge clasificacion={fila.clasificacion} puntaje={fila.puntaje_total} />
                            </td>
                            <td className="px-4 py-4 text-center text-muted-foreground">
                              {fila.fecha_evaluacion
                                ? new Date(fila.fecha_evaluacion).toLocaleDateString('es-CO', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                  })
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Detalle por candidato */}
                {matriz.map((fila) => (
                  <Card key={fila.propuesta_id} className="border border-border/50 overflow-hidden">
                    <div className="px-6 py-4 border-b bg-muted/30 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{fila.razon_social}</h3>
                        {fila.fecha_evaluacion && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Evaluado el{' '}
                            {new Date(fila.fecha_evaluacion).toLocaleDateString('es-CO', {
                              day: '2-digit', month: 'long', year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-black tabular-nums ${fila.puntaje_total >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                          {fila.puntaje_total}%
                        </span>
                        <EstadoFinalBadge clasificacion={fila.clasificacion} puntaje={fila.puntaje_total} />
                      </div>
                    </div>

                    {fila.criterios.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/10">
                              <th className="text-left px-6 py-3 text-muted-foreground font-semibold w-8">#</th>
                              <th className="text-left px-4 py-3 text-muted-foreground font-semibold">Criterio</th>
                              <th className="text-left px-4 py-3 text-muted-foreground font-semibold hidden md:table-cell">Descripción</th>
                              <th className="text-center px-4 py-3 text-muted-foreground font-semibold">Respuesta</th>
                              <th className="text-center px-4 py-3 text-muted-foreground font-semibold">Peso</th>
                              <th className="text-center px-4 py-3 text-muted-foreground font-semibold">Puntaje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fila.criterios.map((c, idx) => (
                              <tr
                                key={c.criterio_codigo}
                                className={`border-b last:border-0 ${c.respuesta ? '' : 'bg-red-50/30 dark:bg-red-950/10'}`}
                              >
                                <td className="px-6 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                                <td className="px-4 py-3 font-medium text-foreground">{c.nombre}</td>
                                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs leading-relaxed">{c.descripcion}</td>
                                <td className="px-4 py-3 text-center">
                                  {c.respuesta ? (
                                    <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-xs">
                                      <CheckCircle2 className="h-4 w-4" />
                                      Sí
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-red-500 font-semibold text-xs">
                                      <XCircle className="h-4 w-4" />
                                      No
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">{c.peso}%</td>
                                <td className={`px-4 py-3 text-center font-bold tabular-nums ${c.respuesta ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {c.puntaje}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t bg-muted/20">
                              <td colSpan={4} className="px-6 py-3 text-right font-semibold text-sm text-foreground">
                                Total
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-foreground tabular-nums">100%</td>
                              <td className={`px-4 py-3 text-center font-black text-lg tabular-nums ${fila.puntaje_total >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                                {fila.puntaje_total}%
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="px-6 py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">Este candidato aún no ha sido evaluado por el administrador.</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed p-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No hay evaluaciones de administrador registradas aún.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes de display
// ---------------------------------------------------------------------------

function SemaforoBadge({ estado }: { estado: 'verde' | 'amarillo' | 'rojo' }) {
  const map = {
    verde:    { label: '✓ Alto desempeño', cls: 'bg-green-500/20 text-green-700 dark:text-green-300' },
    amarillo: { label: '◐ Medio',          cls: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' },
    rojo:     { label: '✗ Bajo',           cls: 'bg-red-500/20 text-red-700 dark:text-red-300' },
  }
  const { label, cls } = map[estado]
  return <div className={`rounded-full px-4 py-1 text-sm font-semibold ${cls}`}>{label}</div>
}

function EstadoFinalBadge({
  clasificacion,
  puntaje,
}: {
  clasificacion: string | null
  puntaje: number
}) {
  if (!clasificacion) {
    const cumple = puntaje >= 60
    return (
      <Badge variant={cumple ? 'default' : 'destructive'} className={cumple ? 'bg-yellow-500 hover:bg-yellow-500' : ''}>
        {cumple ? 'Cumple, con observaciones' : 'Rechazado'}
      </Badge>
    )
  }

  const label = LABEL_CLASIFICACION[clasificacion as keyof typeof LABEL_CLASIFICACION] ?? clasificacion

  if (label === 'Cumple') {
    return <Badge className="bg-green-600 hover:bg-green-600">{label}</Badge>
  }
  if (label === 'Cumple, con observaciones') {
    return <Badge className="bg-yellow-500 hover:bg-yellow-500">{label}</Badge>
  }
  return <Badge variant="destructive">{label}</Badge>
}
