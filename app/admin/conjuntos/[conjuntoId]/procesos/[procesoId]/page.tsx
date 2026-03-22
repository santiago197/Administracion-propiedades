'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  Loader,
  Users,
  FileText,
  Settings,
  BarChart3,
  CheckSquare,
  ClipboardList,
  AlertCircle
} from 'lucide-react'
import type { Proceso, Conjunto, ProcesoStats } from '@/lib/types/index'

export default function ProcesoDashboard() {
  const params = useParams()
  const router = useRouter()
  const conjuntoId = params.conjuntoId as string
  const procesoId = params.procesoId as string

  const [proceso, setProceso] = useState<Proceso | null>(null)
  const [conjunto, setConjunto] = useState<Conjunto | null>(null)
  const [stats, setStats] = useState<ProcesoStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [procRes, conjRes, statsRes] = await Promise.all([
          fetch(`/api/procesos?conjunto_id=${conjuntoId}`),
          fetch(`/api/conjuntos`),
          fetch(`/api/procesos/stats?proceso_id=${procesoId}`)
        ])

        if (procRes.ok) {
          const procesos = await procRes.ok ? await procRes.json() : []
          setProceso(procesos.find((p: Proceso) => p.id === procesoId) || null)
        }

        if (conjRes.ok) {
          const conjuntos = await conjRes.json()
          setConjunto(conjuntos.find((c: Conjunto) => c.id === conjuntoId) || null)
        }

        if (statsRes.ok) {
          setStats(await statsRes.json())
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [procesoId, conjuntoId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!proceso) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-4">Proceso no encontrado</h2>
        <Link href={`/admin/conjuntos/${conjuntoId}`}>
          <Button>Volver al Conjunto</Button>
        </Link>
      </div>
    )
  }

  const steps = [
    {
      title: 'Registro de Candidatos',
      description: 'Gestión de propuestas y documentos básicos.',
      icon: <Users className="h-6 w-6" />,
      href: `/admin/conjuntos/${conjuntoId}/propuestas`,
      status: 'completado'
    },
    {
      title: 'Validación Legal',
      description: 'Verificación de antecedentes y requisitos SARLAFT.',
      icon: <CheckSquare className="h-6 w-6" />,
      href: `/admin/conjuntos/${conjuntoId}/procesos/${procesoId}/validacion-legal`,
      status: proceso.estado === 'configuracion' ? 'en_progreso' : 'completado'
    },
    {
      title: 'Evaluación Técnica',
      description: 'Calificación por criterios por parte del consejo.',
      icon: <ClipboardList className="h-6 w-6" />,
      href: `/admin/conjuntos/${conjuntoId}/criterios`,
      status: proceso.estado === 'evaluacion' ? 'en_progreso' : (proceso.estado === 'configuracion' ? 'pendiente' : 'completado')
    },
    {
      title: 'Selección y Ranking',
      description: 'Resultados finales y generación de actas.',
      icon: <BarChart3 className="h-6 w-6" />,
      href: `/admin/conjuntos/${conjuntoId}/procesos/${procesoId}/resultados`,
      status: proceso.estado === 'finalizado' ? 'completado' : (proceso.estado === 'votacion' ? 'en_progreso' : 'pendiente')
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al Conjunto
          </Button>
        </Link>

        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{proceso.nombre}</h1>
            <p className="mt-1 text-muted-foreground">{conjunto?.nombre} • Estado: {proceso.estado.toUpperCase()}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </Button>
            {proceso.estado === 'configuracion' && (
              <Button className="gap-2 bg-green-600 hover:bg-green-700">
                Iniciar Evaluación
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="p-4 border border-border/50 bg-card/50 flex flex-col items-center text-center">
            <span className="text-2xl font-bold">{stats?.total_propuestas || 0}</span>
            <span className="text-xs text-muted-foreground uppercase mt-1">Candidatos</span>
          </Card>
          <Card className="p-4 border border-border/50 bg-card/50 flex flex-col items-center text-center">
            <span className="text-2xl font-bold">{stats?.propuestas_activas || 0}</span>
            <span className="text-xs text-muted-foreground uppercase mt-1">Habilitados</span>
          </Card>
          <Card className="p-4 border border-border/50 bg-card/50 flex flex-col items-center text-center">
            <span className="text-2xl font-bold">{stats?.evaluaciones_completadas || 0}</span>
            <span className="text-xs text-muted-foreground uppercase mt-1">Evaluaciones</span>
          </Card>
          <Card className="p-4 border border-border/50 bg-card/50 flex flex-col items-center text-center">
            <span className="text-2xl font-bold">{stats?.votaciones_completadas || 0}</span>
            <span className="text-xs text-muted-foreground uppercase mt-1">Votos</span>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Flujo del Proceso</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {steps.map((step, i) => (
              <Link key={i} href={step.href}>
                <Card className={`p-6 border border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer h-full ${
                  step.status === 'en_progreso' ? 'ring-2 ring-primary' : ''
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      step.status === 'completado' ? 'bg-green-500/10 text-green-500' :
                      step.status === 'en_progreso' ? 'bg-primary/10 text-primary' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold">{step.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          step.status === 'completado' ? 'bg-green-500/10 text-green-500' :
                          step.status === 'en_progreso' ? 'bg-primary/10 text-primary' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {step.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
