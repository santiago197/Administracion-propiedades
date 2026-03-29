'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { FormCriterio } from '@/components/admin/form-criterio'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import type { Criterio, Proceso } from '@/lib/types/index'

export default function GestionCriterios() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string

  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [proceso, setProceso] = useState<Proceso | null>(null)
  const [loading, setLoading] = useState(true)
  const [procesoId, setProcesoId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener procesos del conjunto para usar el primero o crear uno
        const procRes = await fetch(`/api/procesos?conjunto_id=${conjuntoId}`)
        const procesos = await procRes.json()

        let currentProceso = procesos?.[0]

        if (!currentProceso) {
          // Si no hay proceso, crear uno por defecto
          const newProcRes = await fetch('/api/procesos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conjunto_id: conjuntoId,
              nombre: 'Proceso de Selección 2024',
              descripcion: 'Proceso inicial de selección',
              fecha_inicio: new Date().toISOString().split('T')[0],
              peso_evaluacion: 70,
              peso_votacion: 30,
              estado: 'configuracion',
            }),
          })
          if (newProcRes.ok) {
            currentProceso = await newProcRes.json()
          }
        }

        if (currentProceso) {
          setProcesoId(currentProceso.id)
          setProceso(currentProceso)

          // Obtener criterios
          const critRes = await fetch(`/api/criterios?proceso_id=${currentProceso.id}`)
          const crits = await critRes.json()
          setCriterios(crits || [])
        }
      } catch (error) {
        console.error('[v0] Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [conjuntoId])

  const handleCriterioAdded = (criterio: Criterio) => {
    setCriterios((prev) => [...prev, criterio])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-20 animate-pulse bg-card/50" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!procesoId) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Error: No se pudo crear un proceso</p>
            <Link href={`/admin/conjuntos/${conjuntoId}/configuracion`}>
              <Button className="mt-4">Volver</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  const totalPeso = criterios.reduce((sum, c) => sum + (c.peso || 0), 0)
  const isWeightComplete = Math.abs(totalPeso - 100) < 0.01
  const hasMinimumCriteria = criterios.length >= 2

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}/configuracion`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>

        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Criterios de Evaluación</h1>
              <p className="mt-2 text-muted-foreground">
                Define los criterios de evaluación ponderados (suma de pesos = 100%)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Peso total</p>
              <p className={`text-2xl font-bold ${isWeightComplete ? 'text-primary' : 'text-destructive'}`}>
                {totalPeso.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {!isWeightComplete && (
          <Card className="mb-8 border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Suma de pesos incorrecta
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Los pesos deben sumar exactamente 100%. Actualmente suman {totalPeso.toFixed(1)}%.
              </p>
            </div>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Agregar Nuevo Criterio</h2>
              {procesoId && (
                <FormCriterio
                  procesoId={procesoId}
                  onSuccess={handleCriterioAdded}
                  loading={loading}
                />
              )}
            </div>
          </div>

          <div>
            <div className="sticky top-[100px]">
              <h2 className="text-lg font-semibold text-foreground mb-4">Resumen</h2>
              <Card className="border border-border/50 bg-card/50 p-4 space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Criterios</p>
                  <p className="text-2xl font-bold text-foreground">{criterios.length}</p>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <p className="text-muted-foreground mb-2">Peso Total</p>
                  <p className={`text-lg font-bold ${isWeightComplete ? 'text-primary' : 'text-destructive'}`}>
                    {totalPeso.toFixed(1)}%
                  </p>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <p className="text-muted-foreground mb-2">Estado</p>
                  <div className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    isWeightComplete && hasMinimumCriteria
                      ? 'bg-primary/20 text-primary'
                      : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-200'
                  }`}>
                    {isWeightComplete && hasMinimumCriteria ? '✓ Completo' : 'Pendiente'}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {criterios.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Criterios Registrados</h2>
            <div className="space-y-3">
              {criterios
                .sort((a, b) => a.orden - b.orden)
                .map((criterio) => (
                  <Card
                    key={criterio.id}
                    className="border border-border/50 bg-card/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {criterio.nombre}
                        </h3>
                        {criterio.descripcion && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {criterio.descripcion}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{criterio.tipo}</span>
                          <span>{criterio.valor_minimo} - {criterio.valor_maximo}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{criterio.peso}%</p>
                        <p className="text-xs text-muted-foreground">peso</p>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {isWeightComplete && hasMinimumCriteria && (
          <div className="mt-12 text-center">
            <Card className="border border-primary/20 bg-primary/5 p-8">
              <p className="text-foreground font-semibold mb-4">
                ¡Excelente! Has completado la definición de criterios
              </p>
              <p className="text-muted-foreground mb-6">
                Ahora continúa con el registro de propuestas de administradores
              </p>
              <Link href={`/admin/conjuntos/${conjuntoId}/propuestas`}>
                <Button>Ir a Propuestas</Button>
              </Link>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
