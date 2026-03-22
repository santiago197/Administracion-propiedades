'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { NavBar } from '@/components/admin/nav-bar'
import { ArrowLeft, Loader, Save, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NuevoProcesoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conjuntoId, setConjuntoId] = useState<string | null>(null)

  // Form state
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [fechaFin, setFechaFin] = useState('')
  const [pesoEvaluacion, setPesoEvaluacion] = useState(70)
  const [pesoVotacion, setPesoVotacion] = useState(30)

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // Obtener el perfil para sacar el conjunto_id
        const { data: profile, error: profError } = await supabase
          .from('profiles')
          .select('conjunto_id')
          .eq('id', user.id)
          .single()

        if (profError || !profile?.conjunto_id) {
          setError('No tienes un conjunto residencial asociado. Contacta al administrador.')
        } else {
          setConjuntoId(profile.conjunto_id)
        }
      } catch (err) {
        console.error('[v0] Error initializing page:', err)
        setError('Error al cargar la configuración de usuario.')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndProfile()
  }, [router])

  const validateForm = () => {
    if (!nombre.trim()) return 'El nombre del proceso es obligatorio.'
    if (pesoEvaluacion + pesoVotacion !== 100) return 'La suma de los pesos debe ser igual a 100%.'
    if (pesoEvaluacion < 0 || pesoVotacion < 0) return 'Los pesos no pueden ser valores negativos.'
    if (fechaFin && new Date(fechaFin) < new Date(fechaInicio)) return 'La fecha de fin no puede ser anterior a la de inicio.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!conjuntoId) {
      setError('No se pudo determinar el conjunto residencial.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/procesos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conjunto_id: conjuntoId,
          nombre,
          descripcion,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin || null,
          peso_evaluacion: pesoEvaluacion,
          peso_votacion: pesoVotacion,
          estado: 'configuracion',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear el proceso')
      }

      router.push('/admin/procesos')
    } catch (err: any) {
      setError(err.message || 'Error de conexión.')
      console.error('[v0] Error creating proceso:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/admin/procesos">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Procesos
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Crear Nuevo Proceso</h1>
          <p className="mt-2 text-muted-foreground">
            Configura un nuevo proceso de selección para tu conjunto residencial
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="p-6 border border-border/50 bg-card/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Proceso *</label>
              <Input
                placeholder="Ej: Selección de Administrador 2024-2025"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                placeholder="Opcional: Detalles sobre el proceso de selección..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Inicio</label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Fin (Opcional)</label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <h3 className="text-lg font-semibold mb-4">Ponderación de Resultados</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Define el peso relativo de la evaluación técnica y la votación del consejo. La suma debe ser 100%.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      setPesoVotacion(Math.max(0, 100 - val))
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
                      setPesoEvaluacion(Math.max(0, 100 - val))
                    }}
                    required
                    disabled={saving}
                  />
                </div>
              </div>

              {pesoEvaluacion + pesoVotacion !== 100 && (
                <p className="text-sm text-destructive mt-2">
                  La suma actual es {pesoEvaluacion + pesoVotacion}%. Debe ser 100%.
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full gap-2 mt-4"
              disabled={saving || loading || !conjuntoId}
            >
              {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando proceso...' : 'Crear Proceso'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
