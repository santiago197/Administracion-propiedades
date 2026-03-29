'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Criterio } from '@/lib/types/index'

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface PropuestaResumen {
  id: string
  razon_social: string
  tipo_persona: 'juridica' | 'natural'
  nit_cedula: string
  representante_legal?: string
  anios_experiencia: number
  unidades_administradas: number
  valor_honorarios?: number
}

interface DocumentoResumen {
  id: string
  propuesta_id: string
  nombre: string
  tipo: string
  estado: string
  archivo_url?: string | null
}

interface ConsejeroPerfil {
  id: string
  nombre_completo: string
  cargo: string
}

interface EvaluacionDB {
  propuesta_id: string
  criterio_id: string
  valor: number
}

/** { [propuesta_id]: { [criterio_id]: valor } } */
type EvaluacionesState = Record<string, Record<string, number>>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEvaluacionesState(rows: EvaluacionDB[]): EvaluacionesState {
  return rows.reduce<EvaluacionesState>((acc, ev) => {
    if (!acc[ev.propuesta_id]) acc[ev.propuesta_id] = {}
    acc[ev.propuesta_id][ev.criterio_id] = ev.valor
    return acc
  }, {})
}

function isPropuestaCompleta(
  propuestaId: string,
  criterios: Criterio[],
  evaluaciones: EvaluacionesState
): boolean {
  return criterios.every((c) => evaluaciones[propuestaId]?.[c.id] !== undefined)
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PaginaEvaluacion() {
  const params = useParams()
  const router = useRouter()
  const procesoId = params.procesoId as string

  const [propuestas, setPropuestas] = useState<PropuestaResumen[]>([])
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionesState>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentos, setDocumentos] = useState<DocumentoResumen[]>([])
  const [consejero, setConsejero] = useState<ConsejeroPerfil | null>(null)

  const fetchDatos = useCallback(
    async () => {
      try {
        const res = await fetch(`/api/evaluacion/datos?proceso_id=${procesoId}`)

        if (!res.ok) {
          const { error: msg } = await res.json()
          setError(msg ?? 'Error al cargar los datos')
          return
        }

        const {
          propuestas: props,
          criterios: crits,
          evaluaciones: evDB,
          documentos: docs,
          consejero: consejeroActual,
          ya_voto,
        } = await res.json()

        if (ya_voto) {
          router.replace('/consejero/gracias')
          return
        }

        setPropuestas(props)
        setCriterios(crits)
        setDocumentos(docs ?? [])
        setConsejero(consejeroActual ?? null)

        const estado = buildEvaluacionesState(evDB)
        setEvaluaciones(estado)

        // Colocar al consejero en la primera propuesta incompleta
        const primeraSin = (props as PropuestaResumen[]).findIndex(
          (p) => !isPropuestaCompleta(p.id, crits, estado)
        )
        setCurrentIndex(primeraSin === -1 ? Math.max(0, props.length - 1) : primeraSin)
      } catch (err) {
        console.error('[evaluacion] fetch error:', err)
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    },
    [procesoId, router]
  )

  useEffect(() => {
    fetchDatos()
  }, [fetchDatos, router])

  const handleEvaluacion = (criterioId: string, valor: number) => {
    const propuestaId = propuestas[currentIndex].id
    setEvaluaciones((prev) => ({
      ...prev,
      [propuestaId]: { ...(prev[propuestaId] ?? {}), [criterioId]: valor },
    }))
  }

  const handleGuardar = async () => {
    const propuesta = propuestas[currentIndex]
    const vals = evaluaciones[propuesta.id] ?? {}
    const items = criterios.map((c) => ({ criterio_id: c.id, valor: vals[c.id] }))

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/evaluacion/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proceso_id: procesoId,
          propuesta_id: propuesta.id,
          items,
        }),
      })

      if (!res.ok) {
        const { error: msg } = await res.json()
        setError(msg ?? 'Error al guardar')
        return
      }

      const { evaluacion_completa } = await res.json()

      if (currentIndex < propuestas.length - 1) {
        setCurrentIndex(currentIndex + 1)
        return
      }

      if (evaluacion_completa) {
        router.push(`/consejero/votacion/${procesoId}`)
        return
      }

      // Quedan propuestas sin evaluar — ir a la primera
      const primeraSin = propuestas.findIndex(
        (p) => !isPropuestaCompleta(p.id, criterios, evaluaciones)
      )
      if (primeraSin !== -1) {
        setCurrentIndex(primeraSin)
      } else {
        router.push(`/consejero/votacion/${procesoId}`)
      }
    } catch (err) {
      console.error('[evaluacion] save error:', err)
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-xl font-bold">Evaluación de Propuestas</p>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
          <Card className="h-40 animate-pulse bg-card/50" />
          <Card className="h-64 animate-pulse bg-card/50" />
        </main>
      </div>
    )
  }

  if (error && !propuestas.length) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-xl font-bold">Evaluación de Propuestas</p>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-2">Error al cargar</p>
            <p className="text-muted-foreground">{error}</p>
            <Link href="/consejero">
              <Button className="mt-6">Volver al inicio</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  if (!propuestas.length || !criterios.length) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-xl font-bold">Evaluación de Propuestas</p>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-2">Proceso no disponible</p>
            <p className="text-muted-foreground">
              No hay propuestas o criterios configurados para esta evaluación.
            </p>
            <Link href="/consejero">
              <Button className="mt-6">Volver al inicio</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  // ─── Render principal ────────────────────────────────────────────────────────

  const propuesta = propuestas[currentIndex]
  const currentEvals = evaluaciones[propuesta.id] ?? {}
  const documentosPropuesta = documentos.filter((documento) => documento.propuesta_id === propuesta.id)
  const todasEvaluadas = criterios.every((c) => currentEvals[c.id] !== undefined)
  const esUltima = currentIndex === propuestas.length - 1

  const propuestasCompletadas = propuestas.filter((p) =>
    isPropuestaCompleta(p.id, criterios, evaluaciones)
  ).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header sticky con progreso */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold">Evaluación de Propuestas</p>
              {consejero && (
                <p className="text-xs text-muted-foreground">
                  {consejero.nombre_completo} · {consejero.cargo}
                </p>
              )}
            </div>
            <div className="text-right text-sm">
              <p className="text-foreground">
                {currentIndex + 1} / {propuestas.length}
              </p>
              <p className="text-muted-foreground">
                {propuestasCompletadas} completadas
              </p>
            </div>
          </div>
          {/* Barra de progreso */}
          <div className="mt-3 h-1.5 w-full rounded-full bg-border">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(propuestasCompletadas / propuestas.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div>
          <Link href="/consejero/perfil">
            <Button variant="ghost" className="px-0 text-muted-foreground">
              Ver mi perfil de consejero
            </Button>
          </Link>
        </div>

        {/* Ficha de la propuesta */}
        <Card className="border border-border/50 bg-card/50 p-4 sm:p-8">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{propuesta.razon_social}</p>
            {isPropuestaCompleta(propuesta.id, criterios, evaluaciones) && (
              <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Tipo</p>
              <p>
                {propuesta.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'}
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {propuesta.tipo_persona === 'juridica' ? 'NIT' : 'Cédula'}
              </p>
              <p>{propuesta.nit_cedula}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Experiencia</p>
              <p>{propuesta.anios_experiencia} años</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Unidades administradas</p>
              <p>{propuesta.unidades_administradas}</p>
            </div>
            {propuesta.representante_legal && (
              <div className="col-span-2">
                <p className="font-semibold text-foreground">Representante legal</p>
                <p>{propuesta.representante_legal}</p>
              </div>
            )}
            {propuesta.valor_honorarios && (
              <div className="col-span-2">
                <p className="font-semibold text-foreground">Honorarios mensuales</p>
                <p>
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  }).format(propuesta.valor_honorarios)}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Criterios */}
        <Card className="border border-border/50 bg-card/50 p-4 sm:p-8">
          <p className="text-lg font-semibold text-foreground mb-6">Evaluación por criterios</p>

          <div className="space-y-8">
            {criterios.map((criterio) => {
              const valorActual = currentEvals[criterio.id]
              return (
                <div
                  key={criterio.id}
                  className="pb-6 border-b border-border/50 last:border-0 last:pb-0"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{criterio.nombre}</p>
                      {criterio.descripcion && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {criterio.descripcion}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Peso: {criterio.peso}%
                      </p>
                    </div>
                    {valorActual !== undefined && (
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                    )}
                  </div>

                  {criterio.tipo === 'booleano' ? (
                    <div className="flex gap-3">
                      {[
                        { label: 'No cumple', valor: 0 },
                        { label: 'Cumple', valor: 1 },
                      ].map(({ label, valor }) => (
                        <button
                          key={label}
                          onClick={() => handleEvaluacion(criterio.id, valor)}
                          className={`flex-1 py-2 rounded-md font-semibold text-sm transition-colors ${
                            valorActual === valor
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border/50 bg-background text-foreground hover:border-primary/50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        {Array.from(
                          { length: criterio.valor_maximo - criterio.valor_minimo + 1 },
                          (_, i) => criterio.valor_minimo + i
                        ).map((val) => (
                          <button
                            key={val}
                            onClick={() => handleEvaluacion(criterio.id, val)}
                            className={`min-w-[2.5rem] flex-1 py-2 rounded-md font-semibold text-sm transition-colors ${
                              valorActual === val
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-border/50 bg-background text-foreground hover:border-primary/50'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Insuficiente</span>
                        <span>Excelente</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            {currentIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentIndex(currentIndex - 1)}
                disabled={saving}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>
            )}
            <Button
              onClick={handleGuardar}
              disabled={!todasEvaluadas || saving}
              className="flex-1 gap-2"
            >
              {saving
                ? 'Guardando...'
                : esUltima
                ? 'Guardar e ir a Votación'
                : 'Guardar y Siguiente'}
              {todasEvaluadas && !saving && <CheckCircle2 className="h-4 w-4" />}
            </Button>
          </div>
        </Card>

        <Card className="border border-border/50 bg-card/50 p-4 sm:p-8">
          <p className="text-lg font-semibold text-foreground mb-4">Documentos relacionados</p>
          {documentosPropuesta.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta propuesta no tiene documentos registrados.</p>
          ) : (
            <div className="space-y-3">
              {documentosPropuesta.map((documento) => (
                <div
                  key={documento.id}
                  className="flex items-center justify-between rounded-md border border-border/50 bg-background p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{documento.nombre}</p>
                    <p className="text-xs text-muted-foreground">{documento.tipo} · {documento.estado}</p>
                  </div>
                  {documento.archivo_url ? (
                    <a
                      href={documento.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Ver
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin archivo</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}
