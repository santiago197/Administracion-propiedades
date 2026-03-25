'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { useActiveProceso } from '@/hooks/use-active-proceso'
import type { Consejero, Voto, Propuesta } from '@/lib/types/index'

type FilaVoto = {
  consejero: Consejero
  voto: Voto | null
  propuesta: Propuesta | null
}

export default function VotacionConsejoPage() {
  const { conjunto, procesos, loading: loadingProceso, error: errorProceso } = useActiveProceso()
  const [selectedProcesoId, setSelectedProcesoId] = useState<string>('')
  const [filas, setFilas] = useState<FilaVoto[]>([])
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

  useEffect(() => {
    if (!selectedProcesoId || !conjunto) return
    const fetchData = async () => {
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

        setFilas(rows)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedProcesoId, conjunto])

  const votaron = filas.filter((f) => f.voto !== null).length
  const pendientes = filas.length - votaron

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
          <p className="text-sm text-muted-foreground">Participación del consejo</p>
          <h1 className="text-2xl tracking-tight">Votación Consejo</h1>
          <p className="text-sm text-muted-foreground">
            Muestra quién votó, a favor de quién y justificación. Visible y auditable.
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

      {/* Resumen */}
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
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
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

      <Card>
        <CardHeader>
          <CardTitle>Estado de votos</CardTitle>
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
            <Table>
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
                      {consejero.cargo.replace('_', ' ')}
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
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Registra quién falta por votar y justificación de cada voto. Requisito de trazabilidad Ley 675.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
