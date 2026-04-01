/**
 * Componente de Gestión de Acceso para Proponentes
 * Integrado en tabla de propuestas con:
 * - Generación de códigos únicos
 * - Link compartible
 * - Configuración de validez temporal
 * - Estados (Activo, Inactivo, Expirado)
 */

'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertCircle,
  Calendar,
  Check,
  Copy,
  Loader2,
  Link2,
  Settings,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import type { Propuesta } from '@/lib/types/index'

// ─────────────────────────────────────────────────────────────────────

export type EstadoAcceso = 'inactivo' | 'activo' | 'expirado'

export interface AccesoProponente {
  propuestaId: string
  codigo: string | null
  estado: EstadoAcceso
  fechaLimite: Date | null
  activo: boolean
  createdAt?: Date
}

// ─────────────────────────────────────────────────────────────────────

/**
 * Colores por estado de acceso
 */
const ESTADO_ACCESO_CLS: Record<EstadoAcceso, string> = {
  activo: 'bg-emerald-500/10 text-emerald-700',
  inactivo: 'bg-muted text-muted-foreground',
  expirado: 'bg-destructive/10 text-destructive',
}

const ESTADO_ACCESO_LABEL: Record<EstadoAcceso, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  expirado: 'Expirado',
}

// ─────────────────────────────────────────────────────────────────────

/**
 * Genera código único de 8 caracteres
 * Formato: 3 letras + 5 dígitos (ej: ABC12345)
 */
function generarCodigoUnico(): string {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const codigoLetras = Array(3)
    .fill(0)
    .map(() => letras[Math.floor(Math.random() * letras.length)])
    .join('')
  const codigoNumeros = Math.floor(10000 + Math.random() * 90000).toString()
  return codigoLetras + codigoNumeros
}

/**
 * Calcula el estado del acceso basado en:
 * - Si está activo/inactivo
 * - Si la fecha límite ha pasado
 */
function calcularEstadoAcceso(acceso: AccesoProponente): EstadoAcceso {
  if (!acceso.activo) return 'inactivo'
  if (acceso.fechaLimite && new Date() > acceso.fechaLimite) return 'expirado'
  return 'activo'
}

// ─────────────────────────────────────────────────────────────────────

interface AccesoProponenteCellProps {
  propuesta: Propuesta
  acceso: AccesoProponente | undefined
  onGenerarCodigo: (propuestaId: string) => Promise<void>
  onActualizarAcceso: (propuestaId: string, acceso: AccesoProponente) => Promise<void>
  isLoading?: boolean
}

/**
 * Celda de tabla con controles de acceso a proponente
 * - Si no hay código: botón "Generar"
 * - Si hay código: badge de estado + botones Copiar + Configurar
 */
