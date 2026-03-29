'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { FormPropuesta } from '@/components/admin/form-propuesta'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
<<<<<<< HEAD
import { ArrowLeft, AlertCircle, FileText } from 'lucide-react'
import type { Propuesta, Proceso } from '@/lib/types/index'

=======
import {
  AlertCircle,
  ArrowLeft,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  FileText,
  BarChart3,
  Trophy,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Propuesta, Proceso, Documento, ClasificacionPropuesta } from '@/lib/types/index'

type DocResumen = { obligatorios: number; completos: number; faltantes: string[] }
type EvalResumen = { puntaje_total: number; clasificacion: ClasificacionPropuesta }

const MIN_PROPUESTAS = 3

const CLAS_BADGE: Record<ClasificacionPropuesta, string> = {
  destacado: 'bg-green-500/10 text-green-700 border-green-200',
  apto: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  condicionado: 'bg-orange-500/10 text-orange-700 border-orange-200',
  no_apto: 'bg-red-500/10 text-red-700 border-red-200',
}

const CLAS_LABEL: Record<ClasificacionPropuesta, string> = {
  destacado: 'Destacado',
  apto: 'Apto',
  condicionado: 'Condicionado',
  no_apto: 'No Apto',
}

>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
export default function GestionPropuestas() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string

  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [docsMap, setDocsMap] = useState<Map<string, DocResumen>>(new Map())
  const [evalMap, setEvalMap] = useState<Map<string, EvalResumen>>(new Map())
  const [proceso, setProceso] = useState<Proceso | null>(null)
  const [loading, setLoading] = useState(true)
<<<<<<< HEAD
  const [procesoId, setProcesoId] = useState<string | null>(null)
