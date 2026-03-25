'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Propuesta } from '@/lib/types/index'

export default function PaginaVotacion() {
  const params = useParams()
  const router = useRouter()
  const procesoId = params.procesoId as string

  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [selectedVoto, setSelectedVoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        const propRes = await fetch(`/api/propuestas?proceso_id=${procesoId}`)
        if (propRes.ok) {
          const props = await propRes.json()
          setPropuestas(props?.filter((p: Propuesta) => p.estado === 'en_evaluacion') || [])
        }
      } catch (error) {
        console.error('[v0] Error fetching propuestas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [procesoId, router])

  const handleVotar = async () => {
    if (!selectedVoto || !consejeroId) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/votos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proceso_id: procesoId,
          consejero_id: consejeroId,
          propuesta_id: selectedVoto,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al registrar voto')
      }

      // Ir a página de gracias
      router.push(`/consejero/gracias`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('[v0] Vote error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-bold">Votación</h1>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">
          <Card className="h-32 animate-pulse bg-card/50" />
        </main>
      </div>
    )
  }

  if (!propuestas.length) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-bold">Votación</h1>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-2">Sin propuestas disponibles</p>
            <p className="text-muted-foreground">No hay propuestas para votar en este momento</p>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold">Votación por Administrador</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="border border-border/50 bg-card/50 p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Selecciona tu Voto</h2>
          <p className="text-muted-foreground">
            Elige la propuesta de administrador que consideras es la mejor. Cada consejero puede votar solo una vez.
          </p>
        </Card>

        <div className="space-y-4 mb-8">
          {propuestas.map((propuesta) => (
            <Card
              key={propuesta.id}
              onClick={() => setSelectedVoto(propuesta.id)}
              className={`border-2 p-6 cursor-pointer transition-all ${
                selectedVoto === propuesta.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 bg-card/50 hover:border-primary/30 hover:bg-card/70'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg text-foreground">
                      {propuesta.razon_social}
                    </h3>
                    {selectedVoto === propuesta.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {propuesta.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'} •
                    {propuesta.nit_cedula}
                  </p>
                  {propuesta.representante_legal && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Representante: {propuesta.representante_legal}
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>
                      <span className="font-semibold">Experiencia:</span> {propuesta.anios_experiencia} años
                    </div>
                    <div>
                      <span className="font-semibold">Unidades:</span> {propuesta.unidades_administradas}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {error && (
          <Card className="mb-8 border border-destructive/20 bg-destructive/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        <div className="flex gap-4">
          <Link href={`/consejero/evaluacion/${procesoId}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Volver a Evaluación
            </Button>
          </Link>
          <Button
            onClick={handleVotar}
            disabled={!selectedVoto || saving}
            className="flex-1"
          >
            {saving ? 'Registrando voto...' : 'Confirmar Voto'}
          </Button>
        </div>
      </main>
    </div>
  )
}
