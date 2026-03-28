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
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Pencil, Trash2, Users, Mail, Calendar, Shield } from 'lucide-react'
import type { UsuarioConConjunto, RolUsuario } from '@/lib/types/index'

const LABEL_ROL: Record<RolUsuario, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  evaluador: 'Evaluador',
  consejero: 'Consejero',
}

const ROLES_DISPONIBLES: RolUsuario[] = ['admin', 'evaluador', 'consejero']

interface UsuariosClientProps {
  initialUsuarios: UsuarioConConjunto[]
}

export function UsuariosClient({ initialUsuarios }: UsuariosClientProps) {
  const [usuarios, setUsuarios] = useState(initialUsuarios)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<UsuarioConConjunto | null>(null)
  const [deletingUsuario, setDeletingUsuario] = useState<UsuarioConConjunto | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    nombre: '',
    rol: 'admin' as RolUsuario,
    activo: true,
  })

  const openEditDialog = (usuario: UsuarioConConjunto) => {
    setEditingUsuario(usuario)
    setFormData({
      nombre: usuario.nombre ?? '',
      rol: usuario.rol,
      activo: usuario.activo,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (usuario: UsuarioConConjunto) => {
    setDeletingUsuario(usuario)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUsuario) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/usuarios/${editingUsuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar usuario')
      }

      // Recargar lista
      const usuariosResponse = await fetch('/api/usuarios')
      const updatedUsuarios = await usuariosResponse.json()
      setUsuarios(updatedUsuarios)

      toast.success('Usuario actualizado correctamente')
      setIsEditDialogOpen(false)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingUsuario) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/usuarios/${deletingUsuario.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar usuario')
      }

      setUsuarios((prev) => prev.filter((u) => u.id !== deletingUsuario.id))
      toast.success('Usuario eliminado correctamente')
      setIsDeleteDialogOpen(false)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Configuración</p>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios del sistema</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios registrados</CardTitle>
          <CardDescription>
            Administra los usuarios que tienen acceso al sistema. Los usuarios se crean
            automáticamente al registrarse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No hay usuarios registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Conjunto</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{usuario.nombre || '(Sin nombre)'}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {usuario.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={usuario.rol === 'superadmin' ? 'default' : 'secondary'}
                        className="flex items-center gap-1 w-fit"
                      >
                        <Shield className="h-3 w-3" />
                        {LABEL_ROL[usuario.rol]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.conjunto?.nombre ?? (
                        <span className="text-muted-foreground text-sm">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(usuario.ultimo_acceso)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.activo ? 'secondary' : 'outline'}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.rol !== 'superadmin' && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(usuario)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(usuario)}
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

      {/* Dialog editar usuario */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario {editingUsuario?.email}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <Select
                  value={formData.rol}
                  onValueChange={(value: RolUsuario) =>
                    setFormData((prev) => ({ ...prev, rol: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES_DISPONIBLES.map((rol) => (
                      <SelectItem key={rol} value={rol}>
                        {LABEL_ROL[rol]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="activo">Estado activo</Label>
                  <p className="text-xs text-muted-foreground">
                    Los usuarios inactivos no pueden acceder al sistema
                  </p>
                </div>
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, activo: checked }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el usuario{' '}
              <strong>{deletingUsuario?.email}</strong>? Esta acción no se puede deshacer.
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
