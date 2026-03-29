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
import { Loader2, Eye, Trash2, AlertCircle, Paperclip, ScanSearch, X } from 'lucide-react'
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa / persona</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Puntaje</TableHead>
                    <TableHead>Clasificación</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right w-24">Acciones</TableHead>
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
                      <TableCell className="font-medium">{p.razon_social}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.tipo_persona === 'juridica' ? 'Jurídica' : 'Natural'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${ESTADO_CLS[p.estado]}`}>
                          {LABEL_ESTADO[p.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold tabular-nums text-sm">
                          {p.puntaje_final > 0 ? p.puntaje_final.toFixed(1) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.clasificacion ? (
                          <Badge variant="outline" className={`text-xs ${CLAS_CLS[p.clasificacion]}`}>
                            {p.clasificacion.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin clasificar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.email ?? '—'}</TableCell>
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
    </div>
  )
}
