'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NavBar } from '@/components/admin/nav-bar'
import { Plus, ChevronRight, Calendar, Loader, FileText, AlertCircle } from 'lucide-react'
import type { Proceso } from '@/lib/types/index'
import { createClient } from '@/lib/supabase/client'

export default function ProcesosListingPage() {
  const router = useRouter()
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [conjuntoId, setConjuntoId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
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
          setError('No tienes un conjunto residencial asociado.')
          setLoading(false)
          return
        }

        setConjuntoId(profile.conjunto_id)

        // Cargar procesos
        const response = await fetch(`/api/procesos?conjunto_id=${profile.conjunto_id}`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al obtener procesos')
        }
        const data = await response.json()
        setProcesos(data || [])
      } catch (err: any) {
        console.error('[v0] Error fetching data:', err)
        setError(err.message || 'Error de conexión.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando procesos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Procesos de Selección</h1>
            <p className="mt-2 text-muted-foreground">
              Administra los procesos para elegir administradores de tu conjunto residencial
            </p>
          </div>
          <Link href="/admin/procesos/nuevo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Proceso
            </Button>
          </Link>
        </div>

        {error ? (
          <Card className="p-12 text-center border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Ha ocurrido un error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Reintentar</Button>
          </Card>
        ) : procesos.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto max-w-sm">
              <h2 className="text-xl font-semibold text-foreground mb-2">No hay procesos registrados</h2>
              <p className="text-muted-foreground mb-6">
                Crea tu primer proceso de selección para comenzar.
              </p>
              <Link href="/admin/procesos/nuevo">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Primer Proceso
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {procesos.map((proceso) => (
              <Link key={proceso.id} href={`/admin/conjuntos/${conjuntoId}/procesos/${proceso.id}`}>
                <Card className="group border border-border/50 bg-card/50 p-6 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      proceso.estado === 'configuracion' ? 'bg-yellow-500/10 text-yellow-500' :
                      proceso.estado === 'finalizado' ? 'bg-green-500/10 text-green-500' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {proceso.estado.charAt(0).toUpperCase() + proceso.estado.slice(1)}
                    </span>
                  </div>

                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-2">
                    {proceso.nombre}
                  </h3>

                  {proceso.descripcion && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {proceso.descripcion}
                    </p>
                  )}

                  <div className="mt-auto pt-4 border-t border-border/50 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Iniciado: {new Date(proceso.fecha_inicio).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <span>Evaluación: {proceso.peso_evaluacion}%</span>
                      <span>Votación: {proceso.peso_votacion}%</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