export function AccesoProponenteCell({
  propuesta,
  acceso,
  onGenerarCodigo,
  onActualizarAcceso,
  isLoading = false,
}: AccesoProponenteCellProps) {
  const { toast } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [generando, setGenerando] = useState(false)

  const estadoAcceso = acceso ? calcularEstadoAcceso(acceso) : 'inactivo'

  const handleGenerarCodigo = async () => {
    setGenerando(true)
    try {
      await onGenerarCodigo(propuesta.id)
      toast({
        title: 'Código generado',
        description: 'Usa "Copiar" para compartir el link con el proponente',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo generar el código',
        variant: 'destructive',
      })
    } finally {
      setGenerando(false)
    }
  }

  const handleCopiarLink = async () => {
    if (!acceso?.codigo) return
    const url = `${window.location.origin}/proponente/documentos?codigo=${acceso.codigo}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(propuesta.id)
      toast({
        title: 'Link copiado',
        description: 'Comparte este link con el proponente',
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo copiar al portapapeles',
        variant: 'destructive',
      })
    }
  }

  // Si no hay código aún
  if (!acceso?.codigo) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={(e) => {
          e.stopPropagation()
          handleGenerarCodigo()
        }}
        disabled={generando || isLoading}
      >
        {generando ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Link2 className="h-3 w-3" />
        )}
        {generando ? 'Generando...' : 'Generar'}
      </Button>
    )
  }

  // Si ya existe código
  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Badge de estado */}
      <Badge
        variant="outline"
        className={`text-xs shrink-0 ${ESTADO_ACCESO_CLS[estadoAcceso]}`}
      >
        {ESTADO_ACCESO_LABEL[estadoAcceso]}
      </Badge>

      {/* Botón copiar link */}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={(e) => {
          e.stopPropagation()
          handleCopiarLink()
        }}
        title="Copiar link para compartir"
      >
        {copiedId === propuesta.id ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* Botón configurar */}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={(e) => {
          e.stopPropagation()
          setShowConfig(true)
        }}
        title="Configurar acceso"
      >
        <Settings className="h-3.5 w-3.5" />
      </Button>

      {/* Modal de configuración */}
      <ConfiguracionAccesoDrawer
        propuesta={propuesta}
        acceso={acceso}
        open={showConfig}
        onOpenChange={setShowConfig}
        onGuardar={async (nuevoAcceso) => {
          try {
            await onActualizarAcceso(propuesta.id, nuevoAcceso)
            toast({
              title: 'Configuración guardada',
              description: 'Los cambios se aplicaron correctamente',
            })
            setShowConfig(false)
          } catch (error) {
            toast({
              title: 'Error',
              description: 'No se pudo guardar la configuración',
              variant: 'destructive',
            })
          }
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────

interface ConfiguracionAccesoDrawerProps {
  propuesta: Propuesta
  acceso: AccesoProponente
  open: boolean
  onOpenChange: (open: boolean) => void
  onGuardar: (acceso: AccesoProponente) => Promise<void>
}

/**
 * Drawer para configurar:
 * - Toggle de activación
 * - Fecha límite de acceso
 * - Ver código actual
 */
function ConfiguracionAccesoDrawer({
  propuesta,
  acceso,
  open,
  onOpenChange,
  onGuardar,
}: ConfiguracionAccesoDrawerProps) {
  const { toast } = useToast()
  const [activo, setActivo] = useState(acceso.activo)
  const [fechaLimite, setFechaLimite] = useState<string>(
    acceso.fechaLimite ? format(acceso.fechaLimite, 'yyyy-MM-dd') : ''
  )
  const [saving, setSaving] = useState(false)

  const estadoAcceso = calcularEstadoAcceso(acceso)
  const mostrarAviso = !activo || estadoAcceso === 'expirado'

  const handleGuardar = async () => {
    setSaving(true)
    try {
      const nuevoAcceso: AccesoProponente = {
        ...acceso,
        activo,
        fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
        estado: calcularEstadoAcceso({
          ...acceso,
          activo,
          fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
        }),
      }
      await onGuardar(nuevoAcceso)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Configurar acceso del proponente</DrawerTitle>
          <DrawerDescription>
            {propuesta.razon_social}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-6 px-4 py-4">
          {/* Código actual (solo lectura) */}
          <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
            <Label className="text-xs font-semibold">Código de acceso</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-background px-2 py-1.5 font-mono text-sm font-semibold tracking-widest">
                {acceso.codigo}
              </code>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                onClick={async () => {
                  await navigator.clipboard.writeText(acceso.codigo!)
                  toast({
                    title: 'Código copiado',
                  })
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Estado actual */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Estado actual</Label>
            <Badge className={ESTADO_ACCESO_CLS[estadoAcceso]}>
              {ESTADO_ACCESO_LABEL[estadoAcceso]}
            </Badge>
          </div>

          {/* Toggle de activación */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Acceso activo</Label>
              <p className="text-xs text-muted-foreground">
                {activo
                  ? 'El proponente puede cargar documentos'
                  : 'El proponente NO puede cargar documentos'}
              </p>
            </div>
            <Switch
              checked={activo}
              onCheckedChange={setActivo}
              disabled={saving}
            />
          </div>

          {/* Fecha límite */}
          <div className="space-y-2">
            <Label htmlFor="fecha-limite" className="text-sm font-medium">
              Fecha límite de acceso
            </Label>
            <p className="text-xs text-muted-foreground">
              Después de esta fecha, el proponente no podrá cargar documentos
            </p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                id="fecha-limite"
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="h-9 text-sm"
                disabled={saving}
              />
            </div>
            {fechaLimite && new Date(fechaLimite) < new Date() && (
              <div className="flex items-start gap-2 rounded-sm bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Esta fecha ya pasó</span>
              </div>
            )}
          </div>

          {/* Aviso si está inactivo o expirado */}
          {mostrarAviso && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                {!activo && (
                  <p>
                    El acceso está <strong>desactivado</strong>. Actívalo para permitir carga de
                    documentos.
                  </p>
                )}
                {estadoAcceso === 'expirado' && (
                  <p>
                    El acceso expiró el{' '}
                    <strong>
                      {format(acceso.fechaLimite!, 'd \'de\' MMMM \'de\' yyyy', { locale: es })}
                    </strong>
                    . Establece una nueva fecha límite.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button
            onClick={handleGuardar}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Cancelar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─────────────────────────────────────────────────────────────────────

/**
 * Hook para gestionar los accesos de proponentes
 * Maneja el estado local y las llamadas a API
 */
export function useAccesoProponentes() {
  const [accesosMap, setAccesosMap] = useState<Map<string, AccesoProponente>>(
    new Map()
  )
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const getAcceso = useCallback(
    (propuestaId: string): AccesoProponente | undefined => {
      return accesosMap.get(propuestaId)
    },
    [accesosMap]
  )

  const generarCodigo = useCallback(
    async (propuestaId: string) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/propuestas/${propuestaId}/acceso`, {
          method: 'POST',
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al generar código')
        }

        const nuevoAcceso = await res.json()
        setAccesosMap((prev) =>
          new Map(prev).set(propuestaId, {
            propuestaId,
            codigo: nuevoAcceso.codigo,
            estado: 'activo',
            fechaLimite: nuevoAcceso.fecha_limite
              ? new Date(nuevoAcceso.fecha_limite)
              : null,
            activo: nuevoAcceso.activo,
          })
        )
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const actualizarAcceso = useCallback(
    async (propuestaId: string, acceso: AccesoProponente) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/propuestas/${propuestaId}/acceso`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activo: acceso.activo,
            fechaLimite: acceso.fechaLimite?.toISOString(),
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al actualizar')
        }

        setAccesosMap((prev) => new Map(prev).set(propuestaId, acceso))
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const revocarAcceso = useCallback(
    async (propuestaId: string) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/propuestas/${propuestaId}/acceso`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Error al revocar acceso')

        setAccesosMap((prev) => {
          const newMap = new Map(prev)
          newMap.delete(propuestaId)
          return newMap
        })
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    accesosMap,
    getAcceso,
    generarCodigo,
    actualizarAcceso,
    revocarAcceso,
    loading,
  }
}
