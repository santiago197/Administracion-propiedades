'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, TrendingUp, Award } from 'lucide-react'
import type { ResultadoFinal, ProcesoStats } from '@/lib/types/index'

export default function PaginaResultados() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string
  const procesoId = params.procesoId as string

  const [resultados, setResultados] = useState<ResultadoFinal[]>([])
  const [stats, setStats] = useState<ProcesoStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRes, statsRes] = await Promise.all([
          fetch(`/api/resultados?proceso_id=${procesoId}`),
          fetch(`/api/resultados?proceso_id=${procesoId}&type=stats`),
        ])

        if (resRes.ok) {
          const res = await resRes.json()
          setResultados(res || [])
        }

        if (statsRes.ok) {
          const st = await statsRes.json()
          setStats(st)
        }
      } catch (error) {
        console.error('[v0] Error fetching resultados:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [procesoId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-20 animate-pulse bg-card/50" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  const getSemaforoColor = (estado: string) => {
    switch (estado) {
      case 'verde':
        return 'bg-green-500/20 text-green-700 dark:text-green-300'
      case 'amarillo':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
      case 'rojo':
        return 'bg-red-500/20 text-red-700 dark:text-red-300'
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>

        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Resultados Finales</h1>
          <p className="text-muted-foreground">
            Ranking de propuestas basado en evaluación y votación
          </p>
        </div>

        {stats && (
          <div className="grid gap-4 md:grid-cols-4 mb-12">
            <Card className="border border-border/50 bg-card/50 p-6">
              <p className="text-sm text-muted-foreground mb-2">Consejeros Totales</p>
              <p className="text-3xl font-bold text-foreground">{stats.total_consejeros}</p>
            </Card>
            <Card className="border border-border/50 bg-card/50 p-6">
              <p className="text-sm text-muted-foreground mb-2">Evaluaciones Completadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.evaluaciones_completadas}</p>
            </Card>
            <Card className="border border-border/50 bg-card/50 p-6">
              <p className="text-sm text-muted-foreground mb-2">Votaciones Completadas</p>
              <p className="text-3xl font-bold text-foreground">{stats.votaciones_completadas}</p>
            </Card>
            <Card className="border border-border/50 bg-card/50 p-6">
              <p className="text-sm text-muted-foreground mb-2">Propuestas Activas</p>
              <p className="text-3xl font-bold text-foreground">{stats.propuestas_activas}</p>
            </Card>
          </div>
        )}

        {resultados.length > 0 ? (
          <div className="space-y-4">
            {resultados.map((resultado) => (
              <Card
                key={resultado.propuesta_id}
                className="border border-border/50 bg-card/50 p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-muted font-bold text-lg">
                        #{resultado.posicion}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {resultado.razon_social}
                        </h3>
                      </div>
                      <div className={`rounded-full px-4 py-1 text-sm font-semibold ${getSemaforoColor(
                        resultado.estado_semaforo
                      )}`}>
                        {resultado.estado_semaforo === 'verde'
                          ? '✓ Alto desempeño'
                          : resultado.estado_semaforo === 'amarillo'
                            ? '◐ Medio'
                            : '✗ Bajo'}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold mb-1">
                          PUNTAJE EVALUACIÓN
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {resultado.puntaje_evaluacion.toFixed(2)}/5
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold mb-1">
                          VOTOS RECIBIDOS
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {resultado.votos_recibidos}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold mb-1">
                          PUNTAJE FINAL
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {resultado.puntaje_final.toFixed(2)}/5
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>Progreso</span>
                        <span>{((resultado.puntaje_final / 5) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full ${
                            resultado.estado_semaforo === 'verde'
                              ? 'bg-green-500'
                              : resultado.estado_semaforo === 'amarillo'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{
                            width: `${(resultado.puntaje_final / 5) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed p-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay resultados disponibles aún. Asegúrate de que todos los consejeros hayan completado sus evaluaciones y votos.
            </p>
          </Card>
        )}
      </main>
    </div>
  )
}
