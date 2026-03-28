'use client'

import { useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Lock, ShieldCheck } from 'lucide-react'
import type { RolConPermisos, Permiso } from '@/lib/types/index'

const LABEL_CATEGORIA: Record<string, string> = {
  procesos: 'Procesos',
  consejeros: 'Consejeros',
  documentos: 'Documentos',
  evaluacion: 'Evaluación',
  votacion: 'Votación',
  reportes: 'Reportes',
  finanzas: 'Finanzas',
  auditoria: 'Auditoría',
  configuracion: 'Configuración',
  general: 'General',
}

interface RolesClientProps {
  initialRoles: RolConPermisos[]
  permisos: Permiso[]
}

export function RolesClient({ initialRoles, permisos }: RolesClientProps) {
  const [roles, setRoles] = useState(initialRoles)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingRol, setEditingRol] = useState<RolConPermisos | null>(null)
  const [deletingRol, setDeletingRol] = useState<RolConPermisos | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    permisos_ids: [] as string[],
  })

  const permisosAgrupados = permisos.reduce(
    (acc, p) => {
      if (!acc[p.categoria]) acc[p.categoria] = []
      acc[p.categoria].push(p)
      return acc
    },
    {} as Record<string, Permiso[]>
  )

  const openCreateDialog = () => {
    setEditingRol(null)
    setFormData({ nombre: '', descripcion: '', permisos_ids: [] })
    setIsDialogOpen(true)
  }

  const openEditDialog = (rol: RolConPermisos) => {
    setEditingRol(rol)
    setFormData({
      nombre: rol.nombre,
      descripcion: rol.descripcion ?? '',
      permisos_ids: rol.permisos.map((p) => p.id),
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (rol: RolConPermisos) => {
    setDeletingRol(rol)
    setIsDeleteDialogOpen(true)
  }

  const togglePermiso = (permisoId: string) => {
    setFormData((prev) => ({
      ...prev,
      permisos_ids: prev.permisos_ids.includes(permisoId)
        ? prev.permisos_ids.filter((id) => id !== permisoId)
        : [...prev.permisos_ids, permisoId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) {
      toast.error('El nombre del rol es requerido')
      return
    }

    setIsSubmitting(true)

    try {
      const url = editingRol ? `/api/roles/${editingRol.id}` : '/api/roles'
      const method = editingRol ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar rol')
      }

      const savedRol = await response.json()

      if (editingRol) {
        setRoles((prev) =>
          prev.map((r) => (r.id === editingRol.id ? savedRol : r))
        )
        toast.success('Rol actualizado correctamente')
      } else {
        const rolesResponse = await fetch('/api/roles')
        const updatedRoles = await rolesResponse.json()
        setRoles(updatedRoles)
        toast.success('Rol creado correctamente')
      }

      setIsDialogOpen(false)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingRol) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/roles/${deletingRol.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar rol')
      }

      setRoles((prev) => prev.filter((r) => r.id !== deletingRol.id))
      toast.success('Rol eliminado correctamente')
      setIsDeleteDialogOpen(false)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Permisos</p>
          <h1 className="text-2xl font-semibold tracking-tight">Roles y accesos</h1>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo rol
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles configurados</CardTitle>
          <CardDescription>
            Gestiona los roles y permisos del sistema. Los roles de sistema no pueden ser
            modificados ni eliminados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No hay roles configurados</p>
              <Button className="mt-4" variant="outline" onClick={openCreateDialog}>
                Crear primer rol
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rol</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((rol) => (
                  <TableRow key={rol.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rol.nombre}</span>
                        {rol.es_sistema && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      {rol.descripcion && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rol.descripcion}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {rol.permisos.slice(0, 5).map((permiso) => (
                          <Badge key={permiso.id} variant="outline" className="text-xs">
                            {permiso.nombre}
                          </Badge>
                        ))}
                        {rol.permisos.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{rol.permisos.length - 5} más
                          </Badge>
                        )}
                        {rol.permisos.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            Sin permisos asignados
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rol.activo ? 'secondary' : 'outline'}>
                        {rol.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!rol.es_sistema && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(rol)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(rol)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog crear/editar rol */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRol ? 'Editar rol' : 'Nuevo rol'}</DialogTitle>
            <DialogDescription>
              {editingRol
                ? 'Modifica los datos y permisos del rol.'
                : 'Crea un nuevo rol con los permisos que necesites.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del rol *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  placeholder="Ej: Supervisor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                  placeholder="Describe las responsabilidades de este rol..."
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Permisos</Label>
              <div className="space-y-4 border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                {Object.entries(permisosAgrupados).map(([categoria, permisosList]) => (
                  <div key={categoria} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {LABEL_CATEGORIA[categoria] ?? categoria}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {permisosList.map((permiso) => (
                        <label
                          key={permiso.id}
                          className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={formData.permisos_ids.includes(permiso.id)}
                            onCheckedChange={() => togglePermiso(permiso.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm">{permiso.nombre}</span>
                            {permiso.descripcion && (
                              <p className="text-xs text-muted-foreground truncate">
                                {permiso.descripcion}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.permisos_ids.length} permiso(s) seleccionado(s)
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                {editingRol ? 'Guardar cambios' : 'Crear rol'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar rol</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el rol &quot;{deletingRol?.nombre}&quot;?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
