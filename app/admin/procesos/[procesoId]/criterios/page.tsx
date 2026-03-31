'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Datos mock del catálogo de criterios
const CATALOGO_CRITERIOS = [
  {
    id: 'exp-admin',
    nombre: 'Experiencia en administración',
    descripcion: 'Años de experiencia administrando propiedades horizontales similares',
  },
  {
    id: 'cap-operativa',
    nombre: 'Capacidad operativa',
    descripcion: 'Infraestructura, personal y recursos disponibles para la gestión',
  },
  {
    id: 'propuesta-eco',
    nombre: 'Propuesta económica',
    descripcion: 'Honorarios mensuales y costos adicionales propuestos',
  },
  {
    id: 'cumplimiento-legal',
    nombre: 'Cumplimiento legal',
    descripcion: 'Documentación legal al día (RUT, Cámara de Comercio, pólizas)',
  },
  {
    id: 'referencias',
    nombre: 'Referencias y reputación',
    descripcion: 'Calidad de referencias de otros conjuntos administrados',
  },
  {
    id: 'tecnologia',
    nombre: 'Uso de tecnología',
    descripcion: 'Plataformas digitales, app móvil, reportes en línea',
  },
  {
    id: 'atencion-cliente',
    nombre: 'Atención al cliente',
    descripcion: 'Canales de comunicación y tiempos de respuesta',
  },
  {
    id: 'plan-trabajo',
    nombre: 'Plan de trabajo',
    descripcion: 'Claridad y viabilidad del plan de gestión propuesto',
  },
]

// Datos mock de criterios ya configurados
const CRITERIOS_CONFIGURADOS_MOCK = [
  { id: 'exp-admin', peso: 25, valorMin: 1, valorMax: 5, orden: 1, activo: true },
  { id: 'propuesta-eco', peso: 30, valorMin: 1, valorMax: 5, orden: 2, activo: true },
  { id: 'cumplimiento-legal', peso: 20, valorMin: 0, valorMax: 1, orden: 3, activo: true },
  { id: 'referencias', peso: 15, valorMin: 1, valorMax: 5, orden: 4, activo: true },
]

type CriterioConfig = {
  id: string
  peso: number
  valorMin: number
  valorMax: number
  orden: number
  activo: boolean
}

