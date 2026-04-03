'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { Plus, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'

import { ContratosTable } from '@/components/admin/contratos/contratos-table'
import { ContratoFormDialog } from '@/components/admin/contratos/contrato-form-dialog'
import { ContratosStatsCards } from '@/components/admin/contratos/contratos-stats'
import type { ContratoConEstado } from '@/lib/types/index'

// ─────────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// ─────────────────────────────────────────────────────────────────────

export default function ContratosPage() {
  const { toast } = useToast()

  // Estado de contratos
  const { data: contratosData, error, isLoading } = useSWR<{
    contratos: ContratoConEstado[]
    stats: { total: number; vigentes: number; proximos_a_vencer: number; vencidos: number }
  }>('/api/contratos', fetcher)

  // Estado del formulario
  const [formOpen, setFormOpen] = useState(false)
  const [editingContrato, setEditingContrato] = useState<ContratoConEstado | null>(null)

  // Estado de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingContrato, setDeletingContrato] = useState<ContratoConEstado | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const contratos = contratosData?.contratos || []
  const stats = contratosData?.stats || { total: 0, vigentes: 0, proximos_a_vencer: 0, vencidos: 0 }

  // ─────────────────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingContrato(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (contrato: ContratoConEstado) => {
    setEditingContrato(contrato)
    setFormOpen(true)
  }

  const handleOpenDelete = (contrato: ContratoConEstado) => {
    setDeletingContrato(contrato)
    setDeleteDialogOpen(true)
  }

  const handleViewFile = async (contrato: ContratoConEstado) => {
    if (!contrato.archivo_principal_pathname) return

    try {
      const url = `/api/contratos/file?pathname=${encodeURIComponent(contrato.archivo_principal_pathname)}`
      window.open(url, '_blank')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo abrir el documento',
        variant: 'destructive',
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────

  const handleSubmit = async (formData: FormData) => {
    const isEditing = formData.has('id')
    const method = isEditing ? 'PUT' : 'POST'

    const response = await fetch('/api/contratos', {
      method,
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Error al guardar contrato')
    }

    toast({
      title: isEditing ? 'Contrato actualizado' : 'Contrato creado',
      description: isEditing
        ? 'Los cambios se guardaron correctamente'
        : 'El contrato se registro correctamente',
    })

    mutate('/api/contratos')
  }

  const handleDelete = async () => {
    if (!deletingContrato) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/contratos?id=${deletingContrato.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast({
        title: 'Contrato eliminado',
        description: 'El contrato se elimino correctamente',
      })

      mutate('/api/contratos')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el contrato',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setDeletingContrato(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Acuerdos vigentes</p>
            <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-destructive mb-4">Error al cargar los contratos</p>
              <Button variant="outline" onClick={() => mutate('/api/contratos')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Acuerdos vigentes</p>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo contrato
        </Button>
      </div>

      {/* Stats */}
      <ContratosStatsCards stats={stats} />

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de contratos</CardTitle>
          <CardDescription>
            Gestiona los contratos del conjunto con alertas de vencimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ContratosTable
              contratos={contratos}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              onViewFile={handleViewFile}
              isDeleting={isDeleting}
            />
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ContratoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contrato={editingContrato}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Esta seguro que desea eliminar el contrato{' '}
              <strong>{deletingContrato?.nombre}</strong>? Esta accion no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
