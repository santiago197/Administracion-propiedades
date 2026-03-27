'use client'

import { useState, useEffect, useMemo } from 'react'
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
  ShieldQuestion,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Pencil,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Circle,
} from 'lucide-react'
import type {
  Propuesta,
  Proceso,
  ChecklistLegal,
  EstadoItemChecklist,
  DefinicionItemChecklist,
} from '@/lib/types/index'
import { ITEMS_VALIDACION_LEGAL } from '@/lib/types/index'

// ─── Tipos locales ────────────────────────────────────────────────────────────

type EstadoLegal = 'aprobado' | 'rechazado' | 'pendiente'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEstadoLegal(p: Propuesta): EstadoLegal {
  if (p.estado === 'habilitada' || p.estado === 'en_evaluacion') return 'aprobado'
  if (p.estado === 'no_apto_legal') return 'rechazado'
  return 'pendiente'
}

/** Calcula si el checklist local permite confirmar */
function calcularEstadoChecklist(
  checklist: ChecklistLegal,
  tipoPersona: 'juridica' | 'natural'
): { cumple: boolean; bloqueantes: string[]; pendientes: string[] } {
  const items = ITEMS_VALIDACION_LEGAL.filter(
    (d) => d.aplica_a === 'ambos' || d.aplica_a === tipoPersona
  )
  const criticos = items.filter((d) => d.criticidad === 'critico')

  const bloqueantes: string[] = []
  const pendientes: string[] = []

  for (const def of criticos) {
    const estado = checklist[def.id]?.estado ?? 'pendiente'
    if (estado === 'no_cumple') bloqueantes.push(def.label)
    else if (estado === 'pendiente') pendientes.push(def.label)
  }

  return {
    cumple: bloqueantes.length === 0 && pendientes.length === 0,
    bloqueantes,
    pendientes,
  }
}

