'use client'

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  FileUp,
  Loader2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { Contrato, ContratoConEstado } from '@/lib/types/index'

// ─────────────────────────────────────────────────────────────────────

interface ContratoFormData {
  nombre: string
  responsable: string
  descripcion: string
  fecha_inicio: Date | undefined
  fecha_fin: Date | undefined
  dias_preaviso: number
  valor: string
  moneda: string
  observaciones: string
  archivo: File | null
}

const initialFormData: ContratoFormData = {
  nombre: '',
  responsable: '',
  descripcion: '',
  fecha_inicio: undefined,
  fecha_fin: undefined,
  dias_preaviso: 30,
  valor: '',
  moneda: 'COP',
  observaciones: '',
  archivo: null,
}

// ─────────────────────────────────────────────────────────────────────

interface ContratoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contrato?: ContratoConEstado | null
  onSubmit: (data: FormData) => Promise<void>
}

export function ContratoFormDialog({
  open,
  onOpenChange,
  contrato,
  onSubmit,
}: ContratoFormDialogProps) {
  const { toast } = useToast()
  const isEditing = !!contrato

  const [formData, setFormData] = useState<ContratoFormData>(initialFormData)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (contrato) {
      setFormData({
        nombre: contrato.nombre,
        responsable: contrato.responsable || '',
        descripcion: contrato.descripcion || '',
        fecha_inicio: contrato.fecha_inicio ? new Date(contrato.fecha_inicio) : undefined,
        fecha_fin: contrato.fecha_fin ? new Date(contrato.fecha_fin) : undefined,
        dias_preaviso: contrato.dias_preaviso,
        valor: contrato.valor ? String(contrato.valor) : '',
        moneda: contrato.moneda || 'COP',
        observaciones: contrato.observaciones || '',
        archivo: null,
      })
    } else {
      setFormData(initialFormData)
    }
  }, [open, contrato])
  const [dragActive, setDragActive] = useState(false)

  const handleChange = (
    field: keyof ContratoFormData,
    value: string | number | Date | undefined | File | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        handleChange('archivo', file)
      } else {
        toast({
          title: 'Formato no valido',
          description: 'Solo se aceptan archivos PDF',
          variant: 'destructive',
        })
      }
    }
  }, [toast])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        handleChange('archivo', file)
      } else {
        toast({
          title: 'Formato no valido',
          description: 'Solo se aceptan archivos PDF',
          variant: 'destructive',
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del contrato es obligatorio',
        variant: 'destructive',
      })
      return
    }

    if (!formData.fecha_inicio || !formData.fecha_fin) {
      toast({
        title: 'Error',
        description: 'Las fechas de inicio y fin son obligatorias',
        variant: 'destructive',
      })
      return
    }

    if (formData.fecha_inicio >= formData.fecha_fin) {
      toast({
        title: 'Error',
        description: 'La fecha de inicio debe ser anterior a la fecha de fin',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const submitData = new FormData()
      submitData.append('nombre', formData.nombre)
      submitData.append('responsable', formData.responsable)
      submitData.append('descripcion', formData.descripcion)
      submitData.append('fecha_inicio', formData.fecha_inicio.toISOString().split('T')[0])
      submitData.append('fecha_fin', formData.fecha_fin.toISOString().split('T')[0])
      submitData.append('dias_preaviso', String(formData.dias_preaviso))
      if (formData.valor) {
        submitData.append('valor', formData.valor)
      }
      submitData.append('moneda', formData.moneda)
      submitData.append('observaciones', formData.observaciones)
      if (formData.archivo) {
        submitData.append('archivo', formData.archivo)
      }
      if (contrato) {
        submitData.append('id', contrato.id)
      }

      await onSubmit(submitData)
      onOpenChange(false)
      setFormData(initialFormData)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el contrato',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData(initialFormData)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar contrato' : 'Nuevo contrato'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del contrato existente'
              : 'Registra un nuevo contrato con sus fechas y documentos'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">
                  Nombre del contrato <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Contrato de vigilancia"
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsable">Responsable</Label>
                <Input
                  id="responsable"
                  placeholder="Nombre del responsable"
                  value={formData.responsable}
                  onChange={(e) => handleChange('responsable', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Textarea
                id="descripcion"
                placeholder="Breve descripcion del contrato..."
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                disabled={saving}
                rows={2}
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Vigencia del contrato</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Fecha de inicio <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.fecha_inicio && 'text-muted-foreground'
                      )}
                      disabled={saving}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.fecha_inicio ? (
                        format(formData.fecha_inicio, 'PPP', { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.fecha_inicio}
                      onSelect={(date) => handleChange('fecha_inicio', date)}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>
                  Fecha de fin <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.fecha_fin && 'text-muted-foreground'
                      )}
                      disabled={saving}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.fecha_fin ? (
                        format(formData.fecha_fin, 'PPP', { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.fecha_fin}
                      onSelect={(date) => handleChange('fecha_fin', date)}
                      locale={es}
                      disabled={(date) =>
                        formData.fecha_inicio ? date <= formData.fecha_inicio : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_preaviso">
                Dias habiles de preaviso para notificacion
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="dias_preaviso"
                  type="number"
                  min={0}
                  max={365}
                  className="w-24"
                  value={formData.dias_preaviso}
                  onChange={(e) => handleChange('dias_preaviso', parseInt(e.target.value) || 0)}
                  disabled={saving}
                />
                <span className="text-sm text-muted-foreground">
                  dias habiles antes del vencimiento
                </span>
              </div>
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Informacion economica</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor del contrato</Label>
                <Input
                  id="valor"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={formData.valor}
                  onChange={(e) => handleChange('valor', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moneda">Moneda</Label>
                <Input
                  id="moneda"
                  placeholder="COP"
                  maxLength={3}
                  className="w-24"
                  value={formData.moneda}
                  onChange={(e) => handleChange('moneda', e.target.value.toUpperCase())}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Archivo */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Documento del contrato</h4>
            <div
              className={cn(
                'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                formData.archivo && 'border-emerald-500/50 bg-emerald-500/5'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {formData.archivo ? (
                <div className="flex items-center gap-3">
                  <FileUp className="h-8 w-8 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{formData.archivo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(formData.archivo.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleChange('archivo', null)}
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <FileUp className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Arrastra un archivo PDF aqui o
                  </p>
                  <label>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      onChange={handleFileSelect}
                      disabled={saving}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      asChild
                    >
                      <span>Seleccionar archivo</span>
                    </Button>
                  </label>
                  {isEditing && contrato?.archivo_principal_pathname && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Ya existe un documento adjunto. Sube uno nuevo para reemplazarlo.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones adicionales</Label>
            <Textarea
              id="observaciones"
              placeholder="Notas o comentarios sobre el contrato..."
              value={formData.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              disabled={saving}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                'Guardar cambios'
              ) : (
                'Crear contrato'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
