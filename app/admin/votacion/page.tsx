'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Loader2, AlertCircle, CheckCircle2, Clock, Trophy, RefreshCw, Users } from 'lucide-react'
import { useActiveProceso } from '@/hooks/use-active-proceso'
import type { Consejero, Voto, Propuesta } from '@/lib/types/index'

type FilaVoto = {
  consejero: Consejero
  voto: Voto | null
  propuesta: Propuesta | null
}

type ResultadoVotos = {
  propuesta_id: string
  razon_social: string
  votos: number
  puntaje_evaluacion: number
  puntaje_final: number
  clasificacion?: string | null
}

const CLAS_CLS: Record<string, string> = {
  destacado:    'bg-green-500/10 text-green-700 border-green-200',
  apto:         'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  condicionado: 'bg-orange-500/10 text-orange-700 border-orange-200',
  no_apto:      'bg-red-500/10 text-red-700 border-red-200',
}

const CLAS_LABEL: Record<string, string> = {
  destacado: 'Destacado',
  apto: 'Apto',
  condicionado: 'Condicionado',
  no_apto: 'No apto',
}

export default function VotacionConsejoPage() {
  const { conjunto, procesos, loading: loadingProceso, error: errorProceso } = useActiveProceso()
  const [selectedProcesoId, setSelectedProcesoId] = useState<string>('')
  const [filas, setFilas] = useState<FilaVoto[]>([])
  const [resultados, setResultados] = useState<ResultadoVotos[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (procesos.length > 0 && !selectedProcesoId) {
      const active =
        procesos.find((p) => ['votacion', 'evaluacion', 'finalizado'].includes(p.estado)) ??
        procesos[0]
      setSelectedProcesoId(active.id)
    }
  }, [procesos, selectedProcesoId])

  const fetchData = useCallback(async () => {
    if (!selectedProcesoId || !conjunto) return
    setLoading(true)
    setError(null)
    try {
      const [consRes, votRes, propRes] = await Promise.all([
        fetch(`/api/consejeros?conjunto_id=${conjunto.id}`),
        fetch(`/api/votos?proceso_id=${selectedProcesoId}`),
        fetch(`/api/propuestas?proceso_id=${selectedProcesoId}`),
      ])
      if (!consRes.ok) throw new Error('Error al cargar consejeros')
      if (!votRes.ok) throw new Error('Error al cargar votos')
      if (!propRes.ok) throw new Error('Error al cargar propuestas')

      const consejeros: Consejero[] = await consRes.json()
      const votos: Voto[] = await votRes.json()
      const propuestas: Propuesta[] = await propRes.json()

      const propuestasMap = new Map(propuestas.map((p) => [p.id, p]))

      const rows: FilaVoto[] = consejeros
        .filter((c) => c.activo)
        .map((c) => {
          const voto = votos.find((v) => v.consejero_id === c.id) ?? null
          const propuesta = voto ? (propuestasMap.get(voto.propuesta_id) ?? null) : null
          return { consejero: c, voto, propuesta }
        })

      // Calcular votos por propuesta
      const votosPorPropuesta: Record<string, number> = {}
      for (const v of votos) {
        votosPorPropuesta[v.propuesta_id] = (votosPorPropuesta[v.propuesta_id] ?? 0) + 1
      }

      // Propuestas habilitadas para ranking
      const propuestasRanking = propuestas
        .filter((p) =>
          ['en_evaluacion', 'apto', 'condicionado', 'destacado', 'no_apto', 'adjudicado'].includes(
            p.estado ?? ''
          )
        )
        .map((p) => ({
          propuesta_id: p.id,
          razon_social: p.razon_social,
          votos: votosPorPropuesta[p.id] ?? 0,
          puntaje_evaluacion: Number((p as any).puntaje_evaluacion ?? 0),
          puntaje_final: Number((p as any).puntaje_final ?? 0),
          clasificacion: (p as any).clasificacion ?? null,
        }))
        .sort((a, b) => b.votos - a.votos || b.puntaje_final - a.puntaje_final)

      setFilas(rows)
      setResultados(propuestasRanking)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [selectedProcesoId, conjunto])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const votaron = filas.filter((f) => f.voto !== null).length
  const pendientes = filas.length - votaron
  const ganador = resultados[0] ?? null
  const maxVotos = Math.max(...resultados.map((r) => r.votos), 1)

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Participación del consejo</p>
          <h1 className="text-2xl tracking-tight">Votación Consejo</h1>
          <p className="text-sm text-muted-foreground">
            Resultado de votos y seguimiento de participación. Auditable bajo Ley 675.
          </p>
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
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualizar
          </Button>
        </div>
      </div>

      {/* Resumen de participación */}
      {filas.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{votaron}</p>
              <p className="text-xs text-muted-foreground">Votaron</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{pendientes}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted shrink-0">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {filas.length > 0 ? Math.round((votaron / filas.length) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Participación</p>
            </div>
          </Card>
        </div>
      )}

      {/* Resultado por propuesta */}
      {resultados.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Resultado de la votación
            </CardTitle>
            <CardDescription>
              Ordenado por votos recibidos. En empate prevalece el puntaje final.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Ganador destacado */}
            {ganador && votaron > 0 && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-700 font-medium uppercase tracking-wide mb-0.5">
                    Propuesta más votada
                  </p>
                  <p className="font-bold text-lg truncate">{ganador.razon_social}</p>
                  <p className="text-sm text-muted-foreground">
                    {ganador.votos} voto{ganador.votos !== 1 ? 's' : ''}
                    {' · '}
                    Puntaje final: {ganador.puntaje_final.toFixed(1)}
                    {ganador.clasificacion && (
                      <>
                        {' · '}
                        <span className="font-medium">{CLAS_LABEL[ganador.clasificacion] ?? ganador.clasificacion}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Tabla de resultados */}
            <div className="space-y-2 pt-1">
              {resultados.map((r, idx) => (
                <div key={r.propuesta_id} className="flex items-center gap-3">
                  <span className="text-sm font-bold w-6 text-center text-muted-foreground shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{r.razon_social}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.clasificacion && (
                          <Badge className={CLAS_CLS[r.clasificacion] ?? ''} variant="outline">
                            {CLAS_LABEL[r.clasificacion] ?? r.clasificacion}
                          </Badge>
                        )}
                        <span className="text-sm font-bold tabular-nums">
                          {r.votos} voto{r.votos !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={maxVotos > 0 ? (r.votos / maxVotos) * 100 : 0}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-20 text-right">
                        Eval: {r.puntaje_evaluacion.toFixed(1)} · F: {r.puntaje_final.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {votaron === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Aún no se han registrado votos.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla de consejeros */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de votos por consejero</CardTitle>
          <CardDescription>Valida quorum y pendientes antes de cerrar el proceso.</CardDescription>
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
          ) : filas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay consejeros activos para este proceso.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
            <Table className="min-w-[480px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Consejero</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Propuesta votada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map(({ consejero, voto, propuesta }) => (
                  <TableRow key={consejero.id}>
                    <TableCell className="font-semibold">{consejero.nombre_completo}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {consejero.cargo?.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      {propuesta ? (
                        <span>{propuesta.razon_social}</span>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          voto
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'bg-amber-500/10 text-amber-700'
                        }
                      >
                        {voto ? 'Votó' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {voto
                        ? new Date(voto.created_at).toLocaleDateString('es-CO')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Registra quién falta por votar. Requisito de trazabilidad Ley 675.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
