'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
} from 'lucide-react'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface Criterio {
  id: string
  nombre: string
  descripcion?: string | null
  peso: number
  tipo?: 'numerico' | 'booleano' | 'escala'
  valor_minimo?: number
  valor_maximo?: number
  orden?: number
}

interface Propuesta {
  id: string
  razon_social: string
  tipo_persona: 'juridica' | 'natural'
  nit_cedula: string
  anios_experiencia: number
  unidades_administradas: number
}

interface EvaluacionItem {
  criterio_id: string
  valor: number
}

// evaluaciones[propuesta_id][criterio_id] = valor
type EvaluacionesState = Record<string, Record<string, number>>

interface DatosEvaluacion {
  propuestas: Propuesta[]
  criterios: Criterio[]
  evaluaciones: Array<{
    propuesta_id: string
    items: EvaluacionItem[]
  }>
  ya_voto: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const SCORE_LABELS: Record<number, string> = {
  1: 'Muy bajo',
  2: 'Bajo',
  3: 'Regular',
  4: 'Bueno',
  5: 'Excelente',
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function EvaluacionesPage() {
  const router = useRouter()

  // proceso_id obtenido de /api/consejero/perfil
  const [procesoId, setProcesoId] = useState<string | null>(null)
  const [loadingPerfil, setLoadingPerfil] = useState(true)

  // datos de evaluación
  const [datos, setDatos] = useState<DatosEvaluacion | null>(null)
  const [loadingDatos, setLoadingDatos] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // índice del candidato actual (carousel)
  const [currentIdx, setCurrentIdx] = useState(0)

  // estado local de evaluaciones
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionesState>({})

  // saving state per propuesta
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saveError, setSaveError] = useState<Record<string, string>>({})

  // 1. Obtener proceso_id
  useEffect(() => {
    fetch('/api/consejero/perfil')
      .then((r) => r.json())
      .then((d) => {
        if (d?.proceso?.id) setProcesoId(d.proceso.id)
        else setError('No hay proceso activo para evaluar.')
      })
      .catch(() => setError('No se pudo obtener el proceso activo.'))
      .finally(() => setLoadingPerfil(false))
  }, [])

  // 2. Cargar datos de evaluación
  useEffect(() => {
    if (!procesoId) return
    setLoadingDatos(true)
    fetch(`/api/evaluacion/datos?proceso_id=${procesoId}`)
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar las evaluaciones')
        return r.json()
      })
      .then((d: DatosEvaluacion) => {
        setDatos(d)
        if (d.ya_voto) {
          router.replace('/consejero/gracias')
          return
        }
        // Inicializar estado local con evaluaciones existentes
        const init: EvaluacionesState = {}
        for (const ev of d.evaluaciones ?? []) {
          init[ev.propuesta_id] = {}
          for (const item of ev.items ?? []) {
            init[ev.propuesta_id][item.criterio_id] = item.valor
          }
        }
        setEvaluaciones(init)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingDatos(false))
  }, [procesoId, router])

  const handleScore = useCallback(
    async (propuestaId: string, criterioId: string, valor: number) => {
      if (!procesoId) return

      // Actualizar estado local inmediatamente
      setEvaluaciones((prev) => ({
        ...prev,
        [propuestaId]: {
          ...(prev[propuestaId] ?? {}),
          [criterioId]: valor,
        },
      }))

      // Auto-save
      setSaving((prev) => ({ ...prev, [propuestaId]: true }))
      setSaveError((prev) => ({ ...prev, [propuestaId]: '' }))

      try {
        const currentItems = {
          ...(evaluaciones[propuestaId] ?? {}),
          [criterioId]: valor,
        }
        const items = Object.entries(currentItems).map(([cid, v]) => ({
          criterio_id: cid,
          valor: v,
        }))

        const res = await fetch('/api/evaluacion/guardar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proceso_id: procesoId, propuesta_id: propuestaId, items }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error ?? 'Error al guardar')
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al guardar'
        setSaveError((prev) => ({ ...prev, [propuestaId]: msg }))
      } finally {
        setSaving((prev) => ({ ...prev, [propuestaId]: false }))
      }
    },
    [evaluaciones, procesoId]
  )

  // ─── Loading / Error states ────────────────────────────────────────────────

  if (loadingPerfil || loadingDatos) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse mt-2" />
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !datos) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evaluaciones</h1>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error ?? 'No se pudo cargar las evaluaciones.'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { propuestas, criterios } = datos
  const totalCandidatos = propuestas.length

