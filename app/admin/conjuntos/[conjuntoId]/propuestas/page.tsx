'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Eye, Trash2, AlertCircle, ArrowLeft } from 'lucide-react'
import { PropuestaDetalle } from '@/components/admin/propuesta-detalle'
import { FormPropuesta } from '@/components/admin/form-propuesta'
import { LABEL_ESTADO, ESTADOS_TERMINALES, ITEMS_VALIDACION_LEGAL } from '@/lib/types/index'
import type { Propuesta, Proceso, EstadoPropuesta, ClasificacionPropuesta, TipoPersona, ChecklistLegal } from '@/lib/types/index'

// ---------------------------------------------------------------------------
// Constantes de presentación
// ---------------------------------------------------------------------------

const ESTADO_CLS: Record<EstadoPropuesta, string> = {
  registro:        'bg-slate-500/10 text-slate-600',
  en_revision:     'bg-blue-500/10 text-blue-700',
  incompleto:      'bg-amber-500/10 text-amber-700',
  en_subsanacion:  'bg-orange-500/10 text-orange-700',
  en_validacion:   'bg-indigo-500/10 text-indigo-700',
  no_apto_legal:   'bg-destructive/10 text-destructive',
  habilitada:      'bg-teal-500/10 text-teal-700',
  en_evaluacion:   'bg-blue-600/15 text-blue-800',
  condicionado:    'bg-orange-500/10 text-orange-700',
  apto:            'bg-yellow-500/10 text-yellow-700',
  destacado:       'bg-green-500/10 text-green-700',
  no_apto:         'bg-destructive/10 text-destructive',
  preseleccionado: 'bg-violet-500/10 text-violet-700',
  adjudicado:      'bg-emerald-600/10 text-emerald-700',
  descalificada:   'bg-destructive/10 text-destructive',
  retirada:        'bg-muted/80 text-muted-foreground',
}

const CLAS_CLS: Record<ClasificacionPropuesta, string> = {
  destacado:    'bg-green-500/10 text-green-700 border-green-200',
  apto:         'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  condicionado: 'bg-orange-500/10 text-orange-700 border-orange-200',
  no_apto:      'bg-red-500/10 text-red-700 border-red-200',
}

// ---------------------------------------------------------------------------
// Helper: % cumplimiento legal
// ---------------------------------------------------------------------------

