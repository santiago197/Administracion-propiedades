'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Propuesta, Criterio, Evaluacion } from '@/lib/types/index'

export default function PaginaEvaluacion() {
  const params = useParams()
  const router = useRouter()
  const procesoId = params.procesoId as string

  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Record<string, Record<string, number>>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [consejeroId, setConsejeroId] = useState<string | null>(null)

  useEffect(() => {
    const cId = sessionStorage.getItem('consejero_id')
    if (!cId) {
      router.push('/consejero')
      return
    }
    setConsejeroId(cId)

    const fetchData = async () => {
      try {
        const [propRes, critRes] = await Promise.all([
          fetch(`/api/propuestas?proceso_id=${procesoId}`),
          fetch(`/api/criterios?proceso_id=${procesoId}`),
        ])

        if (propRes.ok) {
          const props = await propRes.json()
          setPropuestas(props?.filter((p: Propuesta) => p.estado === 'en_evaluacion') || [])
        }

        if (critRes.ok) {
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
  }, [procesoId, router])

  const handleEvaluacion = (propuestaId: string, criterioId: string, valor: number) => {
    setEvaluaciones((prev) => ({
      ...prev,
      [propuestaId]: {
        ...(prev[propuestaId] || {}),
        [criterioId]: valor,
      },
    }))
  }

  const handleGuardar = async () => {
    if (!consejeroId) return

    setSaving(true)
    try {
      const propuestaId = propuestas[currentIndex].id
      const criterioEvals = evaluaciones[propuestaId] || {}

      for (const [criterioId, valor] of Object.entries(criterioEvals)) {
        await fetch('/api/evaluaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proceso_id: procesoId,
            consejero_id: consejeroId,
            propuesta_id: propuestaId,
            criterio_id: criterioId,
            valor,
          }),
        })
      }

      // Ir a la siguiente propuesta
      if (currentIndex < propuestas.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // Ir a votación
        router.push(`/consejero/votacion/${procesoId}`)
      }
    } catch (error) {
      console.error('[v0] Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-bold">Evaluación de Propuestas</h1>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">
          <Card className="h-32 animate-pulse bg-card/50" />
        </main>
      </div>
    )
  }

  if (!propuestas.length || !criterios.length) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-bold">Evaluación de Propuestas</h1>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-2">Proceso no disponible</p>
            <p className="text-muted-foreground">No hay propuestas o criterios configurados</p>
            <Link href="/consejero">
              <Button className="mt-6">Volver</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  const currentPropuesta = propuestas[currentIndex]
  const currentEvals = evaluaciones[currentPropuesta.id] || {}
  const hasAllEvals = criterios.every((c) => currentEvals[c.id] !== undefined)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Evaluación de Propuestas</h1>
            <div className="text-sm text-muted-foreground">
              Propuesta {currentIndex + 1} de {propuestas.length}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="border border-border/50 bg-card/50 p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {currentPropuesta.razon_social}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-6">
            <div>
              <p className="font-semibold text-foreground">Tipo</p>
              <p>{currentPropuesta.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{currentPropuesta.tipo_persona === 'juridica' ? 'NIT' : 'Cédula'}</p>
              <p>{currentPropuesta.nit_cedula}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Experiencia</p>
              <p>{currentPropuesta.anios_experiencia} años</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Unidades Administradas</p>
              <p>{currentPropuesta.unidades_administradas}</p>
            </div>
          </div>
        </Card>

        <Card className="border border-border/50 bg-card/50 p-8">
          <h3 className="text-lg font-semibold text-foreground mb-6">Evaluación por Criterios</h3>

          <div className="space-y-8">
            {criterios.map((criterio) => (
              <div key={criterio.id} className="pb-6 border-b border-border/50 last:border-0 last:pb-0">
                <div className="mb-4">
                  <h4 className="font-semibold text-foreground">{criterio.nombre}</h4>
                  {criterio.descripcion && (
                    <p className="text-sm text-muted-foreground mt-1">{criterio.descripcion}</p>
                  )}
                </div>

                {criterio.tipo === 'numerico' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {Array.from(
                        { length: criterio.valor_maximo - criterio.valor_minimo + 1 },
                        (_, i) => criterio.valor_minimo + i
                      ).map((valor) => (
                        <button
                          key={valor}
                          onClick={() => handleEvaluacion(currentPropuesta.id, criterio.id, valor)}
                          className={`flex-1 py-2 rounded-md font-semibold transition-colors ${
                            currentEvals[criterio.id] === valor
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border/50 bg-background text-foreground hover:border-primary/50'
                          }`}
                        >
                          {valor}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Bajo</span>
                      <span>Alto</span>
                    </div>
                  </div>
                )}

                {criterio.tipo === 'booleano' && (
                  <div className="flex gap-2">
                    {[
                      { label: 'No cumple', valor: 0 },
                      { label: 'Cumple', valor: 1 },
                    ].map(({ label, valor }) => (
                      <button
                        key={label}
                        onClick={() => handleEvaluacion(currentPropuesta.id, criterio.id, valor)}
                        className={`flex-1 py-2 rounded-md font-semibold transition-colors ${
                          currentEvals[criterio.id] === valor
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border/50 bg-background text-foreground hover:border-primary/50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-4">
            {currentIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(currentIndex - 1)}
                disabled={saving}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>
            )}

            <Button
              onClick={handleGuardar}
              disabled={!hasAllEvals || saving}
              className="flex-1 gap-2"
            >
              {saving ? 'Guardando...' : currentIndex < propuestas.length - 1 ? 'Siguiente' : 'Ir a Votación'}
              {hasAllEvals && <CheckCircle2 className="h-4 w-4" />}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
