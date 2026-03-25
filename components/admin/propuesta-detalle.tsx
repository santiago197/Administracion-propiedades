'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  AlertCircle,
  FileText,
  Trash2,
  ExternalLink,
  Edit2,
  Save,
  X,
  Plus,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { PanelEvaluacion } from '@/components/admin/panel-evaluacion'
import { LABEL_ESTADO } from '@/lib/types/index'
import type {
  Propuesta,
  Documento,
  HistorialEstado,
  TipoDocumento,
  EstadoDocumento,
  ClasificacionPropuesta,
  TipoPersona,
} from '@/lib/types/index'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const TIPO_DOC_LABEL: Record<TipoDocumento, string> = {
  camara_comercio: 'Cámara de Comercio',
  rut: 'RUT',
  certificacion: 'Certificación',
  poliza: 'Póliza',
  estados_financieros: 'Estados Financieros',
  referencia: 'Referencia',
  otro: 'Otro',
}

const ESTADO_DOC_CLS: Record<EstadoDocumento, string> = {
  completo:   'bg-green-500/10 text-green-700',
  pendiente:  'bg-amber-500/10 text-amber-700',
  incompleto: 'bg-destructive/10 text-destructive',
  vencido:    'bg-orange-500/10 text-orange-700',
}

const CLAS_CLS: Record<ClasificacionPropuesta, string> = {
  destacado:   'bg-green-500/10 text-green-700 border-green-200',
  apto:        'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  condicionado:'bg-orange-500/10 text-orange-700 border-orange-200',
  no_apto:     'bg-red-500/10 text-red-700 border-red-200',
}

const TIPOS_DOC: TipoDocumento[] = [
  'camara_comercio', 'rut', 'certificacion', 'poliza',
  'estados_financieros', 'referencia', 'otro',
]

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type EditForm = {
  tipo_persona: TipoPersona
  razon_social: string
  nit_cedula: string
  representante_legal: string
  anios_experiencia: number
  unidades_administradas: number
  telefono: string
  email: string
  direccion: string
  valor_honorarios: string
  observaciones: string
}

type DocForm = {
  nombre: string
  tipo: TipoDocumento
  es_obligatorio: boolean
  fecha_vencimiento: string
  file: File | null
}

