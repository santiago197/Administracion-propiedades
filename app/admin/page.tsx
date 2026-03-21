'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NavBar } from '@/components/admin/nav-bar'
import { Plus, ChevronRight, Calendar, MapPin, Users } from 'lucide-react'
import type { Conjunto } from '@/lib/types'

export default function AdminHome() {
  const [conjuntos, setConjuntos] = useState<Conjunto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConjuntos = async () => {
      try {
        const response = await fetch('/api/conjuntos')
        const data = await response.json()
        setConjuntos(data || [])
      } catch (error) {
        console.error('[v0] Error fetching conjuntos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConjuntos()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Conjuntos Residenciales</h1>
            <p className="mt-2 text-muted-foreground">
              Administra los procesos de selección de administradores
            </p>
          </div>
          <Link href="/admin/nuevo-conjunto">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Conjunto
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-card/50" />
            ))}
          </div>
        ) : conjuntos.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto max-w-sm">
              <h2 className="text-xl font-semibold text-foreground mb-2">No hay conjuntos registrados</h2>
              <p className="text-muted-foreground mb-6">
                Comienza creando tu primer conjunto residencial para iniciar procesos de selección.
              </p>
              <Link href="/admin/nuevo-conjunto">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Primer Conjunto
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {conjuntos.map((conjunto) => (
              <Link key={conjunto.id} href={`/admin/conjuntos/${conjunto.id}`}>
                <Card className="group border border-border/50 bg-card/50 p-6 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        {conjunto.nombre}
                      </h3>
                      <p className="text-sm text-muted-foreground">Conjunto residencial</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{conjunto.ciudad}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{conjunto.anio}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      {conjunto.direccion}
                    </p>
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
