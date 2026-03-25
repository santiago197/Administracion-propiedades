'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Loader,
  ShieldCheck,
  ShieldAlert,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import type { Propuesta, Proceso } from '@/lib/types/index'

interface PanelValidacion {
  cumple: boolean | null
  observaciones: string
}

const PANEL_INICIAL: PanelValidacion = { cumple: null, observaciones: '' }

export default function ValidacionLegalPage() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string
  const procesoId = params.procesoId as string

  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [proceso, setProceso] = useState<Proceso | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  // Panel de validación abierto por propuesta
  const [panelAbierto, setPanelAbierto] = useState<Record<string, boolean>>({})
  // Estado local del formulario de validación por propuesta
  const [paneles, setPaneles] = useState<Record<string, PanelValidacion>>({})
  // Documentos de tipo rut por propuesta (para mostrar metadatos)
  const [docsRut, setDocsRut] = useState<Record<string, { nombre: string; archivo_url?: string | null }[]>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propRes, procRes] = await Promise.all([
          fetch(`/api/propuestas?proceso_id=${procesoId}`),
          fetch(`/api/procesos?conjunto_id=${conjuntoId}`),
        ])

        if (propRes.ok) {
          const data: Propuesta[] = await propRes.json()
          const filtradas = data.filter(
            (p) => p.estado === 'habilitada' || p.estado === 'no_apto_legal' || p.estado === 'en_evaluacion'
          )
          setPropuestas(filtradas)

          // Cargar documentos de tipo rut para cada propuesta filtrada
          const rutEntries = await Promise.all(
            filtradas.map(async (p) => {
              const res = await fetch(`/api/documentos?propuesta_id=${p.id}`)
              if (!res.ok) return [p.id, []] as const
              const docs = await res.json()
              const rutDocs = docs.filter((d: { tipo: string; nombre: string; archivo_url?: string | null }) => d.tipo === 'rut')
              return [p.id, rutDocs] as const
            })
          )
          setDocsRut(Object.fromEntries(rutEntries))
        }

        if (procRes.ok) {
          const procesos: Proceso[] = await procRes.json()
          setProceso(procesos.find((p) => p.id === procesoId) ?? null)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Error al cargar los datos.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [procesoId, conjuntoId])

  const togglePanel = (id: string) => {
    setPanelAbierto((prev) => ({ ...prev, [id]: !prev[id] }))
    setPaneles((prev) => ({ ...prev, [id]: prev[id] ?? PANEL_INICIAL }))
  }

  const handleValidacion = async (propuestaId: string) => {
    const panel = paneles[propuestaId]
    if (!panel || panel.cumple === null) return
    if (!panel.cumple && !panel.observaciones.trim()) {
      setPaneles((prev) => ({
        ...prev,
        [propuestaId]: { ...prev[propuestaId], observaciones: '' },
      }))
      return
    }

    setProcessingId(propuestaId)
    try {
      const response = await fetch('/api/propuestas/validar-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propuesta_id: propuestaId,
          cumple: panel.cumple,
          observaciones: panel.observaciones.trim(),
        }),
      })

      if (response.ok) {
        setPropuestas((prev) =>
          prev.map((p) =>
            p.id === propuestaId
              ? {
                  ...p,
                  estado: panel.cumple ? 'en_evaluacion' : 'no_apto_legal',
                  cumple_requisitos_legales: panel.cumple ?? false,
                  observaciones_legales: panel.observaciones.trim(),
                }
              : p
          )
        )
        setPanelAbierto((prev) => ({ ...prev, [propuestaId]: false }))
      } else {
        const data = await response.json()
        setError(data.error || 'Error al procesar validación')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error de conexión')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al Proceso
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Validación Legal de Candidatos</h1>
          <p className="mt-2 text-muted-foreground">
            Verificación de SARLAFT, antecedentes, pólizas y paz y salvos.
          </p>
          {proceso && (
            <p className="mt-1 text-sm text-muted-foreground">Proceso: {proceso.nombre}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {propuestas.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay candidatos pendientes de validación legal.</p>
            <p className="text-xs text-muted-foreground mt-2">
              Solo aparecen candidatos con documentación completa.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {propuestas.map((p) => {
              const abierto = panelAbierto[p.id] ?? false
              const panel = paneles[p.id] ?? PANEL_INICIAL
              const rutDocs = docsRut[p.id] ?? []
              const yaDecidido = p.estado === 'en_evaluacion' || p.estado === 'no_apto_legal'

              return (
                <Card key={p.id} className="border border-border/50 bg-card/50">
                  {/* Cabecera */}
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-xl font-bold text-foreground">{p.razon_social}</h3>
                          <Badge
                            variant="outline"
                            className={
                              p.estado === 'en_evaluacion'
                                ? 'border-green-500/30 bg-green-500/10 text-green-600'
                                : p.estado === 'no_apto_legal'
                                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                : 'border-blue-500/30 bg-blue-500/10 text-blue-600'
                            }
                          >
                            {p.estado.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {p.tipo_persona === 'juridica' ? 'NIT' : 'CC'}: {p.nit_cedula}
                          {p.email ? ` · ${p.email}` : ''}
                          {p.representante_legal ? ` · Rep. legal: ${p.representante_legal}` : ''}
                        </p>

                        {/* Documentos RUT cargados */}
                        {rutDocs.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {rutDocs.map((doc) => (
                              <span
                                key={doc.nombre}
                                className="inline-flex items-center gap-1 text-xs rounded-full border border-border/50 px-2 py-0.5 text-muted-foreground"
                              >
                                RUT: {doc.nombre}
                                {doc.archivo_url && (
                                  <a
                                    href={doc.archivo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Ver
                                  </a>
                                )}
                              </span>
                            ))}
                          </div>
                        )}

                        {p.observaciones_legales && (
                          <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                            <p className="text-xs font-semibold mb-1 text-muted-foreground">
                              OBSERVACIONES LEGALES:
                            </p>
                            {p.observaciones_legales}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Link
                          href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}/propuestas/${p.id}`}
                          target="_blank"
                        >
                          <Button variant="outline" size="sm" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Ver Documentos
                          </Button>
                        </Link>

                        {!yaDecidido && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => togglePanel(p.id)}
                          >
                            {abierto ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            Validar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Panel de validación */}
                  {abierto && !yaDecidido && (
                    <div className="border-t border-border/50 px-6 pb-6 pt-4 space-y-4">
                      <p className="text-sm font-medium text-foreground">Decisión legal</p>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setPaneles((prev) => ({ ...prev, [p.id]: { ...panel, cumple: true } }))
                          }
                          className={`flex-1 flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm transition-colors ${
                            panel.cumple === true
                              ? 'border-green-500 bg-green-500/10 text-green-700'
                              : 'border-border/50 text-muted-foreground hover:border-green-400 hover:text-green-700'
                          }`}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Habilitar legal
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPaneles((prev) => ({ ...prev, [p.id]: { ...panel, cumple: false } }))
                          }
                          className={`flex-1 flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm transition-colors ${
                            panel.cumple === false
                              ? 'border-destructive bg-destructive/10 text-destructive'
                              : 'border-border/50 text-muted-foreground hover:border-destructive/60 hover:text-destructive'
                          }`}
                        >
                          <ShieldAlert className="h-4 w-4" />
                          Rechazo legal
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          Observaciones{panel.cumple === false && <span className="text-destructive ml-1">*</span>}
                        </label>
                        <Textarea
                          rows={3}
                          placeholder={
                            panel.cumple === false
                              ? 'Motivo obligatorio para el rechazo...'
                              : 'Observaciones opcionales...'
                          }
                          value={panel.observaciones}
                          onChange={(e) =>
                            setPaneles((prev) => ({
                              ...prev,
                              [p.id]: { ...panel, observaciones: e.target.value },
                            }))
                          }
                        />
                        {panel.cumple === false && !panel.observaciones.trim() && (
                          <p className="text-xs text-destructive">
                            Debe indicar el motivo del rechazo.
                          </p>
                        )}
                      </div>

                      {panel.cumple === false && (
                        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          Esta acción es irreversible. El candidato quedará en estado No Apto Legal y no podrá continuar en el proceso.
                        </div>
                      )}

                      <Button
                        size="sm"
                        disabled={
                          panel.cumple === null ||
                          processingId === p.id ||
                          (panel.cumple === false && !panel.observaciones.trim())
                        }
                        className={
                          panel.cumple === false
                            ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }
                        onClick={() => handleValidacion(p.id)}
                      >
                        {processingId === p.id ? (
                          <Loader className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Confirmar decisión
                      </Button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
