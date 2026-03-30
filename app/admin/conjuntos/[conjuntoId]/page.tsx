'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Plus, Settings, BarChart3 } from 'lucide-react'
import type { Conjunto, Proceso } from '@/lib/types/index'

export default function ConjuntoDetail() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string

  const [conjunto, setConjunto] = useState<Conjunto | null>(null)
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [conjRes, procRes] = await Promise.all([
          fetch(`/api/conjuntos`),
          fetch(`/api/procesos?conjunto_id=${conjuntoId}`),
        ])

        if (conjRes.ok) {
          const conjuntoData = await conjRes.json()
          setConjunto(conjuntoData?.id === conjuntoId ? conjuntoData : null)
        }

        if (procRes.ok) {
          const data = await procRes.json()
          setProcesos(data || [])
        }
      } catch (error) {
        console.error('[v0] Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [conjuntoId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-20 animate-pulse bg-card/50" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!conjunto) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Conjunto no encontrado</p>
            <Link href="/admin">
              <Button className="mt-4">Volver</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{conjunto.nombre}</h1>
          <p className="mt-2 text-muted-foreground">
            {conjunto.direccion} • {conjunto.ciudad}
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <Card className="border border-border/50 bg-card/50 p-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">DIRECCIÓN</p>
              <p className="text-foreground">{conjunto.direccion}</p>
            </div>
          </Card>
          <Card className="border border-border/50 bg-card/50 p-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">CIUDAD</p>
              <p className="text-foreground">{conjunto.ciudad}</p>
            </div>
          </Card>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Procesos de Selección</h2>
            <p className="mt-1 text-muted-foreground">
              Administra los procesos de selección de administradores
            </p>
          </div>
          <Link href={`/admin/conjuntos/${conjuntoId}/nuevo-proceso`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Proceso
            </Button>
          </Link>
        </div>

        {procesos.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto max-w-sm">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No hay procesos activos
              </h2>
              <p className="text-muted-foreground mb-6">
                Crea un nuevo proceso de selección para comenzar.
              </p>
              <Link href={`/admin/conjuntos/${conjuntoId}/nuevo-proceso`}>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Proceso
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {procesos.map((proceso) => (
              <Link
                key={proceso.id}
                href={`/admin/conjuntos/${conjuntoId}/procesos/${proceso.id}`}
              >
                <Card className="group border border-border/50 bg-card/50 p-6 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        {proceso.nombre}
                      </h3>
                      {proceso.descripcion && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {proceso.descripcion}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Evaluación: {proceso.peso_evaluacion}%</span>
                        <span>Votación: {proceso.peso_votacion}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block rounded-full px-3 py-1 bg-primary/10 text-primary text-xs font-semibold">
                        {proceso.estado}
                      </span>
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
