'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Vote,
  Trophy,
  Star,
  Users,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface Propuesta {
  id: string
  razon_social: string
  tipo_persona: 'juridica' | 'natural'
  nit_cedula: string
  anios_experiencia: number
  unidades_administradas: number
  valor_honorarios?: number | null
}

interface EvaluacionFlat {
  propuesta_id: string
  criterio_id: string
  valor: number
}

interface DatosVotacion {
  propuestas: Propuesta[]
  criterios: Array<{ id: string; nombre: string; peso: number }>
  evaluaciones: EvaluacionFlat[]
  ya_voto: boolean
}

interface RankingItem {
  posicion: number
  propuesta_id: string
  razon_social: string
  anios_experiencia: number
  valor_honorarios?: number | null
  puntaje_evaluacion: number
  votos_contados: number
  puntaje_final: number
  clasificacion?: string | null
}

interface Resultados {
  ranking: RankingItem[]
  propuesta_votada_id: string | null
  participacion: {
    votos_emitidos: number
    total_consejeros: number
    porcentaje: number
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)
}

// ─── Vista de resultados ────────────────────────────────────────────────────

function VistaResultados({ resultados }: { resultados: Resultados }) {
  const { ranking, propuesta_votada_id, participacion } = resultados
  const ganador = ranking[0] ?? null
  const maxPuntaje = Math.max(...ranking.map((r) => r.puntaje_final), 1)

  return (
    <div className="space-y-5">
      {/* Participación */}
      <Card>
        <CardContent className="pt-5 pb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Users className="h-4 w-4 text-muted-foreground" />
              Participación del consejo
            </span>
            <span className="text-muted-foreground">
              {participacion.votos_emitidos} de {participacion.total_consejeros} consejeros
            </span>
          </div>
          <Progress value={participacion.porcentaje} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{participacion.porcentaje}%</p>
        </CardContent>
      </Card>

      {/* Ganador */}
      {ganador && participacion.votos_emitidos > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-700 font-medium uppercase tracking-wide mb-0.5">
              Propuesta más votada
            </p>
            <p className="font-bold text-lg truncate">{ganador.razon_social}</p>
            <p className="text-sm text-muted-foreground">
              {ganador.votos_contados} voto{ganador.votos_contados !== 1 ? 's' : ''}
              {' · '}Puntaje final: {ganador.puntaje_final.toFixed(1)}
              {ganador.clasificacion && (
                <> · <span className="font-medium">{CLAS_LABEL[ganador.clasificacion] ?? ganador.clasificacion}</span></>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Ranking completo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Resultados por candidato
          </CardTitle>
          <CardDescription>Ordenados por puntaje final (evaluación + votos)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ranking.map((r) => {
            const esVotado = r.propuesta_id === propuesta_votada_id
            const esPrimero = r.posicion === 1
            return (
              <div
                key={r.propuesta_id}
                className={`rounded-lg border p-4 space-y-2 ${
                  esPrimero
                    ? 'border-amber-300 bg-amber-50'
                    : esVotado
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                      esPrimero ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
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
                <Progress value={(r.puntaje_final / maxPuntaje) * 100} className="h-1.5" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Eval: {r.puntaje_evaluacion.toFixed(1)} · Votos: {r.votos_contados}</span>
                  <div className="flex gap-2">
                    {esVotado && (
                      <Badge variant="outline" className="text-primary border-primary/40 bg-primary/5 text-xs py-0">
                        <Star className="h-3 w-3 mr-1 fill-primary" />
                        Tu voto
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {ranking.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay resultados disponibles aún.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function VotacionPage() {
  const [procesoId, setProcesoId] = useState<string | null>(null)
  const [puedeVotar, setPuedeVotar] = useState(true)
  const [loadingPerfil, setLoadingPerfil] = useState(true)

  // Estado para el formulario de voto
  const [datos, setDatos] = useState<DatosVotacion | null>(null)
  const [loadingDatos, setLoadingDatos] = useState(false)

  // Estado para resultados (cuando ya votó o proceso finalizado)
  const [resultados, setResultados] = useState<Resultados | null>(null)
  const [loadingResultados, setLoadingResultados] = useState(false)

  // true cuando el consejero ya votó o el proceso no permite votar
  const [modoResultados, setModoResultados] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Propuesta | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [voting, setVoting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)

  // 1. Obtener proceso_id y puede_votar
  useEffect(() => {
    fetch('/api/consejero/perfil')
      .then((r) => r.json())
      .then((d) => {
        if (d?.proceso?.id) setProcesoId(d.proceso.id)
        else setError('No hay proceso activo.')
        if (d?.consejero?.puede_votar !== undefined) setPuedeVotar(d.consejero.puede_votar)
        // Si ya votó, ir directo a resultados
        if (d?.progreso?.voto_registrado) setModoResultados(true)
      })
      .catch(() => setError('No se pudo obtener el proceso activo.'))
      .finally(() => setLoadingPerfil(false))
  }, [])

  // 2a. Cargar datos de votación (cuando NO ha votado aún)
  useEffect(() => {
    if (!procesoId || modoResultados) return
    setLoadingDatos(true)
    fetch(`/api/evaluacion/datos?proceso_id=${procesoId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) {
          // El proceso puede estar en un estado distinto (ej. finalizado) — ir a resultados
          setModoResultados(true)
        } else {
          if (d.ya_voto) {
            setModoResultados(true)
          } else {
            setDatos(d)
          }
        }
      })
      .catch(() => setModoResultados(true))
      .finally(() => setLoadingDatos(false))
  }, [procesoId, modoResultados])

  // 2b. Cargar resultados cuando es modo resultados
  useEffect(() => {
    if (!modoResultados) return
    setLoadingResultados(true)
    fetch('/api/consejero/resultados')
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error)
        else setResultados(d)
      })
      .catch(() => setError('No se pudieron cargar los resultados.'))
      .finally(() => setLoadingResultados(false))
  }, [modoResultados])

  async function handleVote() {
    if (!selected || !procesoId) return
    setVoting(true)
    setVoteError(null)
    try {
      const res = await fetch('/api/evaluacion/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proceso_id: procesoId, propuesta_id: selected.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Error al registrar el voto')
      // Tras votar exitosamente, cambiar a modo resultados
      setModoResultados(true)
    } catch (e: unknown) {
      setVoteError(e instanceof Error ? e.message : 'Error desconocido')
      setVoting(false)
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loadingPerfil || loadingDatos || loadingResultados) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-40 rounded bg-muted animate-pulse" />
          <div className="h-4 w-56 rounded bg-muted animate-pulse mt-2" />
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Votación</h1>
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Modo resultados (ya votó o proceso finalizado) ───────────────────────

  if (modoResultados) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resultado de la votación</h1>
          <p className="text-muted-foreground">
            {resultados?.propuesta_votada_id
              ? 'Tu voto ha sido registrado. Aquí están los resultados actuales.'
              : 'Resultados del proceso de selección.'}
          </p>
        </div>

        {resultados ? (
          <VistaResultados resultados={resultados} />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ─── Modo votación (aún no ha votado) ────────────────────────────────────

  if (!datos) return null

  const { propuestas, evaluaciones, criterios } = datos

  function isComplete(propuestaId: string) {
    const evsPropuesta = evaluaciones.filter((e) => e.propuesta_id === propuestaId)
    if (evsPropuesta.length === 0) return false
    return criterios.every((c) => {
      const ev = evsPropuesta.find((e) => e.criterio_id === c.id)
      return ev !== undefined && ev.valor !== undefined && ev.valor !== null
    })
  }

  const todasEvaluadas = propuestas.length > 0 && propuestas.every((p) => isComplete(p.id))

  if (!todasEvaluadas) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Votación</h1>
          <p className="text-muted-foreground">Emite tu voto para seleccionar al administrador</p>
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-6">
            <div className="flex items-start gap-3">
              <ClipboardList className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-900">Debes evaluar todos los candidatos primero</p>
                <p className="text-sm text-amber-700 mt-1">
                  Completa la evaluación de todos los candidatos antes de poder votar.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/consejero/panel/evaluaciones">Ir a evaluar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Votación</h1>
        <p className="text-muted-foreground">
          {puedeVotar
            ? 'Selecciona el candidato de tu preferencia y confirma tu voto'
            : 'Vista de candidatos (sin permiso de voto)'}
        </p>
      </div>

      {!puedeVotar && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              No tienes permiso para emitir voto en este proceso, pero puedes consultar los candidatos.
            </p>
          </CardContent>
        </Card>
      )}

      {puedeVotar && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 py-4">
            <Vote className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800">
              Solo puedes votar una vez. Tu voto es definitivo e irrevocable. Elige con cuidado.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas de candidatos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {propuestas.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={!puedeVotar}
            onClick={() => puedeVotar && setSelected(p)}
            className={`text-left rounded-xl border-2 p-4 transition-all ${
              selected?.id === p.id
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
            } ${!puedeVotar ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              {selected?.id === p.id && puedeVotar && (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              )}
            </div>
            <p className="font-semibold text-sm leading-tight mb-1">{p.razon_social}</p>
            <p className="text-xs text-muted-foreground mb-3">
              {p.tipo_persona === 'juridica' ? 'NIT' : 'C.C.'}: {p.nit_cedula}
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{p.anios_experiencia} años de experiencia</p>
              {p.unidades_administradas > 0 && (
                <p>{p.unidades_administradas.toLocaleString('es-CO')} unidades</p>
              )}
              {p.valor_honorarios && (
                <p className="font-medium text-foreground">
                  Honorarios: {formatCurrency(p.valor_honorarios)}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Botón votar */}
      {puedeVotar && (
        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={!selected}
            onClick={() => { setVoteError(null); setConfirmOpen(true) }}
          >
            <Vote className="mr-2 h-5 w-5" />
            Emitir voto
            {selected && (
              <span className="ml-2 max-w-[120px] truncate opacity-80 text-sm">
                — {selected.razon_social}
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Dialog confirmación */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !voting && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar voto</DialogTitle>
            <DialogDescription>
              Esta acción es definitiva. Una vez confirmado, no podrás cambiar tu voto.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="rounded-lg border bg-muted/50 p-4 my-2">
              <p className="text-sm text-muted-foreground">Candidato seleccionado</p>
              <p className="font-semibold mt-1">{selected.razon_social}</p>
              <p className="text-xs text-muted-foreground">
                {selected.tipo_persona === 'juridica' ? 'NIT' : 'C.C.'}: {selected.nit_cedula}
              </p>
            </div>
          )}

          {voteError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{voteError}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={voting}>
              Cancelar
            </Button>
            <Button onClick={handleVote} disabled={voting}>
              {voting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando…</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" />Confirmar voto</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
