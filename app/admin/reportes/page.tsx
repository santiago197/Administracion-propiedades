'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, AlertCircle, Trophy } from 'lucide-react'
import { useActiveProceso } from '@/hooks/use-active-proceso'
import type { ResultadoFinal, Proceso } from '@/lib/types/index'

export default function ReportesPage() {
  const { procesos, loading: loadingProceso, error: errorProceso } = useActiveProceso()
  const [selectedProcesoId, setSelectedProcesoId] = useState<string>('')
  const [selectedProceso, setSelectedProceso] = useState<Proceso | null>(null)
  const [resultados, setResultados] = useState<ResultadoFinal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (procesos.length > 0 && !selectedProcesoId) {
      const active =
        procesos.find((p) => ['evaluacion', 'votacion', 'finalizado'].includes(p.estado)) ??
        procesos[0]
      setSelectedProcesoId(active.id)
      setSelectedProceso(active)
    }
  }, [procesos, selectedProcesoId])

  useEffect(() => {
    const proc = procesos.find((p) => p.id === selectedProcesoId) ?? null
    setSelectedProceso(proc)
  }, [selectedProcesoId, procesos])

  useEffect(() => {
    if (!selectedProcesoId) return
    const fetchResultados = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/resultados?proceso_id=${selectedProcesoId}`)
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error ?? 'Error al cargar resultados')
        }
        setResultados(await res.json())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    fetchResultados()
  }, [selectedProcesoId])

  if (loadingProceso) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (errorProceso) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {errorProceso}
      </div>
    )
  }

  const top3 = resultados.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Exportable / Auditoría</p>
          <h1 className="text-2xl tracking-tight">Informes y Auditoría</h1>
          <p className="text-sm text-muted-foreground">
            Resume criterios, puntajes, ranking final, votos y trazabilidad Ley 675.
          </p>
        </div>
        {procesos.length > 1 && (
          <Select value={selectedProcesoId} onValueChange={setSelectedProcesoId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecciona proceso" />
            </SelectTrigger>
            <SelectContent>
              {procesos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Resumen del proceso */}
            <Card>
              <CardHeader>
                <CardTitle>Proceso</CardTitle>
                <CardDescription>Resumen del proceso seleccionado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedProceso ? (
                  <>
                    <p className="font-semibold">{selectedProceso.nombre}</p>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span>
                        Inicio:{' '}
                        {new Date(selectedProceso.fecha_inicio).toLocaleDateString('es-CO')}
                      </span>
                      {selectedProceso.fecha_fin && (
                        <span>
                          Cierre:{' '}
                          {new Date(selectedProceso.fecha_fin).toLocaleDateString('es-CO')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Estado:</span>
                      <Badge variant="outline" className="capitalize">
                        {selectedProceso.estado}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Peso evaluación: {selectedProceso.peso_evaluacion}%</span>
                      <span>Peso votación: {selectedProceso.peso_votacion}%</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin proceso seleccionado.</p>
                )}
              </CardContent>
            </Card>

            {/* Top 3 */}
            <Card>
              <CardHeader>
                <CardTitle>Ranking final</CardTitle>
                <CardDescription>Top 3 por puntaje final</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {top3.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin resultados disponibles.</p>
                ) : (
                  top3.map((r, idx) => (
                    <div
                      key={r.propuesta_id}
                      className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-card flex items-center justify-center font-bold shrink-0">
                          {idx === 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : `#${idx + 1}`}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{r.razon_social}</p>
                          <p className="text-xs text-muted-foreground">Votos: {r.votos_recibidos}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-base font-semibold tabular-nums">
                        {r.puntaje_final.toFixed(2)}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabla completa */}
          {resultados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Trazabilidad de puntajes</CardTitle>
                <CardDescription>Puntajes de evaluación, votos y clasificación por candidato.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Candidato</TableHead>
                      <TableHead className="text-right">Evaluación</TableHead>
                      <TableHead className="text-right">Votos</TableHead>
                      <TableHead className="text-right">Puntaje final</TableHead>
                      <TableHead>Semáforo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultados.map((r, idx) => (
                      <TableRow key={r.propuesta_id} className={idx === 0 ? 'bg-amber-500/5' : ''}>
                        <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{r.razon_social}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.puntaje_evaluacion.toFixed(1)}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.votos_recibidos}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-primary tabular-nums">{r.puntaje_final.toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          {r.estado_semaforo && (
                            <Badge
                              variant="outline"
                              className={
                                r.estado_semaforo === 'verde'
                                  ? 'bg-green-500/10 text-green-700'
                                  : r.estado_semaforo === 'amarillo'
                                  ? 'bg-amber-500/10 text-amber-700'
                                  : 'bg-destructive/10 text-destructive'
                              }
                            >
                              {r.estado_semaforo.toUpperCase()}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 text-xs text-muted-foreground">
                  Esta vista debe ser exportable (PDF) para auditoría y cumplimiento Ley 675.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
