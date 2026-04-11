'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Star,
  MessageSquare,
  BarChart3,
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
  estado?: string
  observacion_entrevista?: string | null
}

interface EvaluacionItem {
  criterio_id: string
  valor: number
  comentario?: string
}

// evaluaciones[propuesta_id][criterio_id] = valor
type EvaluacionesState = Record<string, Record<string, number>>
// comentarios[propuesta_id][criterio_id] = comentario
type ComentariosState = Record<string, Record<string, string>>

interface DatosEvaluacion {
  propuestas: Propuesta[]
  criterios: Criterio[]
  evaluaciones: Array<{
    propuesta_id: string
    criterio_id: string
    valor: number
    comentario?: string | null
  }>
  ya_voto: boolean
}

// Resultado guardado por propuesta
interface ResultadoGuardado {
  propuesta_id: string
  criterios: Array<{
    criterio: Criterio
    valor: number
    comentario: string
  }>
  puntajeTotal: number
  puntajePonderado: number
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

  const [procesoId, setProcesoId] = useState<string | null>(null)
  const [loadingPerfil, setLoadingPerfil] = useState(true)

  const [datos, setDatos] = useState<DatosEvaluacion | null>(null)
  const [loadingDatos, setLoadingDatos] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentIdx, setCurrentIdx] = useState(0)

  const [evaluaciones, setEvaluaciones] = useState<EvaluacionesState>({})
  const [comentarios, setComentarios] = useState<ComentariosState>({})

  // propuestas que tienen cambios sin guardar
  const [changedPropuestas, setChangedPropuestas] = useState<Set<string>>(new Set())

  // saving state per propuesta
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saveError, setSaveError] = useState<Record<string, string>>({})

  // resultados guardados por propuesta_id
  const [resultados, setResultados] = useState<Record<string, ResultadoGuardado>>({})

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
        const initEv: EvaluacionesState = {}
        const initCom: ComentariosState = {}
        const initResultados: Record<string, ResultadoGuardado> = {}

        for (const ev of d.evaluaciones ?? []) {
          if (!initEv[ev.propuesta_id]) initEv[ev.propuesta_id] = {}
          if (!initCom[ev.propuesta_id]) initCom[ev.propuesta_id] = {}
          initEv[ev.propuesta_id][ev.criterio_id] = ev.valor
          if (ev.comentario) initCom[ev.propuesta_id][ev.criterio_id] = ev.comentario
        }

        // Construir resultados iniciales para propuestas ya evaluadas
        const criteriosMap = Object.fromEntries(d.criterios.map((c) => [c.id, c]))
        const propuestasConEv = Object.keys(initEv)
        for (const pid of propuestasConEv) {
          const evs = initEv[pid] ?? {}
          const coms = initCom[pid] ?? {}
          if (d.criterios.every((c) => evs[c.id] !== undefined)) {
            const detalle = d.criterios.map((c) => ({
              criterio: c,
              valor: evs[c.id] ?? 0,
              comentario: coms[c.id] ?? '',
            }))
            const ponderado = detalle.reduce((acc, item) => {
              const max = criteriosMap[item.criterio.id]?.valor_maximo ?? 5
              const min = criteriosMap[item.criterio.id]?.valor_minimo ?? 1
              const rango = max - min || 1
              const normalizado = item.criterio.tipo === 'booleano'
                ? item.valor
                : (item.valor - min) / rango
              return acc + normalizado * item.criterio.peso
            }, 0)
            initResultados[pid] = {
              propuesta_id: pid,
              criterios: detalle,
              puntajeTotal: detalle.reduce((a, b) => a + b.valor, 0),
              puntajePonderado: Math.round(ponderado * 10) / 10,
            }
          }
        }

        setEvaluaciones(initEv)
        setComentarios(initCom)
        setResultados(initResultados)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingDatos(false))
  }, [procesoId, router])

  const handleScore = useCallback(
    (propuestaId: string, criterioId: string, valor: number) => {
      setEvaluaciones((prev) => ({
        ...prev,
        [propuestaId]: { ...(prev[propuestaId] ?? {}), [criterioId]: valor },
      }))
      setChangedPropuestas((prev) => new Set(prev).add(propuestaId))
    },
    []
  )

  const handleComentario = useCallback(
    (propuestaId: string, criterioId: string, texto: string) => {
      setComentarios((prev) => ({
        ...prev,
        [propuestaId]: { ...(prev[propuestaId] ?? {}), [criterioId]: texto },
      }))
      setChangedPropuestas((prev) => new Set(prev).add(propuestaId))
    },
    []
  )

  const handleGuardarCandidato = useCallback(
    async (propuestaId: string) => {
      if (!procesoId || !datos) return

      const evs = evaluaciones[propuestaId] ?? {}
      const coms = comentarios[propuestaId] ?? {}

      if (!datos.criterios.every((c) => evs[c.id] !== undefined)) {
        setSaveError((prev) => ({
          ...prev,
          [propuestaId]: 'Debes calificar todos los criterios antes de guardar',
        }))
        return
      }

      setSaving((prev) => ({ ...prev, [propuestaId]: true }))
      setSaveError((prev) => ({ ...prev, [propuestaId]: '' }))

      const items: EvaluacionItem[] = Object.entries(evs).map(([cid, v]) => ({
        criterio_id: cid,
        valor: v,
        comentario: coms[cid] ?? '',
      }))

      try {
        const res = await fetch('/api/evaluacion/guardar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proceso_id: procesoId, propuesta_id: propuestaId, items }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setSaveError((prev) => ({
            ...prev,
            [propuestaId]: data?.error ?? 'Error al guardar',
          }))
          return
        }

        // Construir resultado guardado
        const criteriosMap = Object.fromEntries(datos.criterios.map((c) => [c.id, c]))
        const detalle = datos.criterios.map((c) => ({
          criterio: c,
          valor: evs[c.id] ?? 0,
          comentario: coms[c.id] ?? '',
        }))
        const ponderado = detalle.reduce((acc, item) => {
          const max = criteriosMap[item.criterio.id]?.valor_maximo ?? 5
          const min = criteriosMap[item.criterio.id]?.valor_minimo ?? 1
          const rango = max - min || 1
          const normalizado = item.criterio.tipo === 'booleano'
            ? item.valor
            : (item.valor - min) / rango
          return acc + normalizado * item.criterio.peso
        }, 0)

        setResultados((prev) => ({
          ...prev,
          [propuestaId]: {
            propuesta_id: propuestaId,
            criterios: detalle,
            puntajeTotal: detalle.reduce((a, b) => a + b.valor, 0),
            puntajePonderado: Math.round(ponderado * 10) / 10,
          },
        }))

        setChangedPropuestas((prev) => {
          const next = new Set(prev)
          next.delete(propuestaId)
          return next
        })
      } catch {
        setSaveError((prev) => ({
          ...prev,
          [propuestaId]: 'Error de conexión al guardar',
        }))
      } finally {
        setSaving((prev) => ({ ...prev, [propuestaId]: false }))
      }
    },
    [evaluaciones, comentarios, procesoId, datos]
  )

  // ─── Loading / Error states ─────────────────────────────────────────────────

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

  function isGuardado(propuestaId: string) {
    return !!resultados[propuestaId] && !changedPropuestas.has(propuestaId)
  }

  const totalEvaluadas = propuestas.filter((p) => isGuardado(p.id)).length
  const progresoPct = Math.round((totalEvaluadas / totalCandidatos) * 100)

  const current = propuestas[currentIdx]
  const evCurrent = evaluaciones[current?.id] ?? {}
  const comCurrent = comentarios[current?.id] ?? {}
  const resultadoCurrent = resultados[current?.id]
  const guardadoCurrent = isGuardado(current?.id)

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
              {totalEvaluadas} de {totalCandidatos} candidatos evaluados y guardados
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
                ? p.estado === 'preseleccionado'
                  ? 'border-violet-600 bg-violet-600 text-white'
                  : 'border-primary bg-primary text-primary-foreground'
                : p.estado === 'preseleccionado'
                ? 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'
                : 'border-border bg-card hover:bg-accent'
            }`}
          >
            {p.estado === 'preseleccionado' && (
              <Star className="h-3.5 w-3.5 fill-current shrink-0" />
            )}
            {isGuardado(p.id) && p.estado !== 'preseleccionado' && (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            )}
            {changedPropuestas.has(p.id) && !isGuardado(p.id) && p.estado !== 'preseleccionado' && (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            )}
            <span className="truncate max-w-[120px]">{p.razon_social}</span>
          </button>
        ))}
      </div>

      {/* Panel del candidato actual */}
      {current && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg">{current.razon_social}</CardTitle>
                  {current.estado === 'preseleccionado' && (
                    <Badge className="bg-violet-100 text-violet-700 border-violet-300">
                      <Star className="mr-1 h-3 w-3 fill-violet-500 text-violet-500" />
                      Preseleccionado por entrevista
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {current.tipo_persona === 'juridica' ? 'NIT' : 'C.C.'}: {current.nit_cedula}
                  {' · '}
                  {current.anios_experiencia} años exp.
                  {current.unidades_administradas > 0 &&
                    ` · ${current.unidades_administradas.toLocaleString('es-CO')} unidades`}
                </CardDescription>
                {current.estado === 'preseleccionado' && current.observacion_entrevista && (
                  <div className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 mt-2">
                    <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-violet-500 shrink-0" />
                    <p className="text-xs text-violet-700 italic">{current.observacion_entrevista}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {guardadoCurrent ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Guardado
                  </Badge>
                ) : isComplete(current.id) ? (
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    Listo para guardar
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
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ── Vista de resultado guardado ── */}
            {guardadoCurrent && resultadoCurrent ? (
              <div className="space-y-4">
                {/* Resumen de puntaje */}
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-semibold text-sm">Calificación registrada</span>
                  </div>
                  <div className="ml-auto flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Puntaje ponderado</p>
                      <p className="text-2xl font-bold text-green-700">
                        {resultadoCurrent.puntajePonderado}
                        <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detalle por criterio */}
                <div className="space-y-3">
                  {resultadoCurrent.criterios.map((item) => {
                    const max = item.criterio.valor_maximo ?? 5
                    const min = item.criterio.valor_minimo ?? 1
                    const contribution = item.criterio.tipo === 'booleano'
                      ? item.valor * item.criterio.peso
                      : ((item.valor - min) / (max - min || 1)) * item.criterio.peso
                    return (
                      <div key={item.criterio.id} className="rounded-lg border bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{item.criterio.nombre}</p>
                            {item.criterio.descripcion && (
                              <p className="text-xs text-muted-foreground">{item.criterio.descripcion}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1.5 justify-end">
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              <span className="font-bold text-sm">
                                {item.criterio.tipo === 'booleano'
                                  ? item.valor === 1 ? 'Cumple' : 'No cumple'
                                  : `${item.valor} / ${max}`}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Aporte: {Math.round(contribution * 10) / 10} pts (peso {item.criterio.peso}%)
                            </p>
                          </div>
                        </div>
                        {item.comentario && (
                          <div className="flex items-start gap-2 rounded bg-muted/50 px-3 py-2">
                            <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                            <p className="text-xs text-muted-foreground italic">{item.comentario}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Botón para editar */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setChangedPropuestas((prev) => new Set(prev).add(current.id))
                  }}
                >
                  Editar evaluación
                </Button>
              </div>
            ) : (
              /* ── Vista de edición ── */
              <div className="space-y-6">
                {criterios
                  .slice()
                  .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                  .map((criterio) => {
                    const score = evCurrent[criterio.id] ?? 0
                    const comentario = comCurrent[criterio.id] ?? ''
                    return (
                      <div key={criterio.id} className="space-y-3">
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

                        {/* Botones de puntaje */}
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
                                <span className="text-sm font-semibold leading-none">
                                  {v === 1 ? 'Cumple' : 'No cumple'}
                                </span>
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

                        {/* Observación por criterio */}
                        <Textarea
                          placeholder={`Observación sobre ${criterio.nombre.toLowerCase()} (opcional)`}
                          value={comentario}
                          onChange={(e) => handleComentario(current.id, criterio.id, e.target.value)}
                          className="text-xs min-h-[60px] resize-none"
                          rows={2}
                        />

                        <Separator />
                      </div>
                    )
                  })}

                {/* Error de guardado */}
                {saveError[current.id] && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {saveError[current.id]}
                  </p>
                )}

                {/* Botón guardar este candidato */}
                <Button
                  onClick={() => handleGuardarCandidato(current.id)}
                  disabled={saving[current.id] || !isComplete(current.id)}
                  className="w-full gap-2"
                >
                  {saving[current.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isComplete(current.id)
                    ? 'Guardar evaluación de este candidato'
                    : 'Completa todos los criterios para guardar'}
                </Button>
              </div>
            )}
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

      {/* CTA cuando todos guardados */}
      {totalEvaluadas === totalCandidatos && totalCandidatos > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium">
                ¡Has evaluado todos los candidatos! Ya puedes emitir tu voto.
              </p>
            </div>
            <Button asChild className="shrink-0" variant="default">
              <Link href="/consejero/panel/votacion">Ir a votar</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
