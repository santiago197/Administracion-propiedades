'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Loader2, Trophy, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useActiveProceso } from '@/hooks/use-active-proceso'
import type { ResultadoFinal } from '@/lib/types/index'

const CLAS_CLS: Record<string, string> = {
  destacado:    'bg-green-500/10 text-green-700 border-green-200',
  apto:         'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  condicionado: 'bg-orange-500/10 text-orange-700 border-orange-200',
  no_apto:      'bg-red-500/10 text-red-700 border-red-200',
}

const CLAS_LABEL: Record<string, string> = {
  destacado:    'Destacado',
  apto:         'Apto',
  condicionado: 'Condicionado',
  no_apto:      'No apto',
}

export default function RankingPage() {
  const { procesos, loading: loadingProceso, error: errorProceso } = useActiveProceso()
  const [selectedProcesoId, setSelectedProcesoId] = useState<string>('')
  const [resultados, setResultados] = useState<ResultadoFinal[]>([])
  const [loading, setLoading] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ultimoCalculo, setUltimoCalculo] = useState<Date | null>(null)

  // Seleccionar proceso activo al cargar
  useEffect(() => {
    if (procesos.length > 0 && !selectedProcesoId) {
      const active =
        procesos.find((p) => ['evaluacion', 'votacion', 'finalizado'].includes(p.estado)) ??
        procesos[0]
      setSelectedProcesoId(active.id)
    }
  }, [procesos, selectedProcesoId])

  const cargarResultados = useCallback(async (procesoId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/resultados?proceso_id=${procesoId}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al cargar resultados')
      }
      setResultados(await res.json())
      setUltimoCalculo(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const recalcularYCargar = useCallback(async (procesoId: string) => {
    setRecalculando(true)
    setError(null)
    try {
      // 1. Recalcular puntajes en la BD
      const res = await fetch(`/api/resultados?proceso_id=${procesoId}`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al recalcular')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al recalcular')
      setRecalculando(false)
      return
    } finally {
      setRecalculando(false)
    }
    // 2. Leer resultados frescos
    await cargarResultados(procesoId)
  }, [cargarResultados])

  // Recalcular automáticamente cuando cambia el proceso
  useEffect(() => {
    if (!selectedProcesoId) return
    recalcularYCargar(selectedProcesoId)
  }, [selectedProcesoId, recalcularYCargar])

  const maxPuntaje = resultados.length > 0 ? Math.max(...resultados.map((r) => r.puntaje_final), 1) : 100

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

  const ocupado = recalculando || loading

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Resultado ponderado</p>
          <h1 className="text-2xl tracking-tight">Ranking</h1>
          <p className="text-sm text-muted-foreground">
            Clasificación automática por puntaje de evaluación + votos del consejo.
          </p>
          {ultimoCalculo && !ocupado && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Actualizado {ultimoCalculo.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {procesos.length > 1 && (
            <Select value={selectedProcesoId} onValueChange={setSelectedProcesoId}>
              <SelectTrigger className="w-44 sm:w-56">
                <SelectValue placeholder="Selecciona proceso" />
              </SelectTrigger>
              <SelectContent>
                {procesos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={ocupado || !selectedProcesoId}
            onClick={() => recalcularYCargar(selectedProcesoId)}
            className="gap-2"
          >
            {ocupado ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {recalculando ? 'Recalculando…' : 'Recalcular'}
          </Button>
        </div>
      </div>

      {/* Top 3 */}
      {resultados.length >= 2 && (
        <div className="grid gap-4 md:grid-cols-3">
          {resultados.slice(0, 3).map((r, i) => (
            <Card key={r.propuesta_id} className={i === 0 ? 'border-amber-400/60 shadow-md' : ''}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    i === 0 ? 'bg-amber-500 text-white' :
                    i === 1 ? 'bg-slate-400 text-white' :
                    'bg-amber-700/70 text-white'
                  }`}>
                    {i === 0 ? <Trophy className="h-5 w-5" /> : `#${i + 1}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{r.razon_social}</p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-2xl font-black text-primary tabular-nums">{r.puntaje_final.toFixed(1)}</p>
                      {r.clasificacion && (
                        <Badge className={CLAS_CLS[r.clasificacion] ?? ''} variant="outline">
                          {CLAS_LABEL[r.clasificacion] ?? r.clasificacion}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Progress value={(r.puntaje_final / maxPuntaje) * 100} className="mt-3 h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Eval: {r.puntaje_evaluacion.toFixed(1)}</span>
                  <span>Votos: {r.votos_recibidos}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabla completa */}
      <Card>
        <CardHeader>
          <CardTitle>Tabla ordenada por puntaje final</CardTitle>
          <CardDescription>
            Puntaje final = evaluación técnica × peso_eval + (votos / total_consejeros × 100) × peso_voto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ocupado ? (
            <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">{recalculando ? 'Recalculando puntajes…' : 'Cargando resultados…'}</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : resultados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay resultados disponibles para este proceso.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead className="text-right">Eval. (0–100)</TableHead>
                  <TableHead className="text-right">Votos</TableHead>
                  <TableHead className="text-right">Puntaje final</TableHead>
                  <TableHead>Clasificación</TableHead>
                  <TableHead className="w-24">Barra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultados.map((r, idx) => (
                  <TableRow key={r.propuesta_id} className={idx === 0 ? 'bg-amber-500/5' : ''}>
                    <TableCell>
                      {idx === 0 ? (
                        <Trophy className="h-4 w-4 text-amber-500" />
                      ) : (
                        <span className="text-muted-foreground tabular-nums">{idx + 1}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{r.razon_social}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.puntaje_evaluacion.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.votos_recibidos}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-primary tabular-nums">{r.puntaje_final.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      {r.clasificacion ? (
                        <Badge className={CLAS_CLS[r.clasificacion] ?? ''} variant="outline">
                          {CLAS_LABEL[r.clasificacion] ?? r.clasificacion}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Progress value={(r.puntaje_final / maxPuntaje) * 100} className="h-1.5 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Umbrales de clasificación: Destacado ≥85 · Apto ≥70 · Condicionado ≥55 · No apto &lt;55
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
