'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import type { AplicaAItemChecklist, CriticidadItem, ValidacionLegalItemConfig } from '@/lib/types/index'

const LABEL_CRITICIDAD: Record<CriticidadItem, string> = {
  critico: 'Crítico',
  importante: 'Importante',
  condicionante: 'Pre-firma',
  informativo: 'Informativo',
}

const LABEL_APLICA_A: Record<AplicaAItemChecklist, string> = {
  ambos: 'Ambos',
  juridica: 'Persona Jurídica',
  natural: 'Persona Natural',
}

type FormState = {
  codigo: string
  seccion: string
  nombre: string
  categoria: CriticidadItem
  descripcion: string
  aplica_a: AplicaAItemChecklist
  activo: boolean
  obligatorio: boolean
  orden: number
}

const INITIAL_FORM: FormState = {
  codigo: '',
  seccion: 'Antecedentes',
  nombre: '',
  categoria: 'critico',
  descripcion: '',
  aplica_a: 'ambos',
  activo: true,
  obligatorio: true,
  orden: 1,
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 50)
}

export default function ValidacionLegalItemsPage() {
  const [items, setItems] = useState<ValidacionLegalItemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ValidacionLegalItemConfig | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ValidacionLegalItemConfig | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/validacion-legal-items')
      if (!res.ok) throw new Error('Error al cargar ítems')
      const data: ValidacionLegalItemConfig[] = await res.json()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los ítems')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const total = items.length
  const activos = items.filter((i) => i.activo).length
  const obligatorios = items.filter((i) => i.obligatorio).length

  const secciones = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.seccion))).sort()
  }, [items])

  function openCreate() {
    setEditing(null)
    setForm({ ...INITIAL_FORM, orden: total + 1 })
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(item: ValidacionLegalItemConfig) {
    setEditing(item)
    setForm({
      codigo: item.codigo,
      seccion: item.seccion,
      nombre: item.nombre,
      categoria: item.categoria,
      descripcion: item.descripcion,
      aplica_a: item.aplica_a,
      activo: item.activo,
      obligatorio: item.obligatorio,
      orden: item.orden,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  async function saveItem() {
    if (!form.nombre.trim() || !form.codigo.trim() || !form.seccion.trim() || !form.descripcion.trim()) {
      setFormError('Completa nombre, código, sección y descripción')
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      const url = editing ? `/api/validacion-legal-items/${editing.id}` : '/api/validacion-legal-items'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al guardar')
      }
      setDialogOpen(false)
      await loadItems()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleItem(item: ValidacionLegalItemConfig, field: 'activo' | 'obligatorio') {
    try {
      const res = await fetch(`/api/validacion-legal-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !item[field] }),
      })
      if (!res.ok) throw new Error('Error')
      await loadItems()
    } catch {
      setError(`No se pudo cambiar ${field}`)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/validacion-legal-items/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setDeleteTarget(null)
      await loadItems()
    } catch {
      setError('No se pudo eliminar el ítem')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Checklist legal configurable</p>
          <h1 className="text-2xl font-semibold tracking-tight">Ítems de validación legal</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadItems} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo ítem
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Obligatorios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{obligatorios}</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de ítems</CardTitle>
          <CardDescription>
            Se usarán para renderizar el checklist en validación legal. Puedes activar/desactivar y marcar obligatorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {secciones.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {secciones.map((seccion) => (
                <Badge key={seccion} variant="secondary">
                  {seccion}
                </Badge>
              ))}
            </div>
          )}
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay ítems configurados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-3 pr-4">Sección</th>
                    <th className="py-3 pr-4">Nombre</th>
                    <th className="py-3 pr-4">Categoría</th>
                    <th className="py-3 pr-4">Aplica a</th>
                    <th className="py-3 pr-4">Orden</th>
                    <th className="py-3 pr-4">Activo</th>
                    <th className="py-3 pr-4">Obligatorio</th>
                    <th className="py-3 pr-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-border/60">
                      <td className="py-4 pr-4 text-sm">{item.seccion}</td>
                      <td className="py-4 pr-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{item.nombre}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.descripcion}</p>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant="outline">{LABEL_CRITICIDAD[item.categoria]}</Badge>
                      </td>
                      <td className="py-4 pr-4 text-sm">{LABEL_APLICA_A[item.aplica_a]}</td>
                      <td className="py-4 pr-4 text-sm">{item.orden}</td>
                      <td className="py-4 pr-4">
                        <Switch checked={item.activo} onCheckedChange={() => toggleItem(item, 'activo')} />
                      </td>
                      <td className="py-4 pr-4">
                        <Switch checked={item.obligatorio} onCheckedChange={() => toggleItem(item, 'obligatorio')} />
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar ítem' : 'Nuevo ítem'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seccion">Sección *</Label>
                <Input
                  id="seccion"
                  value={form.seccion}
                  onChange={(e) => setForm((prev) => ({ ...prev, seccion: e.target.value }))}
                  placeholder="Antecedentes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orden">Orden *</Label>
                <Input
                  id="orden"
                  type="number"
                  value={form.orden}
                  onChange={(e) => setForm((prev) => ({ ...prev, orden: Number(e.target.value || 1) }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => {
                    const value = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      nombre: value,
                      codigo: editing ? prev.codigo : slugify(value),
                    }))
                  }}
                  placeholder="Procuraduría"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={form.codigo}
                  onChange={(e) => setForm((prev) => ({ ...prev, codigo: slugify(e.target.value) }))}
                  placeholder="procuraduria"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, categoria: value as CriticidadItem }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critico">Crítico</SelectItem>
                    <SelectItem value="importante">Importante</SelectItem>
                    <SelectItem value="condicionante">Pre-firma</SelectItem>
                    <SelectItem value="informativo">Informativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aplica a</Label>
                <Select
                  value={form.aplica_a}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, aplica_a: value as AplicaAItemChecklist }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambos">Ambos</SelectItem>
                    <SelectItem value="juridica">Persona Jurídica</SelectItem>
                    <SelectItem value="natural">Persona Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.activo}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, activo: checked }))}
                />
                Activo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.obligatorio}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, obligatorio: checked }))}
                />
                Obligatorio
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveItem} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ítem</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el ítem del catálogo de validación legal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

