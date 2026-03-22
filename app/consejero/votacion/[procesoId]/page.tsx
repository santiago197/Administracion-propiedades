'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface PropuestaResumen {
  id: string
  razon_social: string
  tipo_persona: 'juridica' | 'natural'
  nit_cedula: string
  representante_legal?: string
  anios_experiencia: number
  unidades_administradas: number
  valor_honorarios?: number
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PaginaVotacion() {
  const params = useParams()
  const router = useRouter()
  const procesoId = params.procesoId as string

  const [propuestas, setPropuestas] = useState<PropuestaResumen[]>([])
  const [selectedVoto, setSelectedVoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const res = await fetch(`/api/evaluacion/datos?proceso_id=${procesoId}`)

        if (!res.ok) {
          const { error: msg } = await res.json()
          setError(msg ?? 'Error al cargar los datos')
          setLoading(false)
          return
        }

        const { propuestas: props, ya_voto } = await res.json()

        if (ya_voto) {
          router.replace('/consejero/gracias')
          return
        }

        setPropuestas(props)
      } catch {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }

    fetchDatos()
  }, [procesoId, router])

  const handleVotar = async () => {
    if (!selectedVoto) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/evaluacion/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proceso_id: procesoId,
          propuesta_id: selectedVoto,
        }),
      })

      if (!res.ok) {
        const { error: msg } = await res.json()
        // Evaluación incompleta — regresar a evaluar
        if (res.status === 400) {
          setError(msg)
          return
        }
        setError(msg ?? 'Error al registrar el voto')
        return
      }

      router.push('/consejero/gracias')
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-xl font-bold">Votación</p>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
          <Card className="h-32 animate-pulse bg-card/50" />
          <Card className="h-24 animate-pulse bg-card/50" />
          <Card className="h-24 animate-pulse bg-card/50" />
        </main>
      </div>
    )
  }

  if (error && !propuestas.length) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-xl font-bold">Votación</p>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-2">Error al cargar</p>
            <p className="text-muted-foreground">{error}</p>
            <Link href="/consejero">
              <Button className="mt-6">Volver al inicio</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  if (!propuestas.length) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-xl font-bold">Votación</p>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-2">Sin propuestas disponibles</p>
            <p className="text-muted-foreground">
              No hay propuestas habilitadas para votar en este momento.
            </p>
          </Card>
        </main>
      </div>
    )
  }

  // ─── Render principal ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-xl font-bold">Votación por Administrador</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="border border-border/50 bg-card/50 p-8 mb-6">
          <p className="text-2xl font-bold text-foreground mb-2">Selecciona tu voto</p>
          <p className="text-muted-foreground text-sm">
            Elige la propuesta que consideras mejor para administrar el conjunto. Cada
            consejero puede votar una sola vez.
          </p>
        </Card>

        <div className="mb-6">
          <Link href="/consejero/perfil">
            <Button variant="ghost" className="px-0 text-muted-foreground">
              Ver mi perfil de consejero
            </Button>
          </Link>
        </div>

        <div className="space-y-4 mb-6">
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
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-lg text-foreground">
                      {propuesta.razon_social}
                    </p>
                    {selectedVoto === propuesta.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {propuesta.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'}
                    {' · '}
                    {propuesta.nit_cedula}
                  </p>
                  {propuesta.representante_legal && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Representante: {propuesta.representante_legal}
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>
                      <span className="font-semibold">Experiencia: </span>
                      {propuesta.anios_experiencia} años
                    </div>
                    <div>
                      <span className="font-semibold">Unidades: </span>
                      {propuesta.unidades_administradas}
                    </div>
                    {propuesta.valor_honorarios && (
                      <div className="col-span-2">
                        <span className="font-semibold">Honorarios: </span>
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          maximumFractionDigits: 0,
                        }).format(propuesta.valor_honorarios)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {error && (
          <Card className="mb-6 border border-destructive/20 bg-destructive/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-destructive">{error}</p>
              {error.toLowerCase().includes('evaluar') && (
                <Link
                  href={`/consejero/evaluacion/${procesoId}`}
                  className="text-sm text-destructive underline mt-1 block"
                >
                  Volver a completar la evaluación
                </Link>
              )}
            </div>
          </Card>
        )}

        <div className="flex gap-3">
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
