'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ClipboardList, ChevronRight, AlertCircle } from 'lucide-react'
import { useActiveProceso } from '@/hooks/use-active-proceso'
import type { EstadoProceso } from '@/lib/types/index'

const ESTADO_BADGE: Record<EstadoProceso, { label: string; cls: string }> = {
  configuracion: { label: 'Configuración', cls: 'bg-yellow-500/10 text-yellow-700' },
  evaluacion:    { label: 'En Evaluación', cls: 'bg-blue-500/10 text-blue-700' },
  votacion:      { label: 'Votación', cls: 'bg-purple-500/10 text-purple-700' },
  finalizado:    { label: 'Finalizado', cls: 'bg-green-500/10 text-green-700' },
  cancelado:     { label: 'Cancelado', cls: 'bg-destructive/10 text-destructive' },
}

export default function EvaluacionAdminPage() {
  const { conjunto, procesos, loading, error } = useActiveProceso()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Selección de proceso</p>
        <h1 className="text-2xl tracking-tight">Evaluación Técnica</h1>
        <p className="text-sm text-muted-foreground">
          La evaluación se realiza por proceso. Selecciona el proceso activo para calificar candidatos.
        </p>
      </div>

      {procesos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay procesos creados. Crea uno desde la sección <strong>Procesos de Selección</strong>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {procesos.map((proc) => {
            const badge = ESTADO_BADGE[proc.estado]
            const puedeEvaluar = proc.estado === 'evaluacion'
            return (
              <Card
                key={proc.id}
                className={`transition-all ${puedeEvaluar ? 'border-primary/40 shadow-sm' : 'opacity-70'}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{proc.nombre}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {conjunto?.nombre} · Iniciado {new Date(proc.fecha_inicio).toLocaleDateString('es-CO')}
                        </CardDescription>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {puedeEvaluar ? (
                    <Link href={`/admin/conjuntos/${conjunto?.id}/procesos/${proc.id}/evaluacion`}>
                      <Button className="w-full gap-2">
                        Ir a evaluación
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      {proc.estado === 'configuracion'
                        ? 'El proceso aún no está en evaluación'
                        : proc.estado === 'votacion' || proc.estado === 'finalizado'
                        ? 'Fase de evaluación completada'
                        : 'Proceso cancelado'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