=======
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [retirandoId, setRetirandoId] = useState<string | null>(null)

  // ------------------------------------------------------------------
  // Carga inicial: busca el proceso activo del conjunto y sus propuestas
  // ------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)

    try {
      // 1. Obtener procesos del conjunto
      const procRes = await fetch(`/api/procesos?conjunto_id=${conjuntoId}`)
      if (!procRes.ok) {
        const { error } = await procRes.json().catch(() => ({}))
        throw new Error(error ?? `Error ${procRes.status} al cargar procesos`)
      }
      const procesos: Proceso[] = await procRes.json()

      // Tomar el proceso en estado 'configuracion' o el más reciente si hay varios
      const current =
        procesos.find((p) => p.estado === 'configuracion') ?? procesos[0] ?? null

      if (!current) {
        setProceso(null)
        setPropuestas([])
        return
      }

      setProceso(current)

      // 2. Cargar propuestas del proceso encontrado
      const propRes = await fetch(`/api/propuestas?proceso_id=${current.id}`)
      if (!propRes.ok) {
        const { error } = await propRes.json().catch(() => ({}))
        throw new Error(error ?? `Error ${propRes.status} al cargar propuestas`)
      }
      const props: Propuesta[] = await propRes.json()
      setPropuestas(props ?? [])

      // 3. Cargar documentos de cada propuesta en paralelo
      const docsEntries = await Promise.all(
        (props ?? []).map(async (p) => {
          try {
            const r = await fetch(`/api/documentos?propuesta_id=${p.id}`)
            if (!r.ok) return [p.id, { obligatorios: 0, completos: 0, faltantes: [] }] as const
            const docs: Documento[] = await r.json()
            const oblig = docs.filter((d) => d.es_obligatorio)
            const ok = oblig.filter((d) => d.estado === 'completo')
            const faltantes = oblig.filter((d) => d.estado !== 'completo').map((d) => d.nombre)
            return [p.id, { obligatorios: oblig.length, completos: ok.length, faltantes }] as const
          } catch {
            return [p.id, { obligatorios: 0, completos: 0, faltantes: [] }] as const
          }
        })
      )
      setDocsMap(new Map(docsEntries))

      // 4. Cargar evaluaciones de cada propuesta en paralelo
      const evalEntries = await Promise.all(
        (props ?? []).map(async (p) => {
          try {
            const r = await fetch(`/api/propuestas/${p.id}/evaluar`)
            if (!r.ok) return [p.id, null] as const
            const ev = await r.json()
            if (ev?.puntaje_total != null && ev?.clasificacion) {
              return [p.id, { puntaje_total: ev.puntaje_total, clasificacion: ev.clasificacion }] as const
            }
            return [p.id, null] as const
          } catch {
            return [p.id, null] as const
          }
        })
      )
      const evalMapData = new Map<string, EvalResumen>()
      evalEntries.forEach(([id, data]) => {
        if (data) evalMapData.set(id, data)
      })
      setEvalMap(evalMapData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error('[GestionPropuestas] fetchData:', msg)
      setFetchError(msg)
    } finally {
      setLoading(false)
    }
  }, [conjuntoId])
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449

  useEffect(() => {
    const fetchData = async () => {
      try {
        const procRes = await fetch(`/api/procesos?conjunto_id=${conjuntoId}`)
        const procesos = await procRes.json()

        const currentProceso = procesos?.[0]
        if (currentProceso) {
          setProcesoId(currentProceso.id)
          setProceso(currentProceso)

          const propRes = await fetch(`/api/propuestas?proceso_id=${currentProceso.id}`)
          const props = await propRes.json()
          setPropuestas(props || [])
        }
      } catch (error) {
        console.error('[v0] Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [conjuntoId])

  const handlePropuestaAdded = (propuesta: Propuesta) => {
    setPropuestas((prev) => [...prev, propuesta])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-20 animate-pulse bg-card/50" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!procesoId) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Error: No se encontró un proceso</p>
            <Link href={`/admin/conjuntos/${conjuntoId}/configuracion`}>
              <Button className="mt-4">Volver</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  const totalPropuestas = propuestas.filter(p => p.estado === 'registro' || p.estado === 'habilitada' || p.estado === 'en_evaluacion').length
  const requiredPropuestas = 3
  const isComplete = totalPropuestas >= requiredPropuestas

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al conjunto
          </Button>
        </Link>

        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Propuestas de Administradores</h1>
              <p className="mt-2 text-muted-foreground">
                Registra mínimo 3 propuestas de administradores con documentación
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Propuestas activas</p>
              <p className={`text-2xl font-bold ${isComplete ? 'text-primary' : 'text-muted-foreground'}`}>
                {totalPropuestas}/{requiredPropuestas}
              </p>
            </div>
          </div>
        </div>

        {!isComplete && (
          <Card className="mb-8 border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Mínimo de propuestas requerido
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Se necesitan al menos {requiredPropuestas} propuestas registradas para iniciar evaluaciones. Actualmente tienes {totalPropuestas}.
              </p>
            </div>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Agregar Nueva Propuesta</h2>
              {procesoId && (
                <FormPropuesta
                  procesoId={procesoId}
                  onSuccess={handlePropuestaAdded}
                  loading={loading}
                />
              )}
            </div>
          </div>

          <div>
            <div className="sticky top-[100px]">
              <h2 className="text-lg font-semibold text-foreground mb-4">Resumen</h2>
              <Card className="border border-border/50 bg-card/50 p-4 space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Propuestas</p>
                  <p className="text-2xl font-bold text-foreground">{totalPropuestas}</p>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <p className="text-muted-foreground mb-2">Estado</p>
                  <div className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    isComplete
                      ? 'bg-primary/20 text-primary'
                      : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-200'
                  }`}>
                    {isComplete ? '✓ Completo' : 'Pendiente'}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {propuestas.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Propuestas Registradas</h2>
            <div className="space-y-3">
              {propuestas
                .filter(p => p.estado === 'registro' || p.estado === 'habilitada' || p.estado === 'en_evaluacion')
                .map((propuesta) => (
                  <Card
                    key={propuesta.id}
                    className="border border-border/50 bg-card/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {propuesta.razon_social}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {propuesta.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'} •
                          {propuesta.nit_cedula}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                          <div>
                            <span className="font-semibold">Experiencia:</span> {propuesta.anios_experiencia} años
                          </div>
                          <div>
                            <span className="font-semibold">Unidades:</span> {propuesta.unidades_administradas}
                          </div>
                        </div>
<<<<<<< HEAD
                        {propuesta.email && (
                          <p className="text-xs text-muted-foreground mt-2">{propuesta.email}</p>
=======

                        {/* Evaluación (puntaje, clasificación) */}
                        {(() => {
                          const ev = evalMap.get(propuesta.id)
                          if (!ev) return null
                          return (
                            <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                                  <span className="text-xs font-medium text-primary">Evaluación</span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${CLAS_BADGE[ev.clasificacion]}`}
                                >
                                  {CLAS_LABEL[ev.clasificacion]}
                                </Badge>
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Puntaje total</span>
                                  <span className="font-bold text-primary tabular-nums">{ev.puntaje_total}/100</span>
                                </div>
                                <Progress value={ev.puntaje_total} className="h-1.5" />
                              </div>
                            </div>
                          )
                        })()}

                        {/* Estado documentos obligatorios */}
                        {(() => {
                          const dr = docsMap.get(propuesta.id)
                          if (!dr || dr.obligatorios === 0) return null
                          const ok = dr.completos === dr.obligatorios
                          return (
                            <div className={`mt-2 rounded-md border px-3 py-2 text-xs ${ok ? 'border-green-500/20 bg-green-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                              <div className={`flex items-center gap-1.5 font-medium ${ok ? 'text-green-700' : 'text-amber-700'}`}>
                                {ok
                                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  : <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                }
                                <FileText className="h-3 w-3 shrink-0" />
                                Documentos: {dr.completos}/{dr.obligatorios} obligatorios completos
                              </div>
                              {!ok && dr.faltantes.length > 0 && (
                                <ul className="mt-1 ml-5 space-y-0.5 text-amber-700">
                                  {dr.faltantes.map((nombre) => (
                                    <li key={nombre} className="flex items-center gap-1">
                                      <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                                      {nombre}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )
                        })()}

                        {/* Detalle expandible */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {propuesta.telefono && (
                              <div>
                                <span className="font-medium text-foreground">
                                  Teléfono:
                                </span>{' '}
                                {propuesta.telefono}
                              </div>
                            )}
                            {propuesta.valor_honorarios != null && (
                              <div>
                                <span className="font-medium text-foreground">
                                  Honorarios:
                                </span>{' '}
                                $
                                {Number(propuesta.valor_honorarios).toLocaleString(
                                  'es-CO'
                                )}
                              </div>
                            )}
                            {propuesta.direccion && (
                              <div className="col-span-2">
                                <span className="font-medium text-foreground">
                                  Dirección:
                                </span>{' '}
                                {propuesta.direccion}
                              </div>
                            )}
                            {propuesta.representante_legal && (
                              <div className="col-span-2">
                                <span className="font-medium text-foreground">
                                  Representante:
                                </span>{' '}
                                {propuesta.representante_legal}
                              </div>
                            )}
                            {propuesta.observaciones && (
                              <div className="col-span-2">
                                <span className="font-medium text-foreground">
                                  Observaciones:
                                </span>{' '}
                                {propuesta.observaciones}
                              </div>
                            )}
                          </div>
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
                        )}
                      </div>
                      <Link href={`/admin/conjuntos/${conjuntoId}/propuestas/${propuesta.id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <FileText className="h-4 w-4" />
                          Documentos
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="mt-12 text-center">
            <Card className="border border-primary/20 bg-primary/5 p-8">
              <p className="text-foreground font-semibold mb-4">
                ¡Excelente! Has registrado suficientes propuestas
              </p>
              <p className="text-muted-foreground mb-6">
                La configuración inicial está completa. Ahora puedes crear procesos de selección e iniciar evaluaciones y votaciones.
              </p>
              <Link href={`/admin/conjuntos/${conjuntoId}`}>
                <Button>Ir al Conjunto</Button>
              </Link>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