export default function ConfigurarCriteriosProceso() {
  const params = useParams()
  const procesoId = params.procesoId as string

  // Estado de criterios seleccionados (checkbox del catálogo)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    new Set(CRITERIOS_CONFIGURADOS_MOCK.map((c) => c.id))
  )

  // Estado de configuración de cada criterio
  const [configuracion, setConfiguracion] = useState<Record<string, CriterioConfig>>(
    CRITERIOS_CONFIGURADOS_MOCK.reduce(
      (acc, c) => ({ ...acc, [c.id]: c }),
      {} as Record<string, CriterioConfig>
    )
  )

  // Toggle selección de criterio del catálogo
  const toggleSeleccion = (id: string) => {
    const newSeleccionados = new Set(seleccionados)
    if (newSeleccionados.has(id)) {
      newSeleccionados.delete(id)
      // Remover configuración
      const newConfig = { ...configuracion }
      delete newConfig[id]
      setConfiguracion(newConfig)
    } else {
      newSeleccionados.add(id)
      // Agregar configuración por defecto
      setConfiguracion((prev) => ({
        ...prev,
        [id]: {
          id,
          peso: 0,
          valorMin: 1,
          valorMax: 5,
          orden: Object.keys(prev).length + 1,
          activo: true,
        },
      }))
    }
    setSeleccionados(newSeleccionados)
  }

  // Actualizar campo de configuración
  const updateConfig = (id: string, field: keyof CriterioConfig, value: number | boolean) => {
    setConfiguracion((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  // Calcular suma de pesos
  const pesoTotal = Object.values(configuracion)
    .filter((c) => c.activo)
    .reduce((sum, c) => sum + c.peso, 0)

  const pesoValido = pesoTotal === 100
  const criteriosActivos = Object.values(configuracion).filter((c) => c.activo).length

  // Ordenar criterios configurados
  const criteriosOrdenados = Object.values(configuracion).sort((a, b) => a.orden - b.orden)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/procesos/${procesoId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">Proceso de Selección 2024</p>
            <h1 className="text-2xl font-semibold tracking-tight">Configurar Criterios</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/procesos/${procesoId}`}>
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel izquierdo: Catálogo de criterios */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Catálogo de Criterios</CardTitle>
            <CardDescription>
              Selecciona los criterios a evaluar en este proceso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {CATALOGO_CRITERIOS.map((criterio) => (
              <div
                key={criterio.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50',
                  seleccionados.has(criterio.id) && 'border-primary/50 bg-primary/5'
                )}
                onClick={() => toggleSeleccion(criterio.id)}
              >
                <Checkbox
                  checked={seleccionados.has(criterio.id)}
                  onCheckedChange={() => toggleSeleccion(criterio.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{criterio.nombre}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {criterio.descripcion}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Panel derecho: Configuración y Resumen */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resumen de pesos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Distribución de Pesos</CardTitle>
                  <CardDescription>
                    La suma de pesos activos debe ser exactamente 100%
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Peso total</p>
                  <p
                    className={cn(
                      'text-2xl font-bold tabular-nums',
                      pesoValido ? 'text-green-600' : 'text-amber-600'
                    )}
                  >
                    {pesoTotal}%
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <Progress value={pesoTotal} className="flex-1" />
                <div className="flex items-center gap-2">
                  {pesoValido ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                </div>
              </div>
              {!pesoValido && (
                <p className="text-xs text-amber-600">
                  {pesoTotal < 100
                    ? `Faltan ${100 - pesoTotal}% para completar`
                    : `Excede por ${pesoTotal - 100}%`}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{seleccionados.size} criterios seleccionados</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{criteriosActivos} activos</span>
              </div>
            </CardContent>
          </Card>

          {/* Configuración de criterios seleccionados */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Configuración de Criterios</CardTitle>
              </div>
              <CardDescription>
                Define el peso, rango de valores y orden de evaluación
              </CardDescription>
            </CardHeader>
            <CardContent>
              {criteriosOrdenados.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">No hay criterios seleccionados</p>
                  <p className="text-xs mt-1">Selecciona criterios del catálogo</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {criteriosOrdenados.map((config) => {
                    const criterio = CATALOGO_CRITERIOS.find((c) => c.id === config.id)
                    if (!criterio) return null

                    return (
                      <div
                        key={config.id}
                        className={cn(
                          'rounded-lg border p-4 transition-opacity',
                          !config.activo && 'opacity-50'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 text-muted-foreground cursor-grab">
                            <GripVertical className="h-5 w-5" />
                            <span className="text-sm font-medium w-6">{config.orden}</span>
                          </div>

                          <div className="flex-1 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium">{criterio.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  {criterio.descripcion}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={config.activo}
                                  onCheckedChange={(checked) =>
                                    updateConfig(config.id, 'activo', checked)
                                  }
                                />
                                <Badge variant={config.activo ? 'default' : 'secondary'}>
                                  {config.activo ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-4">
                              <div className="space-y-2">
                                <Label htmlFor={`peso-${config.id}`} className="text-xs">
                                  Peso (%)
                                </Label>
                                <Input
                                  id={`peso-${config.id}`}
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={config.peso}
                                  onChange={(e) =>
                                    updateConfig(config.id, 'peso', Number(e.target.value))
                                  }
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`min-${config.id}`} className="text-xs">
                                  Valor mínimo
                                </Label>
                                <Input
                                  id={`min-${config.id}`}
                                  type="number"
                                  min={0}
                                  value={config.valorMin}
                                  onChange={(e) =>
                                    updateConfig(config.id, 'valorMin', Number(e.target.value))
                                  }
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`max-${config.id}`} className="text-xs">
                                  Valor máximo
                                </Label>
                                <Input
                                  id={`max-${config.id}`}
                                  type="number"
                                  min={0}
                                  value={config.valorMax}
                                  onChange={(e) =>
                                    updateConfig(config.id, 'valorMax', Number(e.target.value))
                                  }
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`orden-${config.id}`} className="text-xs">
                                  Orden
                                </Label>
                                <Input
                                  id={`orden-${config.id}`}
                                  type="number"
                                  min={1}
                                  value={config.orden}
                                  onChange={(e) =>
                                    updateConfig(config.id, 'orden', Number(e.target.value))
                                  }
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones finales */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="text-sm">
              {pesoValido ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Configuración válida
                </span>
              ) : (
                <span className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Ajusta los pesos para que sumen 100%
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/procesos/${procesoId}`}>
                <Button variant="outline">Volver</Button>
              </Link>
              <Button disabled={!pesoValido} className="gap-2">
                <Save className="h-4 w-4" />
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
