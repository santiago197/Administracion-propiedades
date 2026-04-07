'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Pencil, Trash2, Plus, AlertCircle } from 'lucide-react'
import type { TipoDocumentoConfig, CategoriaDocumento, TipoPersonaDocumento } from '@/lib/types/index'
import { LABEL_CATEGORIA_DOCUMENTO, LABEL_TIPO_PERSONA_DOCUMENTO } from '@/lib/types/index'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const EXTENSIONES_DISPONIBLES = ['pdf', 'docx', 'xlsx', 'jpg', 'png']

const CATEGORIA_CLS: Record<CategoriaDocumento, string> = {
  legal:      'bg-blue-500/10 text-blue-700',
  financiero: 'bg-emerald-500/10 text-emerald-700',
  tecnico:    'bg-violet-500/10 text-violet-700',
  referencia: 'bg-amber-500/10 text-amber-700',
}

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type FormState = {
  nombre: string
  codigo: string
  categoria: CategoriaDocumento
  tipo_persona: TipoPersonaDocumento
  es_obligatorio: boolean
  extensiones_permitidas: string[]
  tamano_maximo_mb: number
  dias_vigencia: number
  activo: boolean
}

const FORM_INIT: FormState = {
  nombre: '',
  codigo: '',
  categoria: 'legal',
  tipo_persona: 'ambos',
  es_obligatorio: true,
  extensiones_permitidas: ['pdf'],
  tamano_maximo_mb: 10,
  dias_vigencia: 365,
  activo: true,
}