function initEditForm(p: Propuesta): EditForm {
  return {
    tipo_persona:          p.tipo_persona,
    razon_social:          p.razon_social,
    nit_cedula:            p.nit_cedula,
    representante_legal:   p.representante_legal ?? '',
    anios_experiencia:     p.anios_experiencia,
    unidades_administradas: p.unidades_administradas,
    telefono:              p.telefono ?? '',
    email:                 p.email ?? '',
    direccion:             p.direccion ?? '',
    valor_honorarios:      p.valor_honorarios?.toString() ?? '',
    observaciones:         p.observaciones ?? '',
  }
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

type Props = {
  propuesta: Propuesta
  onChanged: () => void
}

export function PropuestaDetalle({ propuesta, onChanged }: Props) {
  // Docs
  const [docs, setDocs]               = useState<Documento[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError]     = useState<string | null>(null)

  // Historial
  const [historial, setHistorial]           = useState<HistorialEstado[]>([])
  const [historialLoading, setHistorialLoading] = useState(false)

  // Edit (Info tab)
  const [editMode, setEditMode]     = useState(false)
  const [editForm, setEditForm]     = useState<EditForm>(() => initEditForm(propuesta))
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState<string | null>(null)

  // Add doc dialog
  const [docDialogOpen, setDocDialogOpen] = useState(false)
  const [docForm, setDocForm]             = useState<DocForm>({
    nombre: '', tipo: 'otro', es_obligatorio: false, fecha_vencimiento: '', file: null,
  })
  const [docSaving, setDocSaving] = useState(false)
  const [docError, setDocError]   = useState<string | null>(null)

  // Evaluation panel
  const [evalPanelOpen, setEvalPanelOpen] = useState(false)

  // ---------------------------------------------------------------------------
  // Loaders
  // ---------------------------------------------------------------------------

  const loadDocs = useCallback(() => {
    setDocsLoading(true)
    setDocsError(null)
    fetch(`/api/documentos?propuesta_id=${propuesta.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Error al cargar documentos'))))
      .then((data: Documento[]) => setDocs(data))
      .catch((e) => setDocsError(e.message ?? 'Error'))
      .finally(() => setDocsLoading(false))
  }, [propuesta.id])

  const loadHistorial = useCallback(() => {
    setHistorialLoading(true)
    fetch(`/api/propuestas/${propuesta.id}/estado`)
      .then((r) => (r.ok ? r.json() : { historial: [] }))
      .then((data) => setHistorial(data.historial ?? []))
      .catch(() => {})
      .finally(() => setHistorialLoading(false))
  }, [propuesta.id])

  useEffect(() => {
    setEditMode(false)
    setEditError(null)
    setEditForm(initEditForm(propuesta))
    setDocs([])
    setHistorial([])
    loadDocs()
    loadHistorial()
  }, [propuesta.id, loadDocs, loadHistorial])

  // ---------------------------------------------------------------------------
  // Edit handlers
  // ---------------------------------------------------------------------------

  async function handleEditSave() {
    setEditSaving(true)
    setEditError(null)
    try {
      const payload: Record<string, unknown> = {
        ...editForm,
        valor_honorarios: editForm.valor_honorarios !== '' ? Number(editForm.valor_honorarios) : null,
        anios_experiencia: Number(editForm.anios_experiencia),
        unidades_administradas: Number(editForm.unidades_administradas),
      }
      const res = await fetch(`/api/propuestas/${propuesta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al guardar')
      }
      setEditMode(false)
      onChanged()
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setEditSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Document handlers
  // ---------------------------------------------------------------------------

  async function handleDocSave() {
    if (!docForm.nombre.trim()) {
      setDocError('El nombre del documento es requerido')
      return
    }
    setDocSaving(true)
    setDocError(null)
    try {
      let archivo_url: string | null = null
      let archivo_pathname: string | null = null

      if (docForm.file) {
        const fd = new FormData()
        fd.append('file', docForm.file)
        fd.append('type', 'documento')
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) {
          const body = await uploadRes.json()
          throw new Error(body.error ?? 'Error al subir archivo')
        }
        const uploadData = await uploadRes.json()
        archivo_url = uploadData.url
        archivo_pathname = uploadData.pathname
      }

      const res = await fetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propuesta_id:     propuesta.id,
          tipo:             docForm.tipo,
          nombre:           docForm.nombre.trim(),
          es_obligatorio:   docForm.es_obligatorio,
          fecha_vencimiento: docForm.fecha_vencimiento || null,
          archivo_url,
          archivo_pathname,
          estado: archivo_url ? 'completo' : 'pendiente',
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al crear documento')
      }
      setDocDialogOpen(false)
      setDocForm({ nombre: '', tipo: 'otro', es_obligatorio: false, fecha_vencimiento: '', file: null })
      loadDocs()
    } catch (e) {
      setDocError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setDocSaving(false)
    }
  }

  async function handleDocEstado(docId: string, estado: EstadoDocumento) {
    await fetch('/api/documentos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: docId, estado }),
    })
    loadDocs()
  }

  async function handleDocDelete(docId: string) {
    if (!confirm('¿Eliminar este documento?')) return
    await fetch(`/api/documentos?id=${docId}`, { method: 'DELETE' })
    loadDocs()
  }

  // ---------------------------------------------------------------------------
  // Cálculos documentos
  // ---------------------------------------------------------------------------

  const obligatorios = docs.filter((d) => d.es_obligatorio)
  const completos    = obligatorios.filter((d) => d.estado === 'completo').length
  const docsPct      = obligatorios.length > 0 ? Math.round((completos / obligatorios.length) * 100) : 100
  const docsOk       = obligatorios.length === 0 || completos === obligatorios.length

  // ---------------------------------------------------------------------------
  // Renders de tabs
  // ---------------------------------------------------------------------------

  const canEdit   = propuesta.estado === 'registro'
  const canEvaluar = propuesta.estado === 'en_evaluacion'

  // ----- INFO -----
  function renderInfo() {
    if (editMode) {
      return (
        <div className="space-y-4">
          {editError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {editError}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de persona</Label>
              <Select
                value={editForm.tipo_persona}
                onValueChange={(v) => setEditForm({ ...editForm, tipo_persona: v as TipoPersona })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="juridica">Jurídica</SelectItem>
                  <SelectItem value="natural">Natural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{editForm.tipo_persona === 'juridica' ? 'NIT' : 'Cédula'}</Label>
              <Input value={editForm.nit_cedula} onChange={(e) => setEditForm({ ...editForm, nit_cedula: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{editForm.tipo_persona === 'juridica' ? 'Razón social' : 'Nombre completo'}</Label>
            <Input value={editForm.razon_social} onChange={(e) => setEditForm({ ...editForm, razon_social: e.target.value })} />
          </div>
          {editForm.tipo_persona === 'juridica' && (
            <div className="space-y-1.5">
              <Label>Representante legal</Label>
              <Input value={editForm.representante_legal} onChange={(e) => setEditForm({ ...editForm, representante_legal: e.target.value })} />
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Años de experiencia</Label>
              <Input type="number" value={editForm.anios_experiencia} onChange={(e) => setEditForm({ ...editForm, anios_experiencia: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Unidades administradas</Label>
              <Input type="number" value={editForm.unidades_administradas} onChange={(e) => setEditForm({ ...editForm, unidades_administradas: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={editForm.telefono} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <Input value={editForm.direccion} onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Valor honorarios mensuales</Label>
            <Input type="number" value={editForm.valor_honorarios} onChange={(e) => setEditForm({ ...editForm, valor_honorarios: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Input value={editForm.observaciones} onChange={(e) => setEditForm({ ...editForm, observaciones: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleEditSave} disabled={editSaving} className="gap-1.5">
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setEditError(null); setEditForm(initEditForm(propuesta)) }} className="gap-1.5">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <InfoField label="Empresa / Persona" value={propuesta.razon_social} />
          <InfoField label={propuesta.tipo_persona === 'juridica' ? 'NIT' : 'Cédula'} value={propuesta.nit_cedula} />
          <InfoField label="Tipo" value={propuesta.tipo_persona === 'juridica' ? 'Jurídica' : 'Natural'} />
          {propuesta.representante_legal && (
            <InfoField label="Representante legal" value={propuesta.representante_legal} />
          )}
          <InfoField label="Años de experiencia" value={`${propuesta.anios_experiencia} años`} />
          <InfoField label="Unidades administradas" value={propuesta.unidades_administradas.toLocaleString()} />
          {propuesta.email && <InfoField label="Email" value={propuesta.email} />}
          {propuesta.telefono && <InfoField label="Teléfono" value={propuesta.telefono} />}
          {propuesta.direccion && <InfoField label="Dirección" value={propuesta.direccion} />}
          {propuesta.valor_honorarios != null && (
            <InfoField label="Honorarios" value={`$${propuesta.valor_honorarios.toLocaleString()}`} />
          )}
        </div>

        {/* Validación legal */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Validación Legal</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={propuesta.cumple_requisitos_legales ? 'bg-green-500/10 text-green-700' : 'bg-destructive/10 text-destructive'}
            >
              {propuesta.cumple_requisitos_legales ? 'Cumple requisitos' : 'No cumple requisitos'}
            </Badge>
            {propuesta.clasificacion && (
              <Badge variant="outline" className={CLAS_CLS[propuesta.clasificacion]}>
                {propuesta.clasificacion.toUpperCase()}
              </Badge>
            )}
          </div>
          {propuesta.observaciones_legales && (
            <p className="text-sm text-muted-foreground mt-1">{propuesta.observaciones_legales}</p>
          )}
        </div>

        {propuesta.observaciones && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Observaciones</p>
            <p className="text-sm">{propuesta.observaciones}</p>
          </div>
        )}

        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1.5">
            <Edit2 className="h-4 w-4" />
            Editar información
          </Button>
        )}
        {!canEdit && (
          <p className="text-xs text-muted-foreground">
            Solo se puede editar en estado <strong>Registrado</strong>. Estado actual: {LABEL_ESTADO[propuesta.estado]}.
          </p>
        )}
      </div>
    )
  }

  // ----- DOCUMENTOS -----
  function renderDocumentos() {
    return (
      <div className="space-y-4">
        {/* Progreso */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Documentos obligatorios</span>
            <span className={`font-bold tabular-nums ${docsOk ? 'text-green-600' : 'text-amber-600'}`}>
              {completos} / {obligatorios.length} completos
            </span>
          </div>
          <Progress value={docsPct} className="h-2" />
          {!docsOk && (
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              La propuesta no puede avanzar a evaluación con documentación incompleta.
            </div>
          )}
        </div>

        {/* Errors */}
        {docsError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {docsError}
          </div>
        )}

        {/* Lista */}
        {docsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No hay documentos registrados.</p>
        ) : (
          <div className="divide-y divide-border/60 rounded-lg border">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{TIPO_DOC_LABEL[doc.tipo as TipoDocumento] ?? doc.tipo}</span>
                    {doc.es_obligatorio && <span className="text-xs text-primary font-medium">Obligatorio</span>}
                    {doc.fecha_vencimiento && (
                      <span className="text-xs text-muted-foreground">
                        Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString('es-CO')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={ESTADO_DOC_CLS[doc.estado] ?? ''}>
                    {doc.estado}
                  </Badge>
                  {doc.archivo_url && (
                    <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                  {doc.estado !== 'completo' ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-600 hover:text-green-700"
                      title="Marcar completo"
                      onClick={() => handleDocEstado(doc.id, 'completo')}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-amber-600 hover:text-amber-700"
                      title="Marcar pendiente"
                      onClick={() => handleDocEstado(doc.id, 'pendiente')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive/80"
                    title="Eliminar"
                    onClick={() => handleDocDelete(doc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setDocError(null); setDocDialogOpen(true) }}>
          <Plus className="h-4 w-4" />
          Agregar documento
        </Button>

        {/* Dialog agregar documento */}
        <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {docError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {docError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Nombre del documento *</Label>
                <Input
                  value={docForm.nombre}
                  onChange={(e) => setDocForm({ ...docForm, nombre: e.target.value })}
                  placeholder="Ej: Cámara de Comercio 2025"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={docForm.tipo} onValueChange={(v) => setDocForm({ ...docForm, tipo: v as TipoDocumento })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOC.map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_DOC_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="es_obligatorio"
                  checked={docForm.es_obligatorio}
                  onChange={(e) => setDocForm({ ...docForm, es_obligatorio: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="es_obligatorio">Obligatorio</Label>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de vencimiento</Label>
                <Input
                  type="date"
                  value={docForm.fecha_vencimiento}
                  onChange={(e) => setDocForm({ ...docForm, fecha_vencimiento: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Archivo (PDF / DOC)</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setDocForm({
                      ...docForm,
                      file: f,
                      nombre: docForm.nombre || (f?.name ?? ''),
                    })
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDocDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleDocSave} disabled={docSaving} className="gap-1.5">
                {docSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ----- EVALUACION -----
  function renderEvaluacion() {
    const bloqueado = !docsOk && propuesta.estado !== 'en_evaluacion'

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Puntaje evaluación</p>
            <p className="text-2xl font-bold tabular-nums">
              {propuesta.puntaje_evaluacion > 0 ? propuesta.puntaje_evaluacion.toFixed(1) : '—'}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Puntaje final</p>
            <p className="text-2xl font-bold tabular-nums">
              {propuesta.puntaje_final > 0 ? propuesta.puntaje_final.toFixed(2) : '—'}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Clasificación</p>
            {propuesta.clasificacion ? (
              <Badge variant="outline" className={`mt-1 ${CLAS_CLS[propuesta.clasificacion]}`}>
                {propuesta.clasificacion.toUpperCase()}
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-1">Pendiente</p>
            )}
          </div>
        </div>

        {bloqueado && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-500/10 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            La propuesta no puede ser evaluada: documentación incompleta.
          </div>
        )}

        {propuesta.estado === 'no_apto_legal' && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Esta propuesta fue rechazada en validación legal. No puede ser evaluada.
          </div>
        )}

        {canEvaluar ? (
          <Button onClick={() => setEvalPanelOpen(true)} className="gap-2">
            Abrir panel de evaluación
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : propuesta.puntaje_evaluacion === 0 ? (
          <p className="text-sm text-muted-foreground">
            La evaluación estará disponible cuando la propuesta esté en estado <strong>En Evaluación</strong>.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Evaluación completada. Estado actual: <strong>{LABEL_ESTADO[propuesta.estado]}</strong>.
          </p>
        )}

        <PanelEvaluacion
          propuesta={propuesta}
          open={evalPanelOpen}
          onOpenChange={setEvalPanelOpen}
          onSaved={() => { setEvalPanelOpen(false); onChanged() }}
        />
      </div>
    )
  }

  // ----- HISTORIAL -----
  function renderHistorial() {
    return (
      <div className="space-y-2">
        {historialLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : historial.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No hay historial disponible.</p>
        ) : (
          <div className="space-y-2">
            {[...historial].reverse().map((h) => (
              <div key={h.id} className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(h.created_at).toLocaleString('es-CO', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {h.estado_anterior && (
                      <>
                        <Badge variant="outline" className="text-xs">{LABEL_ESTADO[h.estado_anterior]}</Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <Badge variant="outline" className="text-xs font-medium">
                      {LABEL_ESTADO[h.estado_nuevo]}
                    </Badge>
                  </div>
                </div>
                {h.observacion && (
                  <p className="text-muted-foreground mt-1">{h.observacion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{propuesta.razon_social}</CardTitle>
            <CardDescription className="text-xs">
              {propuesta.nit_cedula} · {propuesta.tipo_persona === 'juridica' ? 'Jurídica' : 'Natural'}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {LABEL_ESTADO[propuesta.estado]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="info">
          <TabsList className="mb-4">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="documentos">
              Documentos
              {!docsOk && <span className="ml-1.5 h-2 w-2 rounded-full bg-amber-500 inline-block" />}
            </TabsTrigger>
            <TabsTrigger value="evaluacion">Evaluación</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>
          <TabsContent value="info">{renderInfo()}</TabsContent>
          <TabsContent value="documentos">{renderDocumentos()}</TabsContent>
          <TabsContent value="evaluacion">{renderEvaluacion()}</TabsContent>
          <TabsContent value="historial">{renderHistorial()}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-sm mt-0.5">{value}</p>
    </div>
  )
}