function inicializarChecklist(
  propuesta: Propuesta,
  checklistGuardado: ChecklistLegal | null
): ChecklistLegal {
  const resultado: ChecklistLegal = {}

  for (const def of ITEMS_VALIDACION_LEGAL) {
    if (def.aplica_a !== 'ambos' && def.aplica_a !== propuesta.tipo_persona) continue

    if (checklistGuardado?.[def.id]) {
      resultado[def.id] = checklistGuardado[def.id]
    } else {
      // Pre-llenar si ya tiene decisión global guardada (migración desde versión anterior)
      const estadoLegal = getEstadoLegal(propuesta)
      resultado[def.id] = {
        id: def.id,
        estado: estadoLegal === 'aprobado' ? 'cumple' : estadoLegal === 'rechazado' ? 'no_cumple' : 'pendiente',
        observacion: '',
      }
    }
  }

  return resultado
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function BadgeEstado({ estado }: { estado: EstadoLegal }) {
  if (estado === 'aprobado') {
    return (
      <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-700 gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Habilitado legalmente
      </Badge>
    )
  }
  if (estado === 'rechazado') {
    return (
      <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive gap-1.5">
        <XCircle className="h-3.5 w-3.5" />
        No apto legal
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 gap-1.5">
      <Clock className="h-3.5 w-3.5" />
      Pendiente de validación
    </Badge>
  )
}

function BadgeCriticidad({ def }: { def: DefinicionItemChecklist }) {
  if (def.criticidad === 'critico') {
    return <span className="text-[10px] text-destructive border border-destructive/30 bg-destructive/5 rounded px-1.5 py-0.5 uppercase tracking-wide">Crítico</span>
  }
  if (def.criticidad === 'importante') {
    return <span className="text-[10px] text-amber-700 border border-amber-400/30 bg-amber-500/5 rounded px-1.5 py-0.5 uppercase tracking-wide">Importante</span>
  }
  if (def.criticidad === 'condicionante') {
    return <span className="text-[10px] text-blue-700 border border-blue-400/30 bg-blue-500/5 rounded px-1.5 py-0.5 uppercase tracking-wide">Pre-firma</span>
  }
  return <span className="text-[10px] text-muted-foreground border border-border/30 rounded px-1.5 py-0.5 uppercase tracking-wide">Informativo</span>
}

function ItemChecklist({
  def,
  item,
  onChange,
}: {
  def: DefinicionItemChecklist
  item: { estado: EstadoItemChecklist; observacion: string }
  onChange: (estado: EstadoItemChecklist, observacion: string) => void
}) {
  const borderColor =
    item.estado === 'cumple'
      ? 'border-green-500/30 bg-green-500/5'
      : item.estado === 'no_cumple'
      ? 'border-destructive/30 bg-destructive/5'
      : 'border-border/40 bg-muted/20'

  return (
    <div className={`rounded-md border p-3 space-y-2 transition-colors ${borderColor}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {item.estado === 'cumple' && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
            {item.estado === 'no_cumple' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
            {item.estado === 'pendiente' && <Circle className="h-4 w-4 text-muted-foreground/60 shrink-0" />}
            <span className="text-sm font-medium text-foreground">{def.label}</span>
            <BadgeCriticidad def={def} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">{def.descripcion}</p>
        </div>

        {/* Botones de estado */}
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onChange('cumple', item.observacion)}
            className={`h-7 px-2.5 rounded text-xs font-medium border transition-colors ${
              item.estado === 'cumple'
                ? 'border-green-500 bg-green-500/15 text-green-700'
                : 'border-border/50 text-muted-foreground hover:border-green-400 hover:text-green-700'
            }`}
          >
            Cumple
          </button>
          <button
            type="button"
            onClick={() => onChange('no_cumple', item.observacion)}
            className={`h-7 px-2.5 rounded text-xs font-medium border transition-colors ${
              item.estado === 'no_cumple'
                ? 'border-destructive bg-destructive/15 text-destructive'
                : 'border-border/50 text-muted-foreground hover:border-destructive/60 hover:text-destructive'
            }`}
          >
            No cumple
          </button>
          {item.estado !== 'pendiente' && (
            <button
              type="button"
              onClick={() => onChange('pendiente', '')}
              className="h-7 px-2 rounded text-xs border border-border/30 text-muted-foreground hover:text-foreground transition-colors"
              title="Restablecer"
            >
              ↩
            </button>
          )}
        </div>
      </div>

      {/* Campo observación — aparece siempre cuando no cumple, opcional cuando cumple */}
      {(item.estado === 'no_cumple' || (item.estado === 'cumple' && item.observacion)) && (
        <Textarea
          rows={2}
          placeholder={
            item.estado === 'no_cumple'
              ? 'Detalla el motivo del incumplimiento...'
              : 'Observación adicional (opcional)...'
          }
          value={item.observacion}
          onChange={(e) => onChange(item.estado, e.target.value)}
          className="text-xs resize-none ml-6"
        />
      )}
      {item.estado === 'no_cumple' && !item.observacion.trim() && (
        <p className="text-xs text-destructive ml-6">Indica el motivo (requerido para ítems críticos).</p>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ValidacionLegalPage() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string
  const procesoId = params.procesoId as string

  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [proceso, setProceso] = useState<Proceso | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorGlobal, setErrorGlobal] = useState('')
  const [errorPorId, setErrorPorId] = useState<Record<string, string>>({})
  const [panelAbierto, setPanelAbierto] = useState<Record<string, boolean>>({})
  const [checklists, setChecklists] = useState<Record<string, ChecklistLegal>>({})
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
            (p) =>
              p.estado === 'habilitada' ||
              p.estado === 'no_apto_legal' ||
              p.estado === 'en_evaluacion' ||
              p.estado === 'en_validacion'
          )
          setPropuestas(filtradas)

          const rutEntries = await Promise.all(
            filtradas.map(async (p) => {
              const res = await fetch(`/api/documentos?propuesta_id=${p.id}`)
              if (!res.ok) return [p.id, []] as const
              const docs = await res.json()
              const rutDocs = docs.filter(
                (d: { tipo: string; nombre: string; archivo_url?: string | null }) => d.tipo === 'rut'
              )
              return [p.id, rutDocs] as const
            })
          )
          setDocsRut(Object.fromEntries(rutEntries))
        }

        if (procRes.ok) {
          const procesos: Proceso[] = await procRes.json()
          setProceso(procesos.find((p) => p.id === procesoId) ?? null)
        }
      } catch {
        setErrorGlobal('Error al cargar los datos.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [procesoId, conjuntoId])

  const abrirPanel = (p: Propuesta) => {
    if (!checklists[p.id]) {
      // Intentar leer checklist_legal desde la propuesta (campo JSONB)
      const checklistGuardado = (p as Propuesta & { checklist_legal?: ChecklistLegal }).checklist_legal ?? null
      setChecklists((prev) => ({
        ...prev,
        [p.id]: inicializarChecklist(p, checklistGuardado),
      }))
    }
    setPanelAbierto((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
    setErrorPorId((prev) => ({ ...prev, [p.id]: '' }))
  }

  const actualizarItem = (
    propuestaId: string,
    itemId: string,
    estado: EstadoItemChecklist,
    observacion: string
  ) => {
    setChecklists((prev) => ({
      ...prev,
      [propuestaId]: {
        ...prev[propuestaId],
        [itemId]: { id: itemId, estado, observacion },
      },
    }))
  }

  const handleValidacion = async (propuesta: Propuesta) => {
    const checklist = checklists[propuesta.id]
    if (!checklist) return

    const tipoPersona = propuesta.tipo_persona as 'juridica' | 'natural'
    const { pendientes, bloqueantes } = calcularEstadoChecklist(checklist, tipoPersona)

    // Verificar que los no_cumple tienen observación
    const itemsSinObs = ITEMS_VALIDACION_LEGAL.filter((def) => {
      if (def.aplica_a !== 'ambos' && def.aplica_a !== tipoPersona) return false
      if (def.criticidad !== 'critico') return false
      const item = checklist[def.id]
      return item?.estado === 'no_cumple' && !item.observacion.trim()
    })

    if (itemsSinObs.length > 0) {
      setErrorPorId((prev) => ({
        ...prev,
        [propuesta.id]: `Completa el motivo de rechazo en: ${itemsSinObs.map((d) => d.label).join(', ')}`,
      }))
      return
    }

    if (pendientes.length > 0) {
      setErrorPorId((prev) => ({
        ...prev,
        [propuesta.id]: `Faltan ${pendientes.length} ítem(s) crítico(s) por revisar: ${pendientes.join(', ')}`,
      }))
      return
    }

    setProcessingId(propuesta.id)
    setErrorPorId((prev) => ({ ...prev, [propuesta.id]: '' }))

    try {
      const response = await fetch('/api/propuestas/validar-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propuesta_id: propuesta.id,
          checklist,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const cumpleFinal = bloqueantes.length === 0
        setPropuestas((prev) =>
          prev.map((p) =>
            p.id === propuesta.id
              ? {
                  ...p,
                  estado: data.estado ?? (cumpleFinal ? 'habilitada' : 'no_apto_legal'),
                  cumple_requisitos_legales: cumpleFinal,
                }
              : p
          )
        )
        setPanelAbierto((prev) => ({ ...prev, [propuesta.id]: false }))
      } else {
        setErrorPorId((prev) => ({
          ...prev,
          [propuesta.id]: data.error ?? 'Error al procesar validación',
        }))
      }
    } catch {
      setErrorPorId((prev) => ({ ...prev, [propuesta.id]: 'Error de conexión' }))
    } finally {
      setProcessingId(null)
    }
  }

  // ─── Contadores ─────────────────────────────────────────────────────────────

  const aprobadas = propuestas.filter((p) => getEstadoLegal(p) === 'aprobado').length
  const rechazadas = propuestas.filter((p) => getEstadoLegal(p) === 'rechazado').length
  const pendientes = propuestas.filter((p) => getEstadoLegal(p) === 'pendiente').length

  // ─── Render ────────────────────────────────────────────────────────────────

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

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        <Link href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}`}>
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al proceso
          </Button>
        </Link>

        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl text-foreground">Validación Legal — Control Legal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Checklist de antecedentes, SARLAFT, documentación y pólizas por candidato.
            {proceso && <> · Proceso: <span className="font-medium text-foreground">{proceso.nombre}</span></>}
          </p>
        </div>

        {/* Leyenda de criticidad */}
        <div className="mb-5 flex flex-wrap gap-3 text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-md px-4 py-3">
          <span className="font-medium text-foreground">Leyenda:</span>
          <span><span className="text-destructive font-medium">Crítico</span> — cualquier incumplimiento descalifica al candidato</span>
          <span><span className="text-amber-700 font-medium">Importante</span> — puede condicionar la habilitación</span>
          <span><span className="text-blue-700 font-medium">Pre-firma</span> — exigible antes de firmar contrato, no bloquea evaluación</span>
          <span><span className="text-muted-foreground font-medium">Informativo</span> — para seguimiento</span>
        </div>

        {/* Resumen de estado */}
        {propuestas.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="p-3 text-center border border-green-500/20 bg-green-500/5">
              <p className="text-2xl font-bold text-green-700">{aprobadas}</p>
              <p className="text-xs text-green-700 mt-0.5">Habilitados</p>
            </Card>
            <Card className="p-3 text-center border border-destructive/20 bg-destructive/5">
              <p className="text-2xl font-bold text-destructive">{rechazadas}</p>
              <p className="text-xs text-destructive mt-0.5">Rechazados</p>
            </Card>
            <Card className="p-3 text-center border border-amber-500/20 bg-amber-500/5">
              <p className="text-2xl font-bold text-amber-700">{pendientes}</p>
              <p className="text-xs text-amber-700 mt-0.5">Pendientes</p>
            </Card>
          </div>
        )}

        {errorGlobal && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {errorGlobal}
          </div>
        )}

        {propuestas.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium text-foreground mb-1">No hay candidatos para validar</p>
            <p className="text-sm text-muted-foreground">
              Los candidatos aparecen aquí una vez que completan su documentación.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {propuestas.map((p) => {
              const estadoLegal = getEstadoLegal(p)
              const abierto = panelAbierto[p.id] ?? false
              const checklist = checklists[p.id] ?? {}
              const rutDocs = docsRut[p.id] ?? []
              const errorLocal = errorPorId[p.id] ?? ''
              const tipoPersona = p.tipo_persona as 'juridica' | 'natural'
              const itemsAplicables = ITEMS_VALIDACION_LEGAL.filter(
                (d) => d.aplica_a === 'ambos' || d.aplica_a === tipoPersona
              )

              // Progreso del checklist abierto
              const revisados = itemsAplicables.filter(
                (d) => (checklist[d.id]?.estado ?? 'pendiente') !== 'pendiente'
              ).length
              const total = itemsAplicables.length
              const progresoPct = total > 0 ? Math.round((revisados / total) * 100) : 0

              // Secciones agrupadas
              const secciones = Array.from(new Set(itemsAplicables.map((d) => d.seccion)))

              return (
                <Card
                  key={p.id}
                  className={`border transition-all ${
                    estadoLegal === 'aprobado'
                      ? 'border-green-500/20 bg-green-500/5'
                      : estadoLegal === 'rechazado'
                      ? 'border-destructive/20 bg-destructive/5'
                      : 'border-amber-500/20 bg-amber-500/5'
                  }`}
                >
                  {/* Cabecera del candidato */}
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap mb-2">
                          {estadoLegal === 'aprobado' && <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
                          {estadoLegal === 'rechazado' && <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                          {estadoLegal === 'pendiente' && <ShieldQuestion className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
                          <h3 className="text-lg font-semibold text-foreground">{p.razon_social}</h3>
                          <span className="text-xs text-muted-foreground border border-border/30 rounded px-2 py-0.5 bg-background">
                            {p.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'}
                          </span>
                        </div>

                        <BadgeEstado estado={estadoLegal} />

                        <p className="text-sm text-muted-foreground mt-2">
                          {p.tipo_persona === 'juridica' ? 'NIT' : 'CC'}: {p.nit_cedula}
                          {p.email && ` · ${p.email}`}
                          {p.representante_legal && ` · Rep. legal: ${p.representante_legal}`}
                        </p>

                        {rutDocs.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {rutDocs.map((doc) => (
                              <span
                                key={doc.nombre}
                                className="inline-flex items-center gap-1 text-xs rounded-full border border-border/50 px-2 py-0.5 text-muted-foreground bg-background"
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

                        {/* Resumen de ítems rechazados — solo cuando está cerrado */}
                        {!abierto && estadoLegal === 'rechazado' && p.observaciones_legales && (
                          <div className="mt-3 p-3 bg-destructive/5 rounded-md border border-destructive/20 text-sm">
                            <p className="text-xs font-semibold mb-1 text-destructive/70 uppercase tracking-wide">
                              Motivo de rechazo
                            </p>
                            <p className="text-destructive/90 text-xs">{p.observaciones_legales}</p>
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        <Link
                          href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}/propuestas/${p.id}`}
                          target="_blank"
                        >
                          <Button variant="outline" size="sm" className="gap-2 bg-background">
                            <ExternalLink className="h-4 w-4" />
                            Ver docs
                          </Button>
                        </Link>

                        <Button
                          variant={estadoLegal === 'pendiente' ? 'default' : 'outline'}
                          size="sm"
                          className="gap-2 bg-background"
                          onClick={() => abrirPanel(p)}
                        >
                          {abierto ? <ChevronUp className="h-4 w-4" /> : estadoLegal === 'pendiente' ? <ShieldCheck className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                          {abierto ? 'Cerrar' : estadoLegal === 'pendiente' ? 'Validar' : 'Editar decisión'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Panel de validación */}
                  {abierto && (
                    <div className="border-t border-border/40 px-5 sm:px-6 pb-6 pt-5 space-y-5 bg-background/60">

                      {/* Barra de progreso del checklist */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${progresoPct === 100 ? 'bg-green-500' : 'bg-primary'}`}
                            style={{ width: `${progresoPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {revisados} / {total} ítems revisados
                        </span>
                      </div>

                      {/* Checklist por secciones */}
                      {secciones.map((seccion) => {
                        const itemsSeccion = itemsAplicables.filter((d) => d.seccion === seccion)
                        return (
                          <div key={seccion} className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {seccion}
                            </p>
                            {itemsSeccion.map((def) => {
                              const item = checklist[def.id] ?? { id: def.id, estado: 'pendiente' as EstadoItemChecklist, observacion: '' }
                              return (
                                <ItemChecklist
                                  key={def.id}
                                  def={def}
                                  item={item}
                                  onChange={(estado, observacion) =>
                                    actualizarItem(p.id, def.id, estado, observacion)
                                  }
                                />
                              )
                            })}
                          </div>
                        )
                      })}

                      {/* Estado calculado */}
                      <EstadoCalculadoChecklist checklist={checklist} tipoPersona={tipoPersona} />

                      {/* Error local */}
                      {errorLocal && (
                        <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{errorLocal}</span>
                        </div>
                      )}

                      {/* Acciones */}
                      <div className="flex gap-3 pt-1">
                        <Button
                          size="sm"
                          disabled={processingId === p.id}
                          className={(() => {
                            const { bloqueantes } = calcularEstadoChecklist(checklist, tipoPersona)
                            return bloqueantes.length > 0
                              ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          })()}
                          onClick={() => handleValidacion(p)}
                        >
                          {processingId === p.id && <Loader className="h-4 w-4 animate-spin mr-2" />}
                          {processingId === p.id
                            ? 'Guardando...'
                            : estadoLegal === 'pendiente'
                            ? 'Confirmar validación'
                            : 'Guardar cambios'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPanelAbierto((prev) => ({ ...prev, [p.id]: false }))}
                        >
                          Cancelar
                        </Button>
                      </div>
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

// ─── Estado calculado del checklist (se muestra antes de confirmar) ───────────

function EstadoCalculadoChecklist({
  checklist,
  tipoPersona,
}: {
  checklist: ChecklistLegal
  tipoPersona: 'juridica' | 'natural'
}) {
  const { cumple, bloqueantes, pendientes } = useMemo(
    () => calcularEstadoChecklist(checklist, tipoPersona),
    [checklist, tipoPersona]
  )

  if (bloqueantes.length === 0 && pendientes.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>Todos los ítems críticos revisados — el candidato puede ser <strong>habilitado</strong>.</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {bloqueantes.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="font-medium">El candidato será marcado como <strong>No Apto Legal</strong>.</span>
          </div>
          <ul className="ml-6 text-xs list-disc space-y-0.5">
            {bloqueantes.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      )}
      {pendientes.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="font-medium">{pendientes.length} ítem(s) crítico(s) sin revisar.</span>
          </div>
          <ul className="ml-6 text-xs list-disc space-y-0.5">
            {pendientes.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
