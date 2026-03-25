'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader, Save } from 'lucide-react'
import type { Conjunto } from '@/lib/types/index'

export default function NuevoProceso() {
  const params = useParams()
  const router = useRouter()
  const conjuntoId = params.conjuntoId as string

  const [conjunto, setConjunto] = useState<Conjunto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [pesoEvaluacion, setPesoEvaluacion] = useState(70)
  const [pesoVotacion, setPesoVotacion] = useState(30)

  useEffect(() => {
    const fetchConjunto = async () => {
      try {
        const response = await fetch('/api/conjuntos')
        if (response.ok) {
          const conjuntos = await response.json()
          const found = conjuntos.find((c: Conjunto) => c.id === conjuntoId)
          setConjunto(found || null)
        }
      } catch (error) {
        console.error('[v0] Error fetching conjunto:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConjunto()
  }, [conjuntoId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/procesos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conjunto_id: conjuntoId,
          nombre,
          descripcion,
          peso_evaluacion: pesoEvaluacion,
          peso_votacion: pesoVotacion,
          estado: 'configuracion',
        }),
      })

      if (response.ok) {
        router.push(`/admin/conjuntos/${conjuntoId}`)
      } else {
        const data = await response.json()
        alert(data.error || 'Error al crear el proceso')
      }
    } catch (error) {
      console.error('[v0] Error creating proceso:', error)
      alert('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="h-64 animate-pulse bg-card/50 rounded-lg" />
        </main>
      </div>
    )
  }

  if (!conjunto) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <Card className="p-12 text-center">
            <p>Conjunto no encontrado</p>
            <Link href="/admin">
              <Button className="mt-4">Volver al Dashboard</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href={`/admin/conjuntos/${conjuntoId}`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Nuevo Proceso de Selección</h1>
          <p className="mt-2 text-muted-foreground">
            {conjunto.nombre}
          </p>
        </div>

        <Card className="p-6 border border-border/50 bg-card/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Proceso</label>
              <Input
                placeholder="Ej: Selección Administrador 2024"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                placeholder="Descripción del proceso, objetivos, etc."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Peso Evaluación (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={pesoEvaluacion}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    setPesoEvaluacion(val)
                    setPesoVotacion(100 - val)
                  }}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Peso Votación (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={pesoVotacion}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    setPesoVotacion(val)
                    setPesoEvaluacion(100 - val)
                  }}
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={saving}>
              {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Crear Proceso'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
