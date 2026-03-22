'use client'

import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  Copy, 
  Key, 
  CheckCircle2 
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { Consejero } from '@/lib/types'

export default function ConsejerosPage() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)
  const [consejeros, setConsejeros] = useState<Consejero[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [conjuntoId, setConjuntoId] = useState<string>('')
  const [selectedConsejero, setSelectedConsejero] = useState<Consejero | null>(null)
  const [newCode, setNewCode] = useState<string>('')
  const [formData, setFormData] = useState({
    nombre_completo: '',
    cargo: 'vocal' as const,
    torre: '',
    apartamento: '',
    email: '',
    telefono: '',
  })
  const [editFormData, setEditFormData] = useState({
    id: '',
    nombre_completo: '',
    cargo: 'vocal' as const,
    torre: '',
    apartamento: '',
    email: '',
    telefono: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      // Obtener conjunto
      const conjuntoRes = await fetch('/api/conjuntos')
      if (!conjuntoRes.ok) throw new Error('Error al obtener conjunto')
      const conjunto = await conjuntoRes.json()
      setConjuntoId(conjunto.id)

      // Obtener consejeros
      const consejerosRes = await fetch(`/api/consejeros?conjunto_id=${conjunto.id}`)
      if (!consejerosRes.ok) throw new Error('Error al obtener consejeros')
      const data = await consejerosRes.json()
      setConsejeros(data)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los consejeros',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/consejeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear consejero')
      }

      toast({
        title: 'Consejero creado',
        description: 'El consejero ha sido agregado exitosamente',
      })

      // Refresh list
      await fetchData()
      
      // Reset form and close dialog
      setFormData({
        nombre_completo: '',
        cargo: 'vocal',
        torre: '',
        apartamento: '',
        email: '',
        telefono: '',
      })
      setOpen(false)
    } catch (error) {
      console.error('Error creating consejero:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear consejero',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(consejero: Consejero) {
    setSelectedConsejero(consejero)
    setEditFormData({
      id: consejero.id,
      nombre_completo: consejero.nombre_completo,
      cargo: consejero.cargo,
      torre: consejero.torre || '',
      apartamento: consejero.apartamento,
      email: consejero.email || '',
      telefono: consejero.telefono || '',
    })
    setEditOpen(true)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/consejeros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar consejero')
      }

      toast({
        title: 'Consejero actualizado',
        description: 'Los cambios han sido guardados exitosamente',
      })

      await fetchData()
      setEditOpen(false)
    } catch (error) {
      console.error('Error updating consejero:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al actualizar consejero',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteClick(consejero: Consejero) {
    setSelectedConsejero(consejero)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!selectedConsejero) return
    setSaving(true)

    try {
      const response = await fetch(`/api/consejeros?id=${selectedConsejero.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar consejero')
      }

      toast({
        title: 'Consejero desactivado',
        description: 'El consejero ha sido desactivado exitosamente',
      })

      await fetchData()
      setDeleteOpen(false)
      setSelectedConsejero(null)
    } catch (error) {
      console.error('Error deleting consejero:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al eliminar consejero',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerarCodigo(consejero: Consejero) {
    setSaving(true)

    try {
      const response = await fetch('/api/consejeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerar_codigo',
          consejero_id: consejero.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al regenerar código')
      }

      const result = await response.json()
      setNewCode(result.codigo)
      setCodeDialogOpen(true)

      await fetchData()
    } catch (error) {
      console.error('Error regenerando código:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al regenerar código',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copiado',
      description: 'Código copiado al portapapeles',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Equipo de consejo</p>
          <h1 className="text-2xl font-semibold tracking-tight">Consejeros</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Agregar consejero</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Nuevo consejero</DialogTitle>
                <DialogDescription>Registra un nuevo miembro del consejo de administración.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre_completo">Nombre completo *</Label>
                  <Input
                    id="nombre_completo"
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo *</Label>
                    <Select value={formData.cargo} onValueChange={(value: any) => setFormData({ ...formData, cargo: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presidente">Presidente</SelectItem>
                        <SelectItem value="vicepresidente">Vicepresidente</SelectItem>
                        <SelectItem value="secretario">Secretario</SelectItem>
                        <SelectItem value="vocal">Vocal</SelectItem>
                        <SelectItem value="fiscal">Fiscal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apartamento">Apartamento *</Label>
                    <Input
                      id="apartamento"
                      value={formData.apartamento}
                      onChange={(e) => setFormData({ ...formData, apartamento: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="torre">Torre</Label>
                    <Input
                      id="torre"
                      value={formData.torre}
                      onChange={(e) => setFormData({ ...formData, torre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de consejeros</CardTitle>
          <CardDescription>Miembros del consejo de administración con sus estados de participación.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando consejeros...
            </div>
          ) : consejeros.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay consejeros registrados. Agrega el primer miembro del consejo.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Código de acceso</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consejeros.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre_completo}</TableCell>
                    <TableCell className="capitalize">{c.cargo}</TableCell>
                    <TableCell>
                      {c.torre ? `Torre ${c.torre} - ` : ''}Apto {c.apartamento}
                    </TableCell>
                    <TableCell>
                      {c.codigo_acceso ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {c.codigo_acceso}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(c.codigo_acceso!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerarCodigo(c)}
                          disabled={saving}
                        >
                          <Key className="h-3 w-3 mr-1" />
                          Generar código
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.email || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.activo ? 'secondary' : 'outline'}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(c)}>
                            <Pencil className="h-3 w-3 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {c.codigo_acceso && (
                            <DropdownMenuItem onClick={() => handleRegenerarCodigo(c)}>
                              <RefreshCw className="h-3 w-3 mr-2" />
                              Regenerar código
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(c)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Desactivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar consejero */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Editar consejero</DialogTitle>
              <DialogDescription>Actualiza la información del miembro del consejo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_nombre_completo">Nombre completo *</Label>
                <Input
                  id="edit_nombre_completo"
                  value={editFormData.nombre_completo}
                  onChange={(e) => setEditFormData({ ...editFormData, nombre_completo: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit_cargo">Cargo *</Label>
                  <Select 
                    value={editFormData.cargo} 
                    onValueChange={(value: any) => setEditFormData({ ...editFormData, cargo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presidente">Presidente</SelectItem>
                      <SelectItem value="vicepresidente">Vicepresidente</SelectItem>
                      <SelectItem value="secretario">Secretario</SelectItem>
                      <SelectItem value="vocal">Vocal</SelectItem>
                      <SelectItem value="fiscal">Fiscal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_apartamento">Apartamento *</Label>
                  <Input
                    id="edit_apartamento"
                    value={editFormData.apartamento}
                    onChange={(e) => setEditFormData({ ...editFormData, apartamento: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit_torre">Torre</Label>
                  <Input
                    id="edit_torre"
                    value={editFormData.torre}
                    onChange={(e) => setEditFormData({ ...editFormData, torre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_email">Correo</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_telefono">Teléfono</Label>
                <Input
                  id="edit_telefono"
                  value={editFormData.telefono}
                  onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Actualizar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desea desactivar este consejero?</AlertDialogTitle>
            <AlertDialogDescription>
              El consejero <strong>{selectedConsejero?.nombre_completo}</strong> será desactivado y no podrá acceder al sistema.
              Esta acción no elimina el historial asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {saving ? 'Desactivando...' : 'Desactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para mostrar nuevo código */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Código regenerado exitosamente
            </DialogTitle>
            <DialogDescription>
              Comparte este código con el consejero para que pueda acceder al sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <code className="text-2xl font-mono font-bold flex-1 text-center">
              {newCode}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(newCode)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setCodeDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
