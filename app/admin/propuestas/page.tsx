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
import { Loader2, Eye, Trash2, AlertCircle, Paperclip, ScanSearch, X, Link2, Settings, Copy, Check, CalendarIcon, ChevronLeft, ChevronRight, CircleDollarSign, ShieldX, UserX, UserCheck, ClipboardCheck } from 'lucide-react'
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
import { LABEL_ESTADO, ITEMS_VALIDACION_LEGAL } from '@/lib/types/index'
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
  entrevistado:    'bg-cyan-500/10 text-cyan-700',
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
// Helper: % cumplimiento legal para la tabla
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

export default function PropuestasPage() {
  const [createOpen, setCreateOpen]       = useState(false)
  const [propuestas, setPropuestas]       = useState<Propuesta[]>([])
  const [procesos, setProcesos]           = useState<Proceso[]>([])
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [selectedProceso, setSelectedProceso] = useState<string>('')
  const [conjuntoId, setConjuntoId] = useState<string>('')
  const [selectedPropuesta, setSelectedPropuesta] = useState<Propuesta | null>(null)
  const selectedPropuestaRef = useRef<Propuesta | null>(null)
  useEffect(() => { selectedPropuestaRef.current = selectedPropuesta }, [selectedPropuesta])

  // Usuario actual y rol
  const [userInfo, setUserInfo] = useState<{ id?: string; rol?: string; nombre?: string } | null>(null)
  const [filterMode, setFilterMode] = useState<'todas' | 'mias'>('todas')

  // Filtro tipo persona
  const [filterTipoPersona, setFilterTipoPersona] = useState<'todas' | 'juridica' | 'natural'>('todas')

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10

  // Retiro
  const [retiroTarget, setRetiroTarget]   = useState<Propuesta | null>(null)
  const [retiroObs, setRetiroObs]         = useState('')
  const [retirando, setRetirando]         = useState(false)
  const [retiroError, setRetiroError]     = useState<string | null>(null)

  // Rechazo por tope económico
  const [topeTarget, setTopeTarget]   = useState<Propuesta | null>(null)
  const [topeObs, setTopeObs]         = useState('')
  const [rechazando, setRechazando]   = useState(false)
  const [topeError, setTopeError]     = useState<string | null>(null)

  // Rechazo por validación legal
  const [legalTarget, setLegalTarget]     = useState<Propuesta | null>(null)
  const [legalObs, setLegalObs]           = useState('')
  const [rechazandoLegal, setRechazandoLegal] = useState(false)
  const [legalError, setLegalError]       = useState<string | null>(null)

  // No apto por entrevista
  const [entrevistaTarget, setEntrevistaTarget]     = useState<Propuesta | null>(null)
  const [entrevistaObs, setEntrevistaObs]           = useState('')
  const [rechazandoEntrevista, setRechazandoEntrevista] = useState(false)
  const [entrevistaError, setEntrevistaError]       = useState<string | null>(null)

  // Entrevistado
  const [entrevistadoTarget, setEntrevistadoTarget] = useState<Propuesta | null>(null)
  const [entrevistadoObs, setEntrevistadoObs]       = useState('')
  const [marcandoEntrevistado, setMarcandoEntrevistado] = useState(false)
  const [entrevistadoError, setEntrevistadoError]   = useState<string | null>(null)

  // Preseleccionado por entrevista
  const [preselTarget, setPreselTarget]       = useState<Propuesta | null>(null)
  const [preselObs, setPreselObs]             = useState('')
  const [preseleccionando, setPreseleccionando] = useState(false)
  const [preselError, setPreselError]         = useState<string | null>(null)

  // Acceso Proponente
  const [accesosMap, setAccesosMap] = useState<Map<string, AccesoProponente>>(new Map())
  const [configTarget, setConfigTarget] = useState<Propuesta | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [generandoCodigo, setGenerandoCodigo] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadPropuestas = useCallback(async (procesoId: string, filter: 'todas' | 'mias' = 'todas'): Promise<Propuesta[]> => {
    try {
      const filterParam = filter === 'mias' ? '&filter=mine' : ''
      const res = await fetch(`/api/propuestas?proceso_id=${procesoId}${filterParam}`)
      if (!res.ok) throw new Error('Error al obtener propuestas')
      const data: Propuesta[] = await res.json()
      setPropuestas(data)

      // Cargar accesos en una sola query batch
      try {
        const r = await fetch(`/api/acceso-proponentes?proceso_id=${procesoId}`)
        if (r.ok) {
          const accesosRaw: { propuesta_id: string; codigo: string; activo: boolean; fecha_limite: string | null }[] = await r.json()
          setAccesosMap(() => {
            const map = new Map<string, AccesoProponente>()
            for (const a of accesosRaw) {
              if (!a.codigo) continue
              const acceso: AccesoProponente = {
                propuestaId: a.propuesta_id,
                codigo: a.codigo,
                fechaLimite: a.fecha_limite ? new Date(a.fecha_limite) : null,
                activo: a.activo,
                estado: 'inactivo',
              }
              map.set(a.propuesta_id, { ...acceso, estado: calcularEstadoAcceso(acceso) })
            }
            return map
          })
        }
      } catch {
        // no bloquear carga de propuestas si falla el batch de accesos
      }

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
        // Obtener información del usuario actual
        const meRes = await fetch('/api/me')
        if (meRes.ok) {
          const meData = await meRes.json()
          setUserInfo({ id: meData.id, rol: meData.rol, nombre: meData.nombre })
        }

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
          await loadPropuestas(primerProceso, filterModeRef.current)
        }
      } catch (e) {
        console.error('Error fetching data:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  // loadPropuestas es estable (deps vacíos). filterMode se lee por ref para no re-ejecutar el init completo al cambiar el filtro.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPropuestas])

  async function handleProcesoChange(procesoId: string) {
    setSelectedProceso(procesoId)
    setSelectedPropuesta(null)
    setCurrentPage(1)
    await loadPropuestas(procesoId, filterMode)
  }

  async function handleFilterChange(filter: 'todas' | 'mias') {
    setFilterMode(filter)
    setCurrentPage(1)
    if (selectedProceso) {
      await loadPropuestas(selectedProceso, filter)
    }
  }

  // Refresca la lista y mantiene la selección actualizada.
  // Usa ref para selectedPropuesta para no recrear la función en cada cambio de selección.
  const selectedProcesoRef = useRef(selectedProceso)
  const filterModeRef = useRef(filterMode)
  useEffect(() => { selectedProcesoRef.current = selectedProceso }, [selectedProceso])
  useEffect(() => { filterModeRef.current = filterMode }, [filterMode])

  const handlePropuestaChanged = useCallback(async () => {
    const data = await loadPropuestas(selectedProcesoRef.current, filterModeRef.current)
    const current = selectedPropuestaRef.current
    if (current) {
      const fresh = data.find((p) => p.id === current.id)
      setSelectedPropuesta(fresh ?? null)
    }
  }, [loadPropuestas])

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
      await loadPropuestas(selectedProceso, filterMode)
    } catch (e) {
      setRetiroError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setRetirando(false)
    }
  }

  async function handleRechazarTope() {
    if (!topeTarget || !topeObs.trim()) return
    setRechazando(true)
    setTopeError(null)
    try {
      const res = await fetch(`/api/propuestas/${topeTarget.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'descalificada', observacion: topeObs.trim() }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al descalificar propuesta')
      }
      if (selectedPropuesta?.id === topeTarget.id) setSelectedPropuesta(null)
      setTopeTarget(null)
      setTopeObs('')
      await loadPropuestas(selectedProceso, filterMode)
    } catch (e) {
      setTopeError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setRechazando(false)
    }
  }

  async function handleRechazarLegal() {
    if (!legalTarget || !legalObs.trim()) return
    setRechazandoLegal(true)
    setLegalError(null)
    try {
      const res = await fetch(`/api/propuestas/${legalTarget.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'no_apto_legal', observacion: legalObs.trim() }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al rechazar propuesta')
      }
      if (selectedPropuesta?.id === legalTarget.id) setSelectedPropuesta(null)
      setLegalTarget(null)
      setLegalObs('')
      await loadPropuestas(selectedProceso, filterMode)
    } catch (e) {
      setLegalError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setRechazandoLegal(false)
    }
  }

  async function handleRechazarEntrevista() {
    if (!entrevistaTarget || !entrevistaObs.trim()) return
    setRechazandoEntrevista(true)
    setEntrevistaError(null)
    try {
      const res = await fetch(`/api/propuestas/${entrevistaTarget.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'descalificada', observacion: entrevistaObs.trim() }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al marcar propuesta')
      }
      if (selectedPropuesta?.id === entrevistaTarget.id) setSelectedPropuesta(null)
      setEntrevistaTarget(null)
      setEntrevistaObs('')
      await loadPropuestas(selectedProceso, filterMode)
    } catch (e) {
      setEntrevistaError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setRechazandoEntrevista(false)
    }
  }

  async function handleMarcarEntrevistado() {
    if (!entrevistadoTarget) return
    setMarcandoEntrevistado(true)
    setEntrevistadoError(null)
    try {
      const res = await fetch(`/api/propuestas/${entrevistadoTarget.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'entrevistado', observacion: entrevistadoObs.trim() || 'Entrevista realizada.' }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al actualizar')
      }
      setEntrevistadoTarget(null)
      setEntrevistadoObs('')
      await loadPropuestas(selectedProceso, filterMode)
    } catch (e) {
      setEntrevistadoError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setMarcandoEntrevistado(false)
    }
  }

  async function handlePreseleccionarEntrevista() {
    if (!preselTarget) return
    setPreseleccionando(true)
    setPreselError(null)
    try {
      const res = await fetch(`/api/propuestas/${preselTarget.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'preseleccionado', observacion: preselObs.trim() || 'Preseleccionado tras entrevista.' }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al preseleccionar propuesta')
      }
      setPreselTarget(null)
      setPreselObs('')
      await loadPropuestas(selectedProceso, filterMode)
    } catch (e) {
      setPreselError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setPreseleccionando(false)
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
                  loadPropuestas(selectedProceso, filterMode)
                  handleCloseDialog(false)
                }}
                onCancel={() => handleCloseDialog(false)}
                hideCard
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selector de proceso y filtro */}
      {procesos.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
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
          
          {/* Filtro de propuestas */}
          <div className="flex items-center gap-2">
            <Label>Mostrar:</Label>
            <Select value={filterMode} onValueChange={(v) => handleFilterChange(v as 'todas' | 'mias')}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las propuestas</SelectItem>
                <SelectItem value="mias">Cargadas por mí</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro tipo persona */}
          <div className="flex items-center gap-2">
            <Label>Tipo:</Label>
            <Select
              value={filterTipoPersona}
              onValueChange={(v) => {
                setFilterTipoPersona(v as 'todas' | 'juridica' | 'natural')
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos</SelectItem>
                <SelectItem value="juridica">Jurídica</SelectItem>
                <SelectItem value="natural">Natural</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                      <TableHead className="hidden md:table-cell text-right">Eval. admin</TableHead>
                      <TableHead className="hidden md:table-cell">Clasificación</TableHead>
                      <TableHead className="hidden lg:table-cell">Acceso Proponente</TableHead>
                      <TableHead className="hidden lg:table-cell">Cargado por</TableHead>
                      <TableHead className="text-right w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...propuestas]
                      .filter((p) => filterTipoPersona === 'todas' || p.tipo_persona === filterTipoPersona)
                      .sort((a, b) => {
                        const pctA = pctCumplimientoLegal(a) ?? -1
                        const pctB = pctCumplimientoLegal(b) ?? -1
                        return pctB - pctA
                      })
                      .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                      .map((p) => (
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
                            return (
                              <p className={`text-[10px] tabular-nums mt-0.5 ${color}`}>
                                {pct}% legal
                              </p>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                          {p.puntaje_admin != null ? (
                            <span className={`font-bold tabular-nums text-sm ${
                              p.puntaje_admin >= 85 ? 'text-green-700' :
                              p.puntaje_admin >= 70 ? 'text-yellow-700' :
                              p.puntaje_admin >= 55 ? 'text-orange-600' :
                              'text-destructive'
                            }`}>
                              {p.puntaje_admin.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
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
                        {/* Cargado por */}
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {p.created_by_nombre ?? '—'}
                        </TableCell>
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
                            {!['adjudicado', 'descalificada', 'retirada'].includes(p.estado) && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-orange-600 hover:text-orange-700"
                                  title="Rechazar por tope económico"
                                  onClick={() => { setTopeTarget(p); setTopeObs(''); setTopeError(null) }}
                                >
                                  <CircleDollarSign className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-indigo-600 hover:text-indigo-700"
                                  title="Rechazar por validación legal"
                                  onClick={() => { setLegalTarget(p); setLegalObs(''); setLegalError(null) }}
                                >
                                  <ShieldX className="h-3.5 w-3.5" />
                                </Button>
                                {/* Entrevistado: disponible antes de la entrevista */}
                                {!['entrevistado', 'preseleccionado'].includes(p.estado) && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-cyan-600 hover:text-cyan-700"
                                    title="Marcar como Entrevistado"
                                    onClick={() => { setEntrevistadoTarget(p); setEntrevistadoObs(''); setEntrevistadoError(null) }}
                                  >
                                    <ClipboardCheck className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {/* Preseleccionado y No apto: solo desde Entrevistado */}
                                {p.estado === 'entrevistado' && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-violet-600 hover:text-violet-700"
                                      title="Preseleccionado por entrevista"
                                      onClick={() => { setPreselTarget(p); setPreselObs(''); setPreselError(null) }}
                                    >
                                      <UserCheck className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-rose-600 hover:text-rose-700"
                                      title="No apto por entrevista"
                                      onClick={() => { setEntrevistaTarget(p); setEntrevistaObs(''); setEntrevistaError(null) }}
                                    >
                                      <UserX className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive/80"
                                  title="Retirar propuesta"
                                  onClick={() => { setRetiroTarget(p); setRetiroObs(''); setRetiroError(null) }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Paginador */}
              {(() => {
                const propuestasFiltradas = propuestas.filter(
                  (p) => filterTipoPersona === 'todas' || p.tipo_persona === filterTipoPersona
                )
                const total = propuestasFiltradas.length
                if (total === 0) return null
                return (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {Math.min((currentPage - 1) * PAGE_SIZE + 1, total)} - {Math.min(currentPage * PAGE_SIZE, total)} de {total}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: Math.ceil(total / PAGE_SIZE) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(total / PAGE_SIZE)
                          if (totalPages <= 5) return true
                          if (page === 1 || page === totalPages) return true
                          if (Math.abs(page - currentPage) <= 1) return true
                          return false
                        })
                        .map((page, idx, arr) => (
                          <span key={page} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="px-1 text-muted-foreground">...</span>
                            )}
                            <Button
                              size="sm"
                              variant={currentPage === page ? 'default' : 'outline'}
                              className="h-8 w-8 p-0"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          </span>
                        ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))}
                        disabled={currentPage >= Math.ceil(total / PAGE_SIZE)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })()}
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

      {/* Dialog: rechazo por tope económico */}
      <Dialog
        open={topeTarget !== null}
        onOpenChange={(open) => { if (!open) { setTopeTarget(null); setTopeObs(''); setTopeError(null) } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar por tope económico</DialogTitle>
            <DialogDescription>
              La propuesta de <strong>{topeTarget?.razon_social}</strong> pasará al estado{' '}
              <em>Descalificada</em>. Esta acción es irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {topeTarget?.valor_honorarios && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Honorarios propuestos: </span>
                <span className="tabular-nums">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(topeTarget.valor_honorarios)}
                </span>
              </div>
            )}
            {topeError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {topeError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="tope-obs">Observación <span className="text-destructive">*</span></Label>
              <Textarea
                id="tope-obs"
                placeholder="Ej: Honorarios propuestos superan el tope de $X definido en la convocatoria..."
                value={topeObs}
                onChange={(e) => setTopeObs(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setTopeTarget(null); setTopeObs(''); setTopeError(null) }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazarTope}
              disabled={rechazando || !topeObs.trim()}
              className="gap-2"
            >
              {rechazando && <Loader2 className="h-4 w-4 animate-spin" />}
              Descalificar propuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Dialog: rechazo por validación legal */}
      <Dialog
        open={legalTarget !== null}
        onOpenChange={(open) => { if (!open) { setLegalTarget(null); setLegalObs(''); setLegalError(null) } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar por validación legal</DialogTitle>
            <DialogDescription>
              La propuesta de <strong>{legalTarget?.razon_social}</strong> pasará al estado{' '}
              <em>No apto legal</em>. Esta acción es irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {legalError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {legalError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="legal-obs">Observación <span className="text-destructive">*</span></Label>
              <Textarea
                id="legal-obs"
                placeholder="Ej: No cumple con los requisitos legales: antecedentes disciplinarios activos en Procuraduría..."
                value={legalObs}
                onChange={(e) => setLegalObs(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setLegalTarget(null); setLegalObs(''); setLegalError(null) }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazarLegal}
              disabled={rechazandoLegal || !legalObs.trim()}
              className="gap-2"
            >
              {rechazandoLegal && <Loader2 className="h-4 w-4 animate-spin" />}
              Marcar como No apto legal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: no apto por entrevista */}
      <Dialog
        open={entrevistaTarget !== null}
        onOpenChange={(open) => { if (!open) { setEntrevistaTarget(null); setEntrevistaObs(''); setEntrevistaError(null) } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No apto por entrevista</DialogTitle>
            <DialogDescription>
              La propuesta de <strong>{entrevistaTarget?.razon_social}</strong> pasará al estado{' '}
              <em>Descalificada</em>. Esta acción es irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {entrevistaError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {entrevistaError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="entrevista-obs">Observación <span className="text-destructive">*</span></Label>
              <Textarea
                id="entrevista-obs"
                placeholder="Ej: No demostró conocimiento suficiente en gestión de propiedad horizontal de alta densidad..."
                value={entrevistaObs}
                onChange={(e) => setEntrevistaObs(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEntrevistaTarget(null); setEntrevistaObs(''); setEntrevistaError(null) }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazarEntrevista}
              disabled={rechazandoEntrevista || !entrevistaObs.trim()}
              className="gap-2"
            >
              {rechazandoEntrevista && <Loader2 className="h-4 w-4 animate-spin" />}
              Marcar como No apto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: entrevistado */}
      <Dialog
        open={entrevistadoTarget !== null}
        onOpenChange={(open) => { if (!open) { setEntrevistadoTarget(null); setEntrevistadoObs(''); setEntrevistadoError(null) } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como Entrevistado</DialogTitle>
            <DialogDescription>
              Registra que <strong>{entrevistadoTarget?.razon_social}</strong> fue entrevistado.
              Luego podrás marcarlo como Preseleccionado o No apto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {entrevistadoError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {entrevistadoError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="entrevistado-obs">Observaciones de la entrevista (opcional)</Label>
              <Textarea
                id="entrevistado-obs"
                placeholder="Ej: Candidato puntual, domina normativa de propiedad horizontal, mostró propuesta clara de gestión..."
                value={entrevistadoObs}
                onChange={(e) => setEntrevistadoObs(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEntrevistadoTarget(null); setEntrevistadoObs(''); setEntrevistadoError(null) }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
              onClick={handleMarcarEntrevistado}
              disabled={marcandoEntrevistado}
            >
              {marcandoEntrevistado && <Loader2 className="h-4 w-4 animate-spin" />}
              <ClipboardCheck className="h-4 w-4" />
              Confirmar entrevista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: preseleccionado por entrevista */}
      <Dialog
        open={preselTarget !== null}
        onOpenChange={(open) => { if (!open) { setPreselTarget(null); setPreselObs(''); setPreselError(null) } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preseleccionado por entrevista</DialogTitle>
            <DialogDescription>
              La propuesta de <strong>{preselTarget?.razon_social}</strong> pasará al estado{' '}
              <em>Preseleccionado</em> y tendrá prioridad en el ranking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {preselError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {preselError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="presel-obs">Observación (opcional)</Label>
              <Textarea
                id="presel-obs"
                placeholder="Ej: Demostró sólido conocimiento en gestión de propiedad horizontal de alta densidad..."
                value={preselObs}
                onChange={(e) => setPreselObs(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPreselTarget(null); setPreselObs(''); setPreselError(null) }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              onClick={handlePreseleccionarEntrevista}
              disabled={preseleccionando}
            >
              {preseleccionando && <Loader2 className="h-4 w-4 animate-spin" />}
              <UserCheck className="h-4 w-4" />
              Marcar como Preseleccionado
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