function generarCodigo(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 50)
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function TiposDocumentosPage() {
  const [tipos, setTipos]           = useState<TipoDocumentoConfig[]>([])
  const [loading, setLoading]       = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]       = useState<TipoDocumentoConfig | null>(null)
  const [form, setForm]             = useState<FormState>(FORM_INIT)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TipoDocumentoConfig | null>(null)
  const [deleting, setDeleting]     = useState(false)

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const loadTipos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tipos-documento')
      if (!res.ok) throw new Error('Error al obtener tipos')
      const data: TipoDocumentoConfig[] = await res.json()
      setTipos(data)
    } catch {
      setTipos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTipos() }, [loadTipos])

  // ---------------------------------------------------------------------------
  // Dialog handlers
  // ---------------------------------------------------------------------------

  function openCreate() {
    setEditing(null)
    setForm(FORM_INIT)
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(tipo: TipoDocumentoConfig) {
    setEditing(tipo)
    setForm({
      nombre:                 tipo.nombre,
      codigo:                 tipo.codigo,
      categoria:              tipo.categoria,
      tipo_persona:           tipo.tipo_persona,
      es_obligatorio:         tipo.es_obligatorio,
      extensiones_permitidas: tipo.extensiones_permitidas ?? [],
      tamano_maximo_mb:       tipo.tamano_maximo_mb,
      dias_vigencia:          tipo.dias_vigencia,
      activo:                 tipo.activo,
    })
    setError(null)
    setDialogOpen(true)
  }

  function handleNombreChange(nombre: string) {
    setForm((prev) => ({
      ...prev,
      nombre,
      codigo: prev.codigo && editing ? prev.codigo : generarCodigo(nombre),
    }))
  }

  function toggleExtension(ext: string) {
    setForm((prev) => {
      const exts = prev.extensiones_permitidas.includes(ext)
        ? prev.extensiones_permitidas.filter((e) => e !== ext)
        : [...prev.extensiones_permitidas, ext]
      return { ...prev, extensiones_permitidas: exts }
    })
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    if (!form.codigo.trim()) { setError('El código es requerido'); return }
    setSaving(true)
    setError(null)
    try {
      const url = editing ? `/api/tipos-documento/${editing.id}` : '/api/tipos-documento'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al guardar')
      }
      setDialogOpen(false)
      await loadTipos()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActivo(tipo: TipoDocumentoConfig) {
    try {
      await fetch(`/api/tipos-documento/${tipo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !tipo.activo }),
      })
      await loadTipos()
    } catch { /* silent */ }
  }

  async function handleToggleObligatorio(tipo: TipoDocumentoConfig) {
    try {
      await fetch(`/api/tipos-documento/${tipo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ es_obligatorio: !tipo.es_obligatorio }),
      })
      await loadTipos()
    } catch { /* silent */ }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tipos-documento/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setDeleteTarget(null)
      await loadTipos()
    } catch { /* silent */ } finally {
      setDeleting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderTabla(filtro: TipoPersonaDocumento | 'todos') {
    const lista = filtro === 'todos' ? tipos : tipos.filter((t) => t.tipo_persona === filtro)

    if (lista.length === 0) {
      return (
        <p className="text-center py-8 text-sm text-muted-foreground">
          No hay tipos de documento configurados para esta categoría.
        </p>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Obligatorio</TableHead>
            <TableHead>Extensiones</TableHead>
            <TableHead>Máx. (MB)</TableHead>
            <TableHead>Vigencia</TableHead>
            <TableHead>Activo</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((t) => (
            <TableRow key={t.id} className={t.activo ? '' : 'opacity-50'}>
              <TableCell className="font-medium max-w-xs">
                <span className="truncate block">{t.nombre}</span>
                <span className="text-xs text-muted-foreground font-mono">{t.codigo}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs ${CATEGORIA_CLS[t.categoria]}`}>
                  {LABEL_CATEGORIA_DOCUMENTO[t.categoria]}
                </Badge>
              </TableCell>
              <TableCell>
                <Switch
                  checked={t.es_obligatorio}
                  onCheckedChange={() => handleToggleObligatorio(t)}
                  aria-label="Obligatorio/Opcional"
                />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {(t.extensiones_permitidas ?? []).length > 0
                  ? t.extensiones_permitidas.join(', ').toUpperCase()
                  : '—'}
              </TableCell>
              <TableCell className="text-sm">{t.tamano_maximo_mb} MB</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {t.dias_vigencia === 365 ? '1 año' : `${t.dias_vigencia} días`}
              </TableCell>
              <TableCell>
                <Switch
                  checked={t.activo}
                  onCheckedChange={() => handleToggleActivo(t)}
                  aria-label="Activar/desactivar"
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive/80"
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Configuración</p>
          <h1 className="text-2xl tracking-tight">Parámetros documentales</h1>
          <p className="text-sm text-muted-foreground">
            Tipos de documentos requeridos por persona natural y jurídica.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nuevo tipo
        </Button>
      </div>

      {/* Tabs por tipo de persona */}
      <Tabs defaultValue="todos">
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="ambos">Generales</TabsTrigger>
          <TabsTrigger value="natural">Persona Natural</TabsTrigger>
          <TabsTrigger value="juridica">Persona Jurídica</TabsTrigger>
        </TabsList>

        {(['todos', 'ambos', 'natural', 'juridica'] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {tab === 'todos' ? 'Todos los tipos' : LABEL_TIPO_PERSONA_DOCUMENTO[tab as TipoPersonaDocumento]}
                </CardTitle>
                <CardDescription>
                  {tab === 'todos' && 'Lista completa de tipos de documento configurados.'}
                  {tab === 'ambos' && 'Documentos requeridos para todos los candidatos, independientemente del tipo de persona.'}
                  {tab === 'natural' && 'Documentos requeridos únicamente para personas naturales.'}
                  {tab === 'juridica' && 'Documentos requeridos únicamente para personas jurídicas.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : renderTabla(tab)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar tipo de documento' : 'Nuevo tipo de documento'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => handleNombreChange(e.target.value)}
                placeholder="Ej: Cédula de ciudadanía"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="cedula_ciudadania"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Identificador único. Se genera automáticamente del nombre.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de persona *</Label>
                <Select
                  value={form.tipo_persona}
                  onValueChange={(v) => setForm({ ...form, tipo_persona: v as TipoPersonaDocumento })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambos">General (ambos)</SelectItem>
                    <SelectItem value="natural">Persona Natural</SelectItem>
                    <SelectItem value="juridica">Persona Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Categoría *</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) => setForm({ ...form, categoria: v as CategoriaDocumento })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="financiero">Financiero</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="referencia">Referencias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Extensiones permitidas</Label>
              <div className="flex flex-wrap gap-2">
                {EXTENSIONES_DISPONIBLES.map((ext) => (
                  <button
                    key={ext}
                    type="button"
                    onClick={() => toggleExtension(ext)}
                    className={`px-3 py-1 rounded-md text-xs border transition-colors ${
                      form.extensiones_permitidas.includes(ext)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    .{ext.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tamaño máximo (MB)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.tamano_maximo_mb}
                  onChange={(e) => setForm({ ...form, tamano_maximo_mb: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vigencia (días)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.dias_vigencia}
                  onChange={(e) => setForm({ ...form, dias_vigencia: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="es_obligatorio"
                  checked={form.es_obligatorio}
                  onCheckedChange={(v) => setForm({ ...form, es_obligatorio: v })}
                />
                <Label htmlFor="es_obligatorio">Obligatorio</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="activo"
                  checked={form.activo}
                  onCheckedChange={(v) => setForm({ ...form, activo: v })}
                />
                <Label htmlFor="activo">Activo</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminación */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar tipo de documento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ¿Eliminar <strong>{deleteTarget?.nombre}</strong>? Esta acción no puede deshacerse y puede afectar propuestas que lo referencian.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-1.5">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
