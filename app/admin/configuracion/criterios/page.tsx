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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Loader2, Pencil, Trash2, Plus, AlertCircle, GripVertical } from 'lucide-react'
import type { CriterioEvaluacion } from '@/lib/types/index'

type FormState = Partial<CriterioEvaluacion> & {
  codigo: string
  nombre: string
  peso: number
}

const INITIAL_FORM: FormState = {
  codigo: '',
  nombre: '',
  descripcion: '',
  peso: 0,
  activo: true,
  orden: 0,
}

export default function CriteriosPage() {
  const [criterios, setCriterios] = useState<CriterioEvaluacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCriterios = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/criterios')
      if (!res.ok) throw new Error('Error al cargar criterios')
      const data = await res.json()
      setCriterios(data.criterios ?? [])
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar los criterios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCriterios()
  }, [fetchCriterios])

  function openCreate() {
    setEditingId(null)
    setForm({ ...INITIAL_FORM, orden: criterios.length + 1 })
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(c: CriterioEvaluacion) {
    setEditingId(c.id)
    setForm({
      codigo: c.codigo,
      nombre: c.nombre,
      descripcion: c.descripcion ?? '',
      peso: c.peso,
      activo: c.activo,
      orden: c.orden,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.codigo.trim()) {
      setFormError('El código es requerido')
      return
    }
    if (!form.nombre.trim()) {
      setFormError('El nombre es requerido')
      return
    }
    if (form.peso < 0 || form.peso > 100) {
      setFormError('El peso debe estar entre 0 y 100')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      const url = editingId ? `/api/criterios/${editingId}` : '/api/criterios'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: form.codigo.trim(),
          nombre: form.nombre.trim(),
          descripcion: form.descripcion?.trim() || null,
          peso: form.peso,
          activo: form.activo,
          orden: form.orden,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar')
      }

      setDialogOpen(false)
      fetchCriterios()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/criterios/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al eliminar')
      }
      setDeleteId(null)
      fetchCriterios()
    } catch (err) {
      console.error(err)
      setError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  async function toggleActivo(c: CriterioEvaluacion) {
    try {
      const res = await fetch(`/api/criterios/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !c.activo }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      fetchCriterios()
    } catch (err) {
      console.error(err)
      setError('Error al cambiar estado')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const pesoActivos = criterios.filter((c) => c.activo).reduce((sum, c) => sum + c.peso, 0)
  const pesoValido = pesoActivos === 100

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Matriz de evaluación</p>
        <h1 className="text-2xl font-semibold tracking-tight">Criterios de Evaluación</h1>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Distribución de pesos</CardTitle>
          <CardDescription>
            El peso total de los criterios activos debe sumar 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <Progress value={pesoActivos} className="flex-1" />
            <span className={`text-sm font-semibold tabular-nums ${pesoValido ? 'text-green-600' : 'text-amber-600'}`}>
              {pesoActivos}%
            </span>
          </div>
          {!pesoValido && (
            <p className="text-xs text-amber-600">
              ⚠️ El peso total debe ser exactamente 100%. Actualmente: {pesoActivos}%
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Criterios configurados</CardTitle>
            <CardDescription>
              Define los criterios y sus pesos para la matriz de evaluación.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar criterio
          </Button>
        </CardHeader>
        <CardContent>
          {criterios.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay criterios configurados. Agrega el primero.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-[300px]">Descripción</TableHead>
                  <TableHead className="w-20 text-center">Peso</TableHead>
                  <TableHead className="w-20 text-center">Estado</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criterios.map((c) => (
                  <TableRow key={c.id} className={!c.activo ? 'opacity-50' : ''}>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        {c.orden}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {c.codigo}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {c.descripcion || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.activo ? 'default' : 'secondary'}>
                        {c.peso}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={c.activo}
                        onCheckedChange={() => toggleActivo(c)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar criterio' : 'Nuevo criterio'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="expPH"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peso">Peso (%) *</Label>
                <Input
                  id="peso"
                  type="number"
                  min={0}
                  max={100}
                  value={form.peso}
                  onChange={(e) => setForm({ ...form, peso: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Experiencia en Propiedad Horizontal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={form.descripcion ?? ''}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Detalle del criterio..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  type="number"
                  min={1}
                  value={form.orden}
                  onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="activo"
                  checked={form.activo}
                  onCheckedChange={(checked) => setForm({ ...form, activo: checked })}
                />
                <Label htmlFor="activo">Activo</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Guardar cambios' : 'Crear criterio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar criterio?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer. Las evaluaciones existentes que usan este criterio podrían verse afectadas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}