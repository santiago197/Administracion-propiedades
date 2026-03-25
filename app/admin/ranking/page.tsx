'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Loader2, Trophy, AlertCircle } from 'lucide-react'
import { useActiveProceso } from '@/hooks/use-active-proceso'
import type { ResultadoFinal, Proceso } from '@/lib/types/index'

const SEMAFORO_CLS: Record<string, string> = {
  verde:   'bg-green-500/10 text-green-700',
  amarillo: 'bg-amber-500/10 text-amber-700',
  rojo:    'bg-destructive/10 text-destructive',
}

const CLAS_CLS: Record<string, string> = {
  destacado:  'bg-green-500/10 text-green-700 border-green-200',
  apto:       'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  condicionado: 'bg-orange-500/10 text-orange-700 border-orange-200',
  no_apto:    'bg-red-500/10 text-red-700 border-red-200',
}

export default function RankingPage() {
  const { procesos, loading: loadingProceso, error: errorProceso } = useActiveProceso()
  const [selectedProcesoId, setSelectedProcesoId] = useState<string>('')
  const [resultados, setResultados] = useState<ResultadoFinal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seleccionar proceso activo al cargar
  useEffect(() => {
    if (procesos.length > 0 && !selectedProcesoId) {
      const active =
        procesos.find((p) => ['evaluacion', 'votacion', 'finalizado'].includes(p.estado)) ??
        procesos[0]
      setSelectedProcesoId(active.id)
    }
  }, [procesos, selectedProcesoId])

  // Cargar ranking cuando cambia el proceso
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

  const maxPuntaje = resultados.length > 0 ? Math.max(...resultados.map((r) => r.puntaje_final)) : 100

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Resultado ponderado</p>
          <h1 className="text-2xl tracking-tight">Ranking</h1>
          <p className="text-sm text-muted-foreground">
            Clasificación automática por puntaje de evaluación + votos del consejo.
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
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{r.razon_social}</p>
                    <p className="text-2xl font-black text-primary tabular-nums">{r.puntaje_final.toFixed(1)}</p>
                  </div>
                </div>
                <Progress value={(r.puntaje_final / maxPuntaje) * 100} className="mt-3 h-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabla completa */}
      <Card>
        <CardHeader>
          <CardTitle>Tabla ordenada por puntaje final</CardTitle>
          <CardDescription>Incluye puntaje de evaluación, votos recibidos y clasificación.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead className="text-right">Eval.</TableHead>
                  <TableHead className="text-right">Votos</TableHead>
                  <TableHead className="text-right">Puntaje final</TableHead>
                  <TableHead>Clasificación</TableHead>
                  <TableHead>Estado</TableHead>
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
                    <TableCell className="text-right tabular-nums">{r.puntaje_evaluacion.toFixed(1)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.votos_recibidos}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-primary tabular-nums">{r.puntaje_final.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      {r.estado_semaforo && (
                        <Badge className={SEMAFORO_CLS[r.estado_semaforo] ?? ''} variant="outline">
                          {r.estado_semaforo.toUpperCase()}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Progress value={(r.puntaje_final / maxPuntaje) * 100} className="h-1.5 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Puntaje final = evaluación técnica ponderada + votos del consejo. Clasificación según umbrales: Destacado ≥85, Apto ≥70, Condicionado ≥55.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
