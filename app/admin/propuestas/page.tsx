'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { Input } from '@/components/ui/input'
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
import { Loader2, Eye, Trash2, AlertCircle, Paperclip, ScanSearch, X, Link2, Settings, Copy, Check, CalendarIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Spinner } from '@/components/ui/spinner'
import { PropuestaDetalle } from '@/components/admin/propuesta-detalle'
import { FormPropuesta } from '@/components/admin/form-propuesta'
import { LABEL_ESTADO, ESTADOS_TERMINALES } from '@/lib/types/index'
import type { Propuesta, Proceso, EstadoPropuesta, ClasificacionPropuesta, TipoPersona } from '@/lib/types/index'

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

const FORM_INIT = {
  tipo_persona: 'juridica' as TipoPersona,
  razon_social: '',
  nit_cedula: '',
  representante_legal: '',
  anios_experiencia: 0,
  unidades_administradas: 0,
  telefono: '',
  email: '',
  direccion: '',
  valor_honorarios: '',
  observaciones: '',
}

// ---------------------------------------------------------------------------
// Tipos y constantes para Acceso Proponente
// ---------------------------------------------------------------------------

type EstadoAcceso = 'inactivo' | 'activo' | 'expirado'

type AccesoProponente = {
  propuestaId: string
  codigo: string | null
  estado: EstadoAcceso
  fechaLimite: Date | null
  activo: boolean
}

const ESTADO_ACCESO_CLS: Record<EstadoAcceso, string> = {
  activo: 'bg-green-500/10 text-green-700 border-green-200',
  inactivo: 'bg-slate-500/10 text-slate-600 border-slate-200',
  expirado: 'bg-red-500/10 text-red-700 border-red-200',
}

const ESTADO_ACCESO_LABEL: Record<EstadoAcceso, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  expirado: 'Expirado',
}

