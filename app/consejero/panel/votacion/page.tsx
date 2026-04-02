'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

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

interface EvaluacionItem {
  criterio_id: string
  valor: number
}

interface DatosEvaluacion {
  propuestas: Propuesta[]
  criterios: Array<{ id: string; nombre: string; peso: number }>
  evaluaciones: Array<{ propuesta_id: string; items: EvaluacionItem[] }>
  ya_voto: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(valor?: number | null) {
  if (!valor) return 'Sin dato'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function VotacionPage() {
  const router = useRouter()

  const [procesoId, setProcesoId] = useState<string | null>(null)
  const [loadingPerfil, setLoadingPerfil] = useState(true)
  const [datos, setDatos] = useState<DatosEvaluacion | null>(null)
  const [loadingDatos, setLoadingDatos] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [puedeVotar, setPuedeVotar] = useState(true)

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
        else setError('No hay proceso activo para votar.')
        if (d?.consejero?.puede_votar !== undefined) {
          setPuedeVotar(d.consejero.puede_votar)
        }
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
        if (!r.ok) throw new Error('No se pudo cargar los datos')
        return r.json()
      })
      .then((d: DatosEvaluacion) => {
        setDatos(d)
        if (d.ya_voto) {
          router.replace('/consejero/gracias')
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingDatos(false))
  }, [procesoId, router])

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
      router.push('/consejero/gracias')
    } catch (e: unknown) {
      setVoteError(e instanceof Error ? e.message : 'Error desconocido')
      setVoting(false)
    }
  }

  // ─── Loading / Error states ────────────────────────────────────────────────

  if (loadingPerfil || loadingDatos) {
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

  if (error || !datos) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Votación</h1>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error ?? 'No se pudo cargar los datos.'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { propuestas, evaluaciones, criterios } = datos

  // Verificar si todas las evaluaciones están completas
  function isComplete(propuestaId: string) {
    const ev = evaluaciones.find((e) => e.propuesta_id === propuestaId)
    if (!ev || !ev.items || !Array.isArray(ev.items)) return false
    return criterios.every((c) => {
      const item = ev.items?.find((i) => i.criterio_id === c.id)
      return item && item.valor > 0
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
              <Link href="/consejero/panel/evaluaciones">
                Ir a evaluar
              </Link>
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
          {puedeVotar ? 'Selecciona el candidato de tu preferencia y confirma tu voto' : 'Vista de votos registrados'}
        </p>
      </div>

      {!puedeVotar && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              No tienes permiso para emitir voto en este proceso, pero puedes consultar los candidatos y sus propuestas.
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
                <p>{p.unidades_administradas.toLocaleString('es-CO')} unidades administradas</p>
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
            onClick={() => {
              setVoteError(null)
              setConfirmOpen(true)
            }}
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
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={voting}
            >
              Cancelar
            </Button>
            <Button onClick={handleVote} disabled={voting}>
              {voting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmar voto
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