  if (totalCandidatos === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evaluaciones</h1>
          <p className="text-muted-foreground">Evalúa las propuestas según los criterios definidos</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
            <p className="text-sm">No hay candidatos habilitados para evaluar.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  function isComplete(propuestaId: string) {
    const evs = evaluaciones[propuestaId] ?? {}
    return criterios.every((c) => evs[c.id] !== undefined)
  }

  const totalEvaluadas = propuestas.filter((p) => isComplete(p.id)).length
  const progresoPct = Math.round((totalEvaluadas / totalCandidatos) * 100)

  const current = propuestas[currentIdx]
  const evCurrent = evaluaciones[current?.id] ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Evaluaciones</h1>
        <p className="text-muted-foreground">
          Evalúa cada candidato según los criterios del proceso
        </p>
      </div>

      {/* Progreso global */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progreso general</span>
            <span className="text-muted-foreground">
              {totalEvaluadas} de {totalCandidatos} candidatos evaluados
            </span>
          </div>
          <Progress value={progresoPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Miniaturas de candidatos */}
      <div className="flex flex-wrap gap-2">
        {propuestas.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => setCurrentIdx(idx)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              idx === currentIdx
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-accent'
            }`}
          >
            {isComplete(p.id) && (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            )}
            <span className="truncate max-w-[120px]">{p.razon_social}</span>
          </button>
        ))}
      </div>

      {/* Panel del candidato actual */}
      {current && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">{current.razon_social}</CardTitle>
                <CardDescription>
                  {current.tipo_persona === 'juridica' ? 'NIT' : 'C.C.'}: {current.nit_cedula}
                  {' · '}
                  {current.anios_experiencia} años exp.
                  {current.unidades_administradas > 0 &&
                    ` · ${current.unidades_administradas.toLocaleString('es-CO')} unidades`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isComplete(current.id) ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Completo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    Pendiente
                  </Badge>
                )}
                {saving[current.id] && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            {saveError[current.id] && (
              <p className="text-xs text-destructive mt-1">{saveError[current.id]}</p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {criterios
              .slice()
              .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
              .map((criterio) => {
                const score = evCurrent[criterio.id] ?? 0
                return (
                  <div key={criterio.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{criterio.nombre}</p>
                        {criterio.descripcion && (
                          <p className="text-xs text-muted-foreground">{criterio.descripcion}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        Peso: {criterio.peso}%
                      </span>
                    </div>
                    {criterio.tipo === 'booleano' ? (
                      <div className="flex flex-wrap gap-2">
                        {[0, 1].map((v) => (
                          <button
                            key={v}
                            onClick={() => handleScore(current.id, criterio.id, v)}
                            className={`flex flex-col items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors min-w-[90px] ${
                              score === v
                                ? v === 1
                                  ? 'border-green-500 bg-green-600 text-white shadow'
                                  : 'border-destructive bg-destructive text-destructive-foreground shadow'
                                : 'border-border bg-card hover:bg-accent hover:border-accent-foreground/20'
                            }`}
                          >
                            <span className="text-sm font-semibold leading-none">{v === 1 ? 'Cumple' : 'No cumple'}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {Array.from(
                          { length: (criterio.valor_maximo ?? 5) - (criterio.valor_minimo ?? 1) + 1 },
                          (_, idx) => (criterio.valor_minimo ?? 1) + idx
                        ).map((v) => (
                          <button
                            key={v}
                            onClick={() => handleScore(current.id, criterio.id, v)}
                            className={`flex flex-col items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors min-w-[70px] ${
                              score === v
                                ? 'border-primary bg-primary text-primary-foreground shadow'
                                : 'border-border bg-card hover:bg-accent hover:border-accent-foreground/20'
                            }`}
                          >
                            <span className="text-lg font-bold leading-none">{v}</span>
                            <span className="mt-0.5">{SCORE_LABELS[v] ?? 'Valor'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
          </CardContent>
        </Card>
      )}

      {/* Navegación prev / next */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIdx + 1} / {totalCandidatos}
        </span>
        <Button
          variant="outline"
          onClick={() => setCurrentIdx((i) => Math.min(totalCandidatos - 1, i + 1))}
          disabled={currentIdx === totalCandidatos - 1}
        >
          Siguiente
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* CTA cuando todas evaluadas */}
      {totalEvaluadas === totalCandidatos && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium">
                ¡Has evaluado todos los candidatos! Ya puedes emitir tu voto.
              </p>
            </div>
            <Button
              asChild
              className="shrink-0"
              variant="default"
            >
              <Link href="/consejero/panel/votacion">Ir a votar</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
