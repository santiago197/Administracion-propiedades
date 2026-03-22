'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { FormPropuesta } from '@/components/admin/form-propuesta'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, AlertCircle, FileText } from 'lucide-react'
import type { Propuesta, Proceso } from '@/lib/types/index'

export default function GestionPropuestas() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string

  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [proceso, setProceso] = useState<Proceso | null>(null)
  const [loading, setLoading] = useState(true)
  const [procesoId, setProcesoId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const procRes = await fetch(`/api/procesos?conjunto_id=${conjuntoId}`)
        const procesos = await procRes.json()

        const currentProceso = procesos?.[0]
        if (currentProceso) {
          setProcesoId(currentProceso.id)
          setProceso(currentProceso)

          const propRes = await fetch(`/api/propuestas?proceso_id=${currentProceso.id}`)
          const props = await propRes.json()
          setPropuestas(props || [])
        }
      } catch (error) {
        console.error('[v0] Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [conjuntoId])

  const handlePropuestaAdded = (propuesta: Propuesta) => {
    setPropuestas((prev) => [...prev, propuesta])
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
            <p className="text-muted-foreground">Error: No se encontró un proceso</p>
            <Link href={`/admin/conjuntos/${conjuntoId}/configuracion`}>
              <Button className="mt-4">Volver</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  const totalPropuestas = propuestas.filter(p => p.estado === 'registro' || p.estado === 'habilitada' || p.estado === 'en_evaluacion').length
  const requiredPropuestas = 3
  const isComplete = totalPropuestas >= requiredPropuestas

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
              <h1 className="text-3xl font-bold text-foreground">Propuestas de Administradores</h1>
              <p className="mt-2 text-muted-foreground">
                Registra mínimo 3 propuestas de administradores con documentación
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Propuestas activas</p>
              <p className={`text-2xl font-bold ${isComplete ? 'text-primary' : 'text-muted-foreground'}`}>
                {totalPropuestas}/{requiredPropuestas}
              </p>
            </div>
          </div>
        </div>

        {!isComplete && (
          <Card className="mb-8 border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Mínimo de propuestas requerido
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Se necesitan al menos {requiredPropuestas} propuestas registradas para iniciar evaluaciones. Actualmente tienes {totalPropuestas}.
              </p>
            </div>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Agregar Nueva Propuesta</h2>
              {procesoId && (
                <FormPropuesta
                  procesoId={procesoId}
                  onSuccess={handlePropuestaAdded}
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
                  <p className="text-muted-foreground">Total Propuestas</p>
                  <p className="text-2xl font-bold text-foreground">{totalPropuestas}</p>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <p className="text-muted-foreground mb-2">Estado</p>
                  <div className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    isComplete
                      ? 'bg-primary/20 text-primary'
                      : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-200'
                  }`}>
                    {isComplete ? '✓ Completo' : 'Pendiente'}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {propuestas.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Propuestas Registradas</h2>
            <div className="space-y-3">
              {propuestas
                .filter(p => p.estado === 'registro' || p.estado === 'habilitada' || p.estado === 'en_evaluacion')
                .map((propuesta) => (
                  <Card
                    key={propuesta.id}
                    className="border border-border/50 bg-card/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {propuesta.razon_social}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {propuesta.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'} • 
                          {propuesta.nit_cedula}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                          <div>
                            <span className="font-semibold">Experiencia:</span> {propuesta.anios_experiencia} años
                          </div>
                          <div>
                            <span className="font-semibold">Unidades:</span> {propuesta.unidades_administradas}
                          </div>
                        </div>
                        {propuesta.email && (
                          <p className="text-xs text-muted-foreground mt-2">{propuesta.email}</p>
                        )}
                      </div>
                      <Link href={`/admin/conjuntos/${conjuntoId}/propuestas/${propuesta.id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <FileText className="h-4 w-4" />
                          Documentos
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="mt-12 text-center">
            <Card className="border border-primary/20 bg-primary/5 p-8">
              <p className="text-foreground font-semibold mb-4">
                ¡Excelente! Has registrado suficientes propuestas
              </p>
              <p className="text-muted-foreground mb-6">
                La configuración inicial está completa. Ahora puedes crear procesos de selección e iniciar evaluaciones y votaciones.
              </p>
              <Link href={`/admin/conjuntos/${conjuntoId}`}>
                <Button>Ir al Conjunto</Button>
              </Link>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
