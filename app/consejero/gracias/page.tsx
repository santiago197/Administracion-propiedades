'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  Trophy,
  Loader2,
  AlertCircle,
  Star,
  Users,
  BarChart3,
} from 'lucide-react'

interface RankingItem {
  posicion: number
  propuesta_id: string
  razon_social: string
  tipo_persona: string
  anios_experiencia: number
  valor_honorarios?: number | null
  puntaje_evaluacion: number
  votos_recibidos: number
  votos_contados: number
  puntaje_final: number
  clasificacion?: string | null
}

interface Participacion {
  votos_emitidos: number
  total_consejeros: number
  porcentaje: number
}

interface Resultados {
  ranking: RankingItem[]
  propuesta_votada_id: string | null
  voto_fecha: string | null
  participacion: Participacion
}

const CLAS_CLS: Record<string, string> = {
  destacado:    'bg-green-500/10 text-green-700 border-green-200',
  apto:         'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  condicionado: 'bg-orange-500/10 text-orange-700 border-orange-200',
  no_apto:      'bg-red-500/10 text-red-700 border-red-200',
}

const CLAS_LABEL: Record<string, string> = {
  destacado:    'Destacado',
  apto:         'Apto',
  condicionado: 'Condicionado',
  no_apto:      'No apto',
}

function formatCurrency(valor?: number | null) {
  if (!valor) return null
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

export default function GraciasPagina() {
  const [resultados, setResultados] = useState<Resultados | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/consejero/resultados')
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error)
        else setResultados(d)
      })
      .catch(() => setError('No se pudieron cargar los resultados'))
      .finally(() => setLoading(false))
  }, [])

  const maxPuntaje = resultados
    ? Math.max(...resultados.ranking.map((r) => r.puntaje_final), 1)
    : 1

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Confirmación del voto */}
        <Card className="border-green-200 bg-green-50 text-center p-8">
          <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-900 mb-2">¡Voto registrado!</h1>
          <p className="text-green-700 text-sm">
            Tu evaluación y voto han sido registrados exitosamente.
          </p>
        </Card>

        {/* Resultados del ranking */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando resultados…</span>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        ) : resultados && (
          <>
            {/* Participación */}
            <Card>
              <CardContent className="pt-5 pb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Participación del consejo
                  </span>
                  <span className="text-muted-foreground">
                    {resultados.participacion.votos_emitidos} de {resultados.participacion.total_consejeros} consejeros
                  </span>
                </div>
                <Progress value={resultados.participacion.porcentaje} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {resultados.participacion.porcentaje}% de participación
                </p>
              </CardContent>
            </Card>

            {/* Ranking */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Resultados actuales
                </CardTitle>
                <CardDescription>
                  Ordenados por puntaje final (evaluación + votos)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {resultados.ranking.map((r) => {
                  const esVotado = r.propuesta_id === resultados.propuesta_votada_id
                  const esPrimero = r.posicion === 1
                  return (
                    <div
                      key={r.propuesta_id}
                      className={`rounded-lg border p-4 space-y-2 transition-colors ${
                        esPrimero
                          ? 'border-amber-300 bg-amber-50'
                          : esVotado
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Posición */}
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                            esPrimero
                              ? 'bg-amber-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {esPrimero ? <Trophy className="h-4 w-4" /> : r.posicion}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{r.razon_social}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.anios_experiencia} años exp.
                              {r.valor_honorarios && ` · ${formatCurrency(r.valor_honorarios)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xl font-black text-primary tabular-nums">
                            {r.puntaje_final.toFixed(1)}
                          </span>
                          {r.clasificacion && (
                            <Badge className={CLAS_CLS[r.clasificacion] ?? ''} variant="outline">
                              {CLAS_LABEL[r.clasificacion] ?? r.clasificacion}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <Progress
                        value={(r.puntaje_final / maxPuntaje) * 100}
                        className="h-1.5"
                      />

                      {/* Detalles y etiquetas */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Eval: {r.puntaje_evaluacion.toFixed(1)} · Votos: {r.votos_contados}</span>
                        <div className="flex gap-2">
                          {esVotado && (
                            <Badge variant="outline" className="text-primary border-primary/40 bg-primary/5 text-xs py-0">
                              <Star className="h-3 w-3 mr-1 fill-primary" />
                              Tu voto
                            </Badge>
                          )}
                          {esPrimero && (
                            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs py-0">
                              Puntero
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {resultados.ranking.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay resultados disponibles aún.
                  </p>
                )}

                <p className="text-xs text-muted-foreground pt-1">
                  Los resultados se actualizan en tiempo real conforme los consejeros emiten su voto.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/">Volver a Inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