function pctCumplimientoLegal(p: Propuesta): number | null {
  const ckl = (p as Propuesta & { checklist_legal?: ChecklistLegal }).checklist_legal
  if (!ckl || Object.keys(ckl).length === 0) return null
  const tipoPersona = p.tipo_persona as 'juridica' | 'natural'
  // Solo considerar ítems obligatorios (obligatorio !== false)
  const items = ITEMS_VALIDACION_LEGAL.filter((d) => 
    (d.aplica_a === 'ambos' || d.aplica_a === tipoPersona) && d.obligatorio !== false
  )
  if (items.length === 0) return null
  const noCumple = items.filter((d) => ckl[d.id]?.estado === 'no_cumple').length
  return Math.round(((items.length - noCumple) / items.length) * 100)
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function ConjuntoPropuestasPage() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string

  const [createOpen, setCreateOpen]             = useState(false)
  const [propuestas, setPropuestas]             = useState<Propuesta[]>([])
  const [procesos, setProcesos]                 = useState<Proceso[]>([])
  const [loading, setLoading]                   = useState(true)
  const [selectedProceso, setSelectedProceso]   = useState<string>('')
  const [selectedPropuesta, setSelectedPropuesta] = useState<Propuesta | null>(null)

  // Retiro
  const [retiroTarget, setRetiroTarget] = useState<Propuesta | null>(null)
  const [retiroObs, setRetiroObs]       = useState('')
  const [retirando, setRetirando]       = useState(false)
  const [retiroError, setRetiroError]   = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadPropuestas = useCallback(async (procesoId: string): Promise<Propuesta[]> => {
    try {
      const res = await fetch(`/api/propuestas?proceso_id=${procesoId}`)
      if (!res.ok) throw new Error('Error al obtener propuestas')
      const data: Propuesta[] = await res.json()
      setPropuestas(data)
      return data
    } catch {
      setPropuestas([])
      return []
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const procRes = await fetch(`/api/procesos?conjunto_id=${conjuntoId}`)
        if (!procRes.ok) throw new Error('Error al obtener procesos')
        const procesosData: Proceso[] = await procRes.json()
        setProcesos(procesosData)

        if (procesosData.length > 0) {
          const primerProceso = procesosData[0].id
          setSelectedProceso(primerProceso)
          await loadPropuestas(primerProceso)
        }
      } catch (e) {
        console.error('Error fetching data:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [conjuntoId, loadPropuestas])

  async function handleProcesoChange(procesoId: string) {
    setSelectedProceso(procesoId)
    setSelectedPropuesta(null)
    await loadPropuestas(procesoId)
  }

  const handlePropuestaChanged = useCallback(async () => {
    const data = await loadPropuestas(selectedProceso)
    if (selectedPropuesta) {
      const fresh = data.find((p) => p.id === selectedPropuesta.id)
      setSelectedPropuesta(fresh ?? null)
    }
  }, [loadPropuestas, selectedProceso, selectedPropuesta])

  // ---------------------------------------------------------------------------
  // Retirar propuesta
  // ---------------------------------------------------------------------------

  async function handleRetirar() {
    if (!retiroTarget) return
    setRetirando(true)
    setRetiroError(null)
    try {
      const res = await fetch(`/api/propuestas/${retiroTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacion: retiroObs.trim() || null }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al retirar propuesta')
      }
      if (selectedPropuesta?.id === retiroTarget.id) setSelectedPropuesta(null)
      setRetiroTarget(null)
      setRetiroObs('')
      await loadPropuestas(selectedProceso)
    } catch (e) {
      setRetiroError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setRetirando(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/admin/conjuntos/${conjuntoId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 mb-1 -ml-2 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al conjunto
            </Button>
          </Link>
          <h1 className="text-2xl tracking-tight">Propuestas</h1>
          <p className="text-sm text-muted-foreground">
            Tabla + detalle: documentos, evaluación, puntaje y trazabilidad.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={procesos.length === 0}>Agregar propuesta</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl sm:max-h-[90vh] sm:rounded-lg max-w-none max-h-none h-[100dvh] w-full rounded-none top-0 left-0 translate-x-0 translate-y-0 flex flex-col p-0 gap-0 border-none sm:border sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
            <DialogHeader className="p-6 pb-2 sm:p-6 border-b sm:border-none shrink-0">
              <DialogTitle>Nueva propuesta</DialogTitle>
              <DialogDescription>Registra un nuevo candidato para el proceso de selección.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6">
              <FormPropuesta
                procesoId={selectedProceso}
                onSuccess={() => {
                  loadPropuestas(selectedProceso)
                  setCreateOpen(false)
                }}
                onCancel={() => setCreateOpen(false)}
                hideCard
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selector de proceso */}
      {procesos.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label>Proceso:</Label>
          <Select value={selectedProceso} onValueChange={handleProcesoChange}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {procesos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Tabla de propuestas</CardTitle>
          <CardDescription>Estado, documentación, puntaje y clasificación automática.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedProceso ? (
            <p className="text-center py-8 text-muted-foreground">No hay procesos creados. Crea un proceso primero.</p>
          ) : propuestas.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay propuestas registradas para este proceso.</p>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa / persona</TableHead>
                      <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="hidden md:table-cell text-right">Puntaje</TableHead>
                      <TableHead className="hidden md:table-cell">Clasificación</TableHead>
                      <TableHead className="hidden lg:table-cell">Contacto</TableHead>
                      <TableHead className="text-right w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propuestas.map((p) => (
                      <TableRow
                        key={p.id}
                        className={`cursor-pointer hover:bg-muted/40 transition-colors ${
                          selectedPropuesta?.id === p.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                        }`}
                        onClick={() => setSelectedPropuesta(p)}
                      >
                        <TableCell className="font-medium max-w-[160px] truncate">{p.razon_social}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {p.tipo_persona === 'juridica' ? 'Jurídica' : 'Natural'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs whitespace-nowrap ${ESTADO_CLS[p.estado]}`}>
                            {LABEL_ESTADO[p.estado]}
                          </Badge>
                          {(() => {
                            const pct = pctCumplimientoLegal(p)
                            if (pct === null) return null
                            const color = pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-orange-600' : 'text-destructive'
                            return <p className={`text-[10px] tabular-nums mt-0.5 ${color}`}>{pct}% legal</p>
                          })()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                          <span className="font-semibold tabular-nums text-sm">
                            {p.puntaje_final > 0 ? p.puntaje_final.toFixed(1) : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {p.clasificacion ? (
                            <Badge variant="outline" className={`text-xs ${CLAS_CLS[p.clasificacion]}`}>
                              {p.clasificacion.toUpperCase()}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sin clasificar</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{p.email ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Ver detalle"
                              onClick={() => setSelectedPropuesta(p)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {!ESTADOS_TERMINALES.includes(p.estado) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive/80"
                                title="Retirar propuesta"
                                onClick={() => { setRetiroTarget(p); setRetiroObs(''); setRetiroError(null) }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Haz clic en una fila para ver el detalle.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Panel de detalle */}
      {selectedPropuesta && (
        <PropuestaDetalle
          propuesta={selectedPropuesta}
          onChanged={handlePropuestaChanged}
          procesoId={selectedProceso}
          conjuntoId={conjuntoId}
        />
      )}

      {/* Dialog de retiro */}
      <Dialog
        open={retiroTarget !== null}
        onOpenChange={(open) => { if (!open) { setRetiroTarget(null); setRetiroObs(''); setRetiroError(null) } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Retirar propuesta</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. La propuesta <strong>{retiroTarget?.razon_social}</strong> pasará
              al estado <em>Retirada</em> y no podrá continuar en el proceso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {retiroError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {retiroError}
              </div>
            )}
            <Label htmlFor="retiro-obs">Motivo del retiro</Label>
            <Textarea
              id="retiro-obs"
              placeholder="Descripción del motivo..."
              value={retiroObs}
              onChange={(e) => setRetiroObs(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRetiroTarget(null); setRetiroObs(''); setRetiroError(null) }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRetirar}
              disabled={retirando}
              className="gap-2"
            >
              {retirando && <Loader2 className="h-4 w-4 animate-spin" />}
              Retirar propuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
