'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Proceso } from '@/lib/types'

const estadoClase: Record<string, string> = {
  configuracion: 'bg-amber-500/10 text-amber-700',
  evaluacion: 'bg-sky-500/10 text-sky-700',
  votacion: 'bg-emerald-500/10 text-emerald-700',
  finalizado: 'bg-muted text-muted-foreground',
  cancelado: 'bg-destructive/10 text-destructive',
}

const etapas = ['Configuración', 'Documentación', 'Validación legal', 'Evaluación', 'Votación', 'Finalizado']

function estadoToDateLabel(proceso: Proceso) {
  return new Date(proceso.fecha_inicio).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function ProcesosPage() {
  const [loading, setLoading] = useState(true)
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [conjuntoId, setConjuntoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProcesos = async () => {
      try {
        setLoading(true)
        const conjuntoRes = await fetch('/api/conjuntos')
        if (!conjuntoRes.ok) throw new Error('No se pudo obtener el conjunto')
        const conjunto = await conjuntoRes.json()
        if (!conjunto?.id) throw new Error('No hay conjunto asociado')
        setConjuntoId(conjunto.id)

        const procesosRes = await fetch(`/api/procesos?conjunto_id=${conjunto.id}`)
        if (!procesosRes.ok) {
          const body = await procesosRes.json()
          throw new Error(body.error ?? 'No se pudieron cargar los procesos')
        }
        const data = await procesosRes.json()
        setProcesos(data ?? [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchProcesos()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Gestión de procesos</p>
          <h1 className="text-2xl font-semibold tracking-tight">Procesos de Selección</h1>
        </div>
        <Link href={conjuntoId ? `/admin/conjuntos/${conjuntoId}/nuevo-proceso` : '/admin/procesos/nuevo'}>
          <Button disabled={!conjuntoId}>Crear proceso</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Procesos persistidos en base de datos para el conjunto activo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-8 text-sm text-muted-foreground">Cargando procesos...</div>
          ) : error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : procesos.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">No hay procesos registrados.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proceso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ponderación</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Timeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procesos.map((proceso) => (
                  <TableRow key={proceso.id}>
                    <TableCell className="font-medium">{proceso.nombre}</TableCell>
                    <TableCell>
                      <Badge className={estadoClase[proceso.estado] ?? ''} variant="outline">
                        {proceso.estado.charAt(0).toUpperCase() + proceso.estado.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{proceso.peso_evaluacion}% / {proceso.peso_votacion}%</TableCell>
                    <TableCell>{estadoToDateLabel(proceso)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        {etapas.map((etapa, index) => {
                          const activeIndex =
                            proceso.estado === 'configuracion' ? 0 :
                            proceso.estado === 'evaluacion' ? 3 :
                            proceso.estado === 'votacion' ? 4 :
                            proceso.estado === 'finalizado' ? 5 : -1
                          const isActive = index <= activeIndex
                          const isCurrent = index === activeIndex
                          return (
                            <div key={`${proceso.id}-${etapa}`} className="flex items-center gap-1">
                              <div
                                className={`h-2.5 w-2.5 rounded-full ${
                                  isActive ? 'bg-primary' : 'bg-muted-foreground/20'
                                } ${isCurrent ? 'ring-2 ring-primary/50' : ''}`}
                                title={etapa}
                              />
                              {index < etapas.length - 1 && (
                                <div className={`h-0.5 w-4 ${isActive ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground">
            La votación se habilita cuando las evaluaciones están completas para el proceso activo.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
