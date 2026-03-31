'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { useActiveProceso } from '@/hooks/use-active-proceso'
import { LABEL_ESTADO } from '@/lib/types/index'
import type { Propuesta, Proceso } from '@/lib/types/index'

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  habilitada:    { label: 'Apto legal',        cls: 'bg-emerald-500/10 text-emerald-700' },
  en_evaluacion: { label: 'Apto legal',        cls: 'bg-emerald-500/10 text-emerald-700' },
  no_apto_legal: { label: 'No apto (bloquea)', cls: 'bg-destructive/10 text-destructive' },
  en_revision:   { label: 'Pendiente',         cls: 'bg-amber-500/10 text-amber-700' },
  en_validacion: { label: 'En validación',     cls: 'bg-blue-500/10 text-blue-700' },
  incompleto:    { label: 'Incompleto',        cls: 'bg-amber-500/10 text-amber-700' },
}

function badgeForPropuesta(p: Propuesta) {
  return ESTADO_BADGE[p.estado] ?? { label: LABEL_ESTADO[p.estado] ?? p.estado, cls: 'bg-muted/50 text-muted-foreground' }
}

export default function ValidacionLegalAdmin() {
  const { procesos, loading: loadingProceso, error: errorProceso, conjunto } = useActiveProceso()
  const [selectedProcesoId, setSelectedProcesoId] = useState<string>('')
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProceso, setSelectedProceso] = useState<Proceso | null>(null)

  useEffect(() => {
    if (procesos.length > 0 && !selectedProcesoId) {
      const active =
        procesos.find((p) => ['configuracion', 'evaluacion', 'votacion'].includes(p.estado)) ??
        procesos[0]
      setSelectedProcesoId(active.id)
      setSelectedProceso(active)
    }
  }, [procesos, selectedProcesoId])

  const handleProcesosChange = (procesoId: string) => {
    setSelectedProcesoId(procesoId)
    const proceso = procesos.find((p) => p.id === procesoId)
    setSelectedProceso(proceso ?? null)
  }

  useEffect(() => {
    if (!selectedProcesoId) return
    const fetchPropuestas = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/propuestas?proceso_id=${selectedProcesoId}`)
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error ?? 'Error al cargar propuestas')
        }
        setPropuestas(await res.json())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    fetchPropuestas()
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Control legal</p>
          <h1 className="text-2xl tracking-tight">Validación Legal</h1>
          <p className="text-sm text-muted-foreground">
            SARLAFT, antecedentes, pólizas y paz y salvo. Bloqueo de avance si es No Apto.
          </p>
        </div>
        {procesos.length > 1 && (
          <Select value={selectedProcesoId} onValueChange={handleProcesosChange}>
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

      <Card>
        <CardHeader>
          <CardTitle>Estado por propuesta</CardTitle>
          <CardDescription>Debe quedar visible quién habilitó o rechazó cada candidato.</CardDescription>
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
          ) : propuestas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay propuestas para este proceso.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propuesta</TableHead>
                  <TableHead>NIT / Cédula</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cumple requisitos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propuestas.map((p) => {
                  const badge = badgeForPropuesta(p)
                  const isValidable = !['adjudicado', 'descalificada', 'retirada'].includes(p.estado)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">{p.razon_social}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{p.nit_cedula}</TableCell>
                      <TableCell className="capitalize">{p.tipo_persona}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            p.cumple_requisitos_legales
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : 'bg-destructive/10 text-destructive'
                          }
                        >
                          {p.cumple_requisitos_legales ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badge.cls}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                        {p.observaciones_legales ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isValidable && selectedProceso && conjunto ? (
                          <a
                            href={`/admin/conjuntos/${conjunto.id}/procesos/${selectedProceso.id}/validacion-legal?propuestaId=${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm" className="gap-1.5">
                              <ExternalLink className="h-4 w-4" />
                              Editar
                            </Button>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Transparencia: registre quién validó, fecha y observaciones. Si es No Apto, la propuesta no continúa a Evaluación ni Votación.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
