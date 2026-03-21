'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2, Users2, BarChart3, FileText } from 'lucide-react'
import type { Conjunto } from '@/lib/types/index'

interface ConfigStep {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  path: string
  required: boolean
}

export default function ConfiguracionConjunto() {
  const params = useParams()
  const router = useRouter()
  const conjuntoId = params.conjuntoId as string

  const [conjunto, setConjunto] = useState<Conjunto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConjunto = async () => {
      try {
        const response = await fetch('/api/conjuntos')
        const conjuntos = await response.json()
        const found = conjuntos.find((c: Conjunto) => c.id === conjuntoId)
        setConjunto(found || null)
      } catch (error) {
        console.error('[v0] Error fetching conjunto:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConjunto()
  }, [conjuntoId])

  const steps: ConfigStep[] = [
    {
      id: 'consejeros',
      label: 'Registrar Consejeros',
      description: 'Agrega los miembros del consejo (mínimo 3)',
      icon: <Users2 className="h-6 w-6" />,
      path: `/admin/conjuntos/${conjuntoId}/consejeros`,
      required: true,
    },
    {
      id: 'criterios',
      label: 'Definir Criterios',
      description: 'Establece criterios de evaluación ponderados',
      icon: <BarChart3 className="h-6 w-6" />,
      path: `/admin/conjuntos/${conjuntoId}/criterios`,
      required: true,
    },
    {
      id: 'propuestas',
      label: 'Propuestas de Administradores',
      description: 'Carga mínimo 3 propuestas con documentos',
      icon: <FileText className="h-6 w-6" />,
      path: `/admin/conjuntos/${conjuntoId}/propuestas`,
      required: true,
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-24 animate-pulse bg-card/50" />
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
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>

        <div className="mb-12">
          <h1 className="text-3xl font-bold text-foreground">Configuración Inicial</h1>
          <p className="mt-2 text-muted-foreground">
            Completa los siguientes pasos para {conjunto.nombre}
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <Link key={step.id} href={step.path}>
              <Card className="group border border-border/50 bg-card/50 p-6 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary/20 transition-colors">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        {step.label}
                      </h3>
                      {step.required && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded font-semibold">
                          Requerido
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {step.description}
                    </p>
                  </div>
                  <div className="text-primary group-hover:translate-x-1 transition-transform">
                    →
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="mt-12 border-dashed border border-primary/20 bg-primary/5 p-6">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Próximos pasos</h3>
              <p className="text-sm text-muted-foreground">
                Una vez completes la configuración inicial, podrás crear procesos de selección e iniciar las evaluaciones y votaciones.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