function calcularEstadoAcceso(acceso: AccesoProponente): EstadoAcceso {
  if (!acceso.codigo) return 'inactivo'
  if (!acceso.activo) return 'inactivo'
  if (acceso.fechaLimite && new Date() > acceso.fechaLimite) return 'expirado'
  return 'activo'
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function PropuestasPage() {
  const [createOpen, setCreateOpen]       = useState(false)
  const [propuestas, setPropuestas]       = useState<Propuesta[]>([])
  const [procesos, setProcesos]           = useState<Proceso[]>([])
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [selectedProceso, setSelectedProceso] = useState<string>('')
  const [conjuntoId, setConjuntoId] = useState<string>('')
  const [selectedPropuesta, setSelectedPropuesta] = useState<Propuesta | null>(null)

  // Retiro
  const [retiroTarget, setRetiroTarget]   = useState<Propuesta | null>(null)
  const [retiroObs, setRetiroObs]         = useState('')
  const [retirando, setRetirando]         = useState(false)
  const [retiroError, setRetiroError]     = useState<string | null>(null)

  // Acceso Proponente
  const [accesosMap, setAccesosMap] = useState<Map<string, AccesoProponente>>(new Map())
  const [configTarget, setConfigTarget] = useState<Propuesta | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [generandoCodigo, setGenerandoCodigo] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadPropuestas = useCallback(async (procesoId: string): Promise<Propuesta[]> => {
    try {
      const res = await fetch(`/api/propuestas?proceso_id=${procesoId}`)
      if (!res.ok) throw new Error('Error al obtener propuestas')
      const data: Propuesta[] = await res.json()
      setPropuestas(data)

      // Cargar accesos guardados en paralelo
      const accesos = await Promise.all(
        data.map(async (p) => {
          try {
            const r = await fetch(`/api/propuestas/${p.id}/acceso`)
            if (!r.ok) return null
            const a = await r.json()
            if (!a?.codigo) return null
            const acceso: AccesoProponente = {
              propuestaId: a.propuesta_id,
              codigo: a.codigo,
              fechaLimite: a.fecha_limite ? new Date(a.fecha_limite) : null,
              activo: a.activo,
              estado: 'inactivo',
            }
            return { ...acceso, estado: calcularEstadoAcceso(acceso) }
          } catch {
            return null
          }
        })
      )
      setAccesosMap(() => {
        const map = new Map<string, AccesoProponente>()
        accesos.forEach((a) => { if (a) map.set(a.propuestaId, a) })
        return map
      })

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
        const conjRes = await fetch('/api/conjuntos')
        if (!conjRes.ok) throw new Error('Error al obtener conjunto')
        const conjunto = await conjRes.json()
        setConjuntoId(conjunto.id as string)

        const procRes = await fetch(`/api/procesos?conjunto_id=${conjunto.id}`)
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
  }, [loadPropuestas])

  async function handleProcesoChange(procesoId: string) {
    setSelectedProceso(procesoId)
    setSelectedPropuesta(null)
    await loadPropuestas(procesoId)
  }

  // Refresca la lista y mantiene la selección actualizada
  const handlePropuestaChanged = useCallback(async () => {
    const data = await loadPropuestas(selectedProceso)
    if (selectedPropuesta) {
      const fresh = data.find((p) => p.id === selectedPropuesta.id)
      setSelectedPropuesta(fresh ?? null)
    }
  }, [loadPropuestas, selectedProceso, selectedPropuesta])

  // ---------------------------------------------------------------------------
  // Funciones de Acceso Proponente
  // ---------------------------------------------------------------------------

  function getAcceso(propuestaId: string): AccesoProponente {
    return accesosMap.get(propuestaId) ?? {
      propuestaId,
      codigo: null,
      estado: 'inactivo',
      fechaLimite: null,
      activo: false,
    }
  }

  async function handleGenerarCodigo(propuesta: Propuesta) {
    setGenerandoCodigo(propuesta.id)
    try {
      const res = await fetch(`/api/propuestas/${propuesta.id}/acceso`, { method: 'POST' })
      if (!res.ok) throw new Error('Error al generar código')
      const data = await res.json()
      const acceso: AccesoProponente = {
        propuestaId: data.propuesta_id,
        codigo: data.codigo,
        fechaLimite: data.fecha_limite ? new Date(data.fecha_limite) : null,
        activo: data.activo,
        estado: 'inactivo',
      }
      setAccesosMap((prev) => new Map(prev).set(propuesta.id, { ...acceso, estado: calcularEstadoAcceso(acceso) }))
    } catch (e) {
      console.error('[handleGenerarCodigo]', e)
    } finally {
      setGenerandoCodigo(null)
    }
  }

  async function handleCopiarLink(propuesta: Propuesta) {
    const acceso = getAcceso(propuesta.id)
    if (!acceso.codigo) return
    
    const url = `${window.location.origin}/proponente/documentos?codigo=${acceso.codigo}`
    await navigator.clipboard.writeText(url)
    
    setCopiedId(propuesta.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleGuardarConfig(propuestaId: string, activo: boolean, fechaLimite: Date | null) {
    const res = await fetch(`/api/propuestas/${propuestaId}/acceso`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo, fechaLimite: fechaLimite?.toISOString() ?? null }),
    })
    if (res.ok) {
      const data = await res.json()
      const acceso: AccesoProponente = {
        propuestaId: data.propuesta_id,
        codigo: data.codigo,
        fechaLimite: data.fecha_limite ? new Date(data.fecha_limite) : null,
        activo: data.activo,
        estado: 'inactivo',
      }
      setAccesosMap((prev) => new Map(prev).set(propuestaId, { ...acceso, estado: calcularEstadoAcceso(acceso) }))
    }
    setConfigTarget(null)
  }

  // ---------------------------------------------------------------------------
  // RUT handlers
  // ---------------------------------------------------------------------------

  function handleRutFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setArchivoRut(e.target.files?.[0] ?? null)
  }

  async function handleExtraerRut() {
    if (!archivoRut) return
    const datos = await extraerRut(archivoRut)
    if (!datos) return
    setFormData((prev) => ({
      ...prev,
      tipo_persona: datos.tipoPersona,
      razon_social: datos.razonSocial || prev.razon_social,
      nit_cedula: datos.nitCompleto || prev.nit_cedula,
      representante_legal: datos.representanteLegal || prev.representante_legal,
      email: datos.email || prev.email,
      telefono: datos.telefono || prev.telefono,
      direccion: datos.direccion || prev.direccion,
    }))
  }

  function handleCloseDialog(open: boolean) {
    setCreateOpen(open)
  }

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Candidatos</p>
          <h1 className="text-2xl tracking-tight">Propuestas</h1>
          <p className="text-sm text-muted-foreground">
            Tabla + detalle: documentos, evaluación, puntaje y trazabilidad.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={handleCloseDialog}>
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
                  handleCloseDialog(false)
                }}
                onCancel={() => handleCloseDialog(false)}
                hideCard
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selector de proceso */}
      {procesos.length > 0 && (
        <div className="flex items-center gap-3">
          <Label>Proceso:</Label>
          <Select value={selectedProceso} onValueChange={handleProcesoChange}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
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
                      <TableHead className="hidden lg:table-cell">Acceso Proponente</TableHead>
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
                        {/* Acceso Proponente */}
                        <TableCell className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const acceso = getAcceso(p.id)
                            const estado = calcularEstadoAcceso(acceso)
                            const isGenerando = generandoCodigo === p.id
                            const isCopied = copiedId === p.id

                            return (
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-xs shrink-0 ${ESTADO_ACCESO_CLS[estado]}`}
                                >
                                  {ESTADO_ACCESO_LABEL[estado]}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  {!acceso.codigo ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => handleGenerarCodigo(p)}
                                      disabled={isGenerando}
                                    >
                                      {isGenerando ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Link2 className="h-3 w-3" />
                                      )}
                                      Generar
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        title="Copiar link"
                                        onClick={() => handleCopiarLink(p)}
                                      >
                                        {isCopied ? (
                                          <Check className="h-3.5 w-3.5 text-green-600" />
                                        ) : (
                                          <Copy className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        title="Configurar acceso"
                                        onClick={() => setConfigTarget(p)}
                                      >
                                        <Settings className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })()}
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
                Haz clic en una fila para ver el detalle. No avanza a Evaluación si la documentación es incompleta o la validación legal es No Apto.
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

      {/* Drawer de configuración de acceso proponente */}
      <Drawer open={configTarget !== null} onOpenChange={(open) => { if (!open) setConfigTarget(null) }}>
        <DrawerContent>
          {configTarget && (
            <ConfiguracionAccesoDrawer
              propuesta={configTarget}
              acceso={getAcceso(configTarget.id)}
              onGuardar={(activo, fechaLimite) => handleGuardarConfig(configTarget.id, activo, fechaLimite)}
              onCerrar={() => setConfigTarget(null)}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente Drawer de Configuración
// ---------------------------------------------------------------------------

function ConfiguracionAccesoDrawer({
  propuesta,
  acceso,
  onGuardar,
  onCerrar,
}: {
  propuesta: Propuesta
  acceso: AccesoProponente
  onGuardar: (activo: boolean, fechaLimite: Date | null) => Promise<void>
  onCerrar: () => void
}) {
  const [activo, setActivo] = useState(acceso.activo)
  const [fechaLimite, setFechaLimite] = useState<Date | undefined>(acceso.fechaLimite ?? undefined)
  const [guardando, setGuardando] = useState(false)

  async function handleGuardar() {
    setGuardando(true)
    try {
      await onGuardar(activo, fechaLimite ?? null)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Configurar Acceso Proponente</DrawerTitle>
        <DrawerDescription>
          Configura el acceso para <strong>{propuesta.razon_social}</strong>
        </DrawerDescription>
      </DrawerHeader>

      <div className="p-4 space-y-6">
        {/* Código actual */}
        {acceso.codigo && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Código de acceso</p>
            <p className="font-mono text-lg font-semibold tracking-wider">{acceso.codigo}</p>
          </div>
        )}

        {/* Toggle Activo/Inactivo */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="acceso-activo" className="text-sm font-medium">
              Acceso activo
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permite al proponente cargar documentos
            </p>
          </div>
          <Switch
            id="acceso-activo"
            checked={activo}
            onCheckedChange={setActivo}
          />
        </div>

        {/* Fecha límite */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Fecha límite</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fechaLimite ? (
                  format(fechaLimite, "PPP", { locale: es })
                ) : (
                  <span className="text-muted-foreground">Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fechaLimite}
                onSelect={setFechaLimite}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            Despues de esta fecha no se podran cargar documentos.
          </p>
        </div>

        {/* Aviso de estado */}
        {!activo && acceso.codigo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="inline h-4 w-4 mr-2" />
            El proponente no podra acceder mientras el acceso este inactivo.
          </div>
        )}
      </div>

      <DrawerFooter>
        <Button onClick={handleGuardar} disabled={guardando} className="gap-2">
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
        <DrawerClose asChild>
          <Button variant="outline" onClick={onCerrar}>Cancelar</Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  )
}
