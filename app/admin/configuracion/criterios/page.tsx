'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { CriterioEvaluacion } from '@/lib/types/index'
import {
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  Wand2,
} from 'lucide-react'

type FormState = {
  codigo: string
  nombre: string
  descripcion: string
  peso: number
  orden: number
  activo: boolean
}

type RowStatus = Record<string, 'saving' | 'error' | 'idle'>

const INITIAL_FORM: FormState = {
  codigo: '',
  nombre: '',
  descripcion: '',
  peso: 0,
  orden: 1,
  activo: true,
}

function generarCodigo(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-_]/g, '')
    .trim()
  return normalized.replace(/[\s-]+/g, '_').slice(0, 40)
}

function ordenarCriterios(items: CriterioEvaluacion[]) {
  return [...items].sort((a, b) => a.orden - b.orden)
}

export default function CriteriosPage() {
  const { toast } = useToast()
  const [criterios, setCriterios] = useState<CriterioEvaluacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rowStatus, setRowStatus] = useState<RowStatus>({})

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [autoCodigo, setAutoCodigo] = useState(true)

  const [deleteTarget, setDeleteTarget] = useState<CriterioEvaluacion | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  const fetchCriterios = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/criterios')
      if (!res.ok) throw new Error('Error al cargar criterios')
      const data = await res.json()
      setCriterios(ordenarCriterios(data.criterios ?? []))
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

  const orderedCriterios = useMemo(() => ordenarCriterios(criterios), [criterios])
  const pesoActivos = useMemo(
    () => orderedCriterios.filter((c) => c.activo).reduce((sum, c) => sum + c.peso, 0),
    [orderedCriterios]
  )
  const pesoValido = pesoActivos === 100
  const totalCriterios = orderedCriterios.length
  const criteriosActivos = orderedCriterios.filter((c) => c.activo).length

  function openCreate() {
    setEditingId(null)
    setForm({ ...INITIAL_FORM, orden: totalCriterios + 1 })
    setFormError(null)
    setAutoCodigo(true)
    setSheetOpen(true)
  }

  function openEdit(criterio: CriterioEvaluacion) {
    setEditingId(criterio.id)
    setForm({
      codigo: criterio.codigo,
      nombre: criterio.nombre,
      descripcion: criterio.descripcion ?? '',
      peso: criterio.peso,
      orden: criterio.orden,
      activo: criterio.activo,
    })
    setFormError(null)
    setAutoCodigo(false)
    setSheetOpen(true)
  }

  function updateRowStatus(id: string, status: RowStatus[string]) {
    setRowStatus((prev) => ({ ...prev, [id]: status }))
  }

  async function updateCriterio(id: string, payload: Partial<FormState>) {
    updateRowStatus(id, 'saving')
    try {
      const res = await fetch(`/api/criterios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al actualizar')
      }
      const updated = (await res.json()) as CriterioEvaluacion
      setCriterios((prev) => prev.map((c) => (c.id === id ? updated : c)))
      updateRowStatus(id, 'idle')
      return updated
    } catch (err) {
      updateRowStatus(id, 'error')
      toast({
        title: 'No se pudo actualizar',
        description: (err as Error).message,
        variant: 'destructive',
      })
      throw err
    }
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
          descripcion: form.descripcion.trim() || null,
          peso: form.peso,
          activo: form.activo,
          orden: form.orden,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar')
      }

      const saved = (await res.json()) as CriterioEvaluacion
      setCriterios((prev) => {
        const next = editingId
          ? prev.map((c) => (c.id === saved.id ? saved : c))
          : [...prev, saved]
        return ordenarCriterios(next)
      })

      toast({
        title: editingId ? 'Criterio actualizado' : 'Criterio creado',
        description: saved.nombre,
      })

      setSheetOpen(false)
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/criterios/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al eliminar')
      }
      setCriterios((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast({
        title: 'Criterio eliminado',
        description: deleteTarget.nombre,
      })
      setDeleteTarget(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggleActivo(criterio: CriterioEvaluacion) {
    try {
      const updated = await updateCriterio(criterio.id, { activo: !criterio.activo })
      toast({
        title: updated.activo ? 'Criterio activado' : 'Criterio desactivado',
        description: updated.nombre,
      })
    } catch (err) {
      setError('Error al cambiar estado')
    }
  }

  async function handlePesoBlur(criterio: CriterioEvaluacion, value: number) {
    if (value === criterio.peso) return
    if (value < 0 || value > 100 || Number.isNaN(value)) {
      toast({
        title: 'Peso invalido',
        description: 'El peso debe estar entre 0 y 100.',
        variant: 'destructive',
      })
      return
    }
    await updateCriterio(criterio.id, { peso: value })
  }

  async function handleDragReorder(fromId: string, toId: string) {
    if (fromId === toId) return
    const current = ordenarCriterios(criterios)
    const fromIndex = current.findIndex((c) => c.id === fromId)
    const toIndex = current.findIndex((c) => c.id === toId)
    if (fromIndex === -1 || toIndex === -1) return

    const next = [...current]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)

    const withOrder = next.map((item, idx) => ({ ...item, orden: idx + 1 }))
    setCriterios(withOrder)
    setReordering(true)

    try {
      const updates = withOrder.filter((item, idx) => item.orden !== current[idx]?.orden)
      if (updates.length === 0) {
        return
      }
      await Promise.all(
        updates.map(async (item) => {
          const res = await fetch(`/api/criterios/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orden: item.orden }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error ?? 'Error al actualizar orden')
          }
        })
      )
      toast({
        title: 'Orden actualizado',
        description: 'Los criterios se han reordenado correctamente.',
      })
    } catch (err) {
      toast({
        title: 'Error al reordenar',
        description: (err as Error).message,
        variant: 'destructive',
      })
      setCriterios(current)
    } finally {
      setReordering(false)
      setDragId(null)
      setDragOverId(null)
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
          <p className="text-sm text-muted-foreground">Matriz de evaluacion</p>
          <h1 className="text-2xl font-semibold tracking-tight">Criterios de Evaluacion</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCriterios} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo criterio
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribucion de pesos</CardTitle>
            <CardDescription>
              El peso total de los criterios activos debe sumar 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <Progress value={pesoActivos} className="flex-1" />
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  pesoValido ? 'text-green-600' : 'text-amber-600'
                )}
              >
                {pesoActivos}%
              </span>
            </div>
            {!pesoValido && (
              <p className="text-xs text-amber-600">
                El peso total debe ser exactamente 100%. Actualmente: {pesoActivos}%.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen rapido</CardTitle>
            <CardDescription>Estado general de la matriz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Criterios</p>
                <p className="text-2xl font-semibold">{totalCriterios}</p>
              </div>
              <Badge variant="secondary">{criteriosActivos} activos</Badge>
            </div>
            <div className="rounded-md border border-border/60 p-3 text-sm">
              <p className="text-muted-foreground">Estado de cumplimiento</p>
              <div className="mt-2 flex items-center gap-2">
                {pesoValido ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Pesos balanceados</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>Requiere ajustes</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Criterios configurados</CardTitle>
            <CardDescription>
              Arrastra para reordenar y ajusta pesos con edicion rapida.
            </CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            {reordering ? 'Reordenando...' : 'Drag & drop activo'}
          </div>
        </CardHeader>
        <CardContent>
          {orderedCriterios.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay criterios configurados. Agrega el primero.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-3 pr-4 w-10">Orden</th>
                    <th className="py-3 pr-4">Nombre</th>
                    <th className="py-3 pr-4">Codigo</th>
                    <th className="py-3 pr-4 w-64">Peso</th>
                    <th className="py-3 pr-4 w-32">Estado</th>
                    <th className="py-3 pr-4 w-28 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedCriterios.map((criterio) => (
                    <tr
                      key={criterio.id}
                      draggable={!reordering}
                      onDragStart={(event) => {
                        if (reordering) return
                        setDragId(criterio.id)
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', criterio.id)
                      }}
                      onDragOver={(event) => {
                        event.preventDefault()
                        if (dragOverId !== criterio.id) {
                          setDragOverId(criterio.id)
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        const fromId = event.dataTransfer.getData('text/plain')
                        handleDragReorder(fromId, criterio.id)
                      }}
                      onDragEnd={() => {
                        setDragId(null)
                        setDragOverId(null)
                      }}
                      className={cn(
                        'border-t border-border/60 transition-colors',
                        !criterio.activo && 'opacity-60',
                        dragOverId === criterio.id && 'bg-muted/40',
                        dragId === criterio.id && 'bg-muted/20'
                      )}
                    >
                      <td className="py-4 pr-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                          <span>{criterio.orden}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {criterio.nombre}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {criterio.descripcion || 'Sin descripcion'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {criterio.codigo}
                        </code>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Progress value={criterio.peso} className="h-2" />
                          </div>
                          <div className="w-16">
                            <Input
                              key={`peso-${criterio.id}-${criterio.peso}`}
                              type="number"
                              min={0}
                              max={100}
                              className="h-8 text-sm"
                              defaultValue={criterio.peso}
                              onBlur={(event) =>
                                handlePesoBlur(criterio, Number(event.currentTarget.value))
                              }
                              disabled={rowStatus[criterio.id] === 'saving'}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={criterio.activo}
                            onCheckedChange={() => handleToggleActivo(criterio)}
                          />
                          <Badge variant={criterio.activo ? 'default' : 'secondary'}>
                            {criterio.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(criterio)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(criterio)}
                          >
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Editar criterio' : 'Nuevo criterio'}</SheetTitle>
            <SheetDescription>
              Configura el peso y el orden de aparicion para la matriz de evaluacion.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(event) => {
                    const value = event.target.value
                    setForm((prev) => ({
                      ...prev,
                      nombre: value,
                      codigo: autoCodigo ? generarCodigo(value) : prev.codigo,
                    }))
                  }}
                  placeholder="Experiencia en Propiedad Horizontal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo">Codigo *</Label>
                <div className="flex gap-2">
                  <Input
                    id="codigo"
                    value={form.codigo}
                    onChange={(event) => {
                      setAutoCodigo(false)
                      setForm((prev) => ({ ...prev, codigo: event.target.value }))
                    }}
                    placeholder="exp_ph"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAutoCodigo(true)
                      setForm((prev) => ({ ...prev, codigo: generarCodigo(prev.nombre) }))
                    }}
                    className="gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Textarea
                id="descripcion"
                value={form.descripcion}
                onChange={(event) => setForm({ ...form, descripcion: event.target.value })}
                placeholder="Detalle del criterio..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="peso">Peso (%) *</Label>
                <Input
                  id="peso"
                  type="number"
                  min={0}
                  max={100}
                  value={form.peso}
                  onChange={(event) =>
                    setForm({ ...form, peso: Number(event.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  type="number"
                  min={1}
                  value={form.orden}
                  onChange={(event) =>
                    setForm({ ...form, orden: Number(event.target.value) || 1 })
                  }
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

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Guardar cambios' : 'Crear criterio'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar criterio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Las evaluaciones existentes que usan este criterio
              podrian verse afectadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
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
