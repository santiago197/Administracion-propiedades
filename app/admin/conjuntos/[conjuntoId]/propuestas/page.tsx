'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { FormPropuesta } from '@/components/admin/form-propuesta'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertCircle,
  ArrowLeft,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import type { Propuesta, Proceso } from '@/lib/types/index'

const MIN_PROPUESTAS = 3

export default function GestionPropuestas() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string

  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [proceso, setProceso] = useState<Proceso | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Track which propuesta card is expanded
  const [expanded, setExpanded] = useState<string | null>(null)
  // Track individual retire operations
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error('[GestionPropuestas] fetchData:', msg)
      setFetchError(msg)
    } finally {
      setLoading(false)
    }
  }, [conjuntoId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ------------------------------------------------------------------
  // Agrega la propuesta recién creada al estado local (sin re-fetch)
  // ------------------------------------------------------------------
  const handlePropuestaAdded = (propuesta: Propuesta) => {
    setPropuestas((prev) => [propuesta, ...prev])
  }

  // ------------------------------------------------------------------
  // Soft-delete: marca propuesta como 'retirada' vía DELETE /api/propuestas/[id]
  // ------------------------------------------------------------------
  const handleRetirar = async (propuesta: Propuesta) => {
    const confirmado = window.confirm(
      `¿Retirar la propuesta de "${propuesta.razon_social}"? Esta acción no se puede deshacer.`
    )
    if (!confirmado) return

    setRetirandoId(propuesta.id)
    try {
      const res = await fetch(`/api/propuestas/${propuesta.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}))
        throw new Error(error ?? `Error ${res.status}`)
      }
      // Actualizar estado local: cambiar estado en lugar de quitar del array
      // para que la lista sea coherente sin re-fetch
      setPropuestas((prev) =>
        prev.map((p) => (p.id === propuesta.id ? { ...p, estado: 'retirada' } : p))
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al retirar propuesta'
      alert(`No se pudo retirar: ${msg}`)
    } finally {
      setRetirandoId(null)
    }
  }

  // ------------------------------------------------------------------
  // Derivados
  // ------------------------------------------------------------------
  const activas = propuestas.filter(
    (p) =>
      p.estado === 'registro' ||
      p.estado === 'habilitada' ||
      p.estado === 'en_evaluacion'
  )
  const retiradas = propuestas.filter(
    (p) => p.estado === 'retirada' || p.estado === 'descalificada'
  )
  const isComplete = activas.length >= MIN_PROPUESTAS

  // ------------------------------------------------------------------
  // Estados de carga y error
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-20 animate-pulse bg-card/50" />
          ))}
        </main>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="p-8 text-center border border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium mb-1">Error al cargar datos</p>
            <p className="text-sm text-muted-foreground mb-4">{fetchError}</p>
            <Button variant="outline" onClick={fetchData}>
              Reintentar
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  if (!proceso) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No se encontró un proceso activo para este conjunto.
            </p>
            <Link href={`/admin/conjuntos/${conjuntoId}/nuevo-proceso`}>
              <Button>Crear proceso</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Vista principal
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}/configuracion`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>

        {/* Encabezado */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Propuestas de Administradores
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Proceso:{' '}
              <span className="font-medium text-foreground">{proceso.nombre}</span>
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              Registra mínimo {MIN_PROPUESTAS} propuestas para iniciar evaluaciones
            </p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-sm text-muted-foreground">Propuestas activas</p>
            <p
              className={`text-2xl font-bold ${
                isComplete ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {activas.length}/{MIN_PROPUESTAS}
            </p>
          </div>
        </div>

        {/* Aviso de mínimo */}
        {!isComplete && (
          <Card className="mb-8 border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Mínimo de propuestas requerido
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Se necesitan al menos {MIN_PROPUESTAS} propuestas activas. Actualmente
                tienes {activas.length}.
              </p>
            </div>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Agregar Nueva Propuesta
            </h2>
            <FormPropuesta
              procesoId={proceso.id}
              onSuccess={handlePropuestaAdded}
            />
          </div>

          {/* Resumen lateral */}
          <div>
            <div className="sticky top-[100px]">
              <h2 className="text-lg font-semibold text-foreground mb-4">Resumen</h2>
              <Card className="border border-border/50 bg-card/50 p-4 space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Activas</p>
                  <p className="text-2xl font-bold text-foreground">{activas.length}</p>
                </div>
                {retiradas.length > 0 && (
                  <div className="border-t border-border/50 pt-3">
                    <p className="text-muted-foreground">Retiradas / Descalificadas</p>
                    <p className="text-lg font-semibold text-muted-foreground">
                      {retiradas.length}
                    </p>
                  </div>
                )}
                <div className="border-t border-border/50 pt-3">
                  <p className="text-muted-foreground mb-2">Estado</p>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      isComplete
                        ? 'bg-primary/20 text-primary'
                        : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-200'
                    }`}
                  >
                    {isComplete ? '✓ Completo' : 'Pendiente'}
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Lista de propuestas activas */}
        {activas.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Propuestas Registradas
            </h2>
            <div className="space-y-3">
              {activas.map((propuesta) => {
                const isExpanded = expanded === propuesta.id
                const isRetirando = retirandoId === propuesta.id

                return (
                  <Card
                    key={propuesta.id}
                    className="border border-border/50 bg-card/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {propuesta.razon_social}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {propuesta.tipo_persona === 'juridica'
                            ? 'Persona Jurídica'
                            : 'Persona Natural'}{' '}
                          • {propuesta.nit_cedula}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground">
                              Experiencia:
                            </span>{' '}
                            {propuesta.anios_experiencia} años
                          </div>
                          <div>
                            <span className="font-medium text-foreground">
                              Unidades:
                            </span>{' '}
                            {propuesta.unidades_administradas}
                          </div>
                          {propuesta.email && (
                            <div className="col-span-2">{propuesta.email}</div>
                          )}
                        </div>

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
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() =>
                            setExpanded(isExpanded ? null : propuesta.id)
                          }
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={isExpanded ? 'Colapsar' : 'Ver detalles'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRetirar(propuesta)}
                          disabled={isRetirando}
                          className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          title="Retirar propuesta"
                        >
                          {isRetirando ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* Propuestas retiradas (colapsadas por defecto) */}
        {retiradas.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-medium text-muted-foreground mb-3">
              Propuestas retiradas / descalificadas ({retiradas.length})
            </h2>
            <div className="space-y-2">
              {retiradas.map((propuesta) => (
                <Card
                  key={propuesta.id}
                  className="border border-border/30 bg-card/30 p-3 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-foreground line-through">
                        {propuesta.razon_social}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {propuesta.nit_cedula}
                      </span>
                    </div>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-muted text-muted-foreground capitalize">
                      {propuesta.estado}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* CTA cuando está completo */}
        {isComplete && (
          <div className="mt-12 text-center">
            <Card className="border border-primary/20 bg-primary/5 p-8">
              <p className="text-foreground font-semibold mb-4">
                ¡Excelente! Has registrado suficientes propuestas
              </p>
              <p className="text-muted-foreground mb-6">
                Configuración inicial completa. Puedes iniciar evaluaciones y
                votaciones.
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
