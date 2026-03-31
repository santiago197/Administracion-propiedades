'use client'

import { useEffect, useState } from 'react'
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
import type { Criterio, CriterioEvaluacion } from '@/lib/types'

type CriterioConfig = {
  criterioId?: string
  criterio_evaluacion_id: string
  peso: number
  valorMin: number
  valorMax: number
  orden: number
  activo: boolean
}

export default function ConfigurarCriteriosProceso() {
  const params = useParams()
  const procesoId = params.procesoId as string
  const [catalogo, setCatalogo] = useState<CriterioEvaluacion[]>([])
  const [catalogoLoading, setCatalogoLoading] = useState(true)
  const [catalogoError, setCatalogoError] = useState<string | null>(null)
  const [criteriosProceso, setCriteriosProceso] = useState<Criterio[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  // Estado de criterios seleccionados (checkbox del catálogo)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    new Set()
  )

  // Estado de configuración de cada criterio
  const [configuracion, setConfiguracion] = useState<Record<string, CriterioConfig>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCatalogoLoading(true)
        setCatalogoError(null)
        const [catalogoRes, procesoRes] = await Promise.all([
          fetch('/api/criterios'),
          fetch(`/api/criterios?proceso_id=${procesoId}`),
        ])

        if (!catalogoRes.ok) {
          const body = await catalogoRes.json().catch(() => ({}))
          throw new Error(body.error ?? 'No se pudo cargar el catálogo de criterios')
        }
        if (!procesoRes.ok) {
          const body = await procesoRes.json().catch(() => ({}))
          throw new Error(body.error ?? 'No se pudo cargar la configuración del proceso')
        }

        const catalogoBody = await catalogoRes.json()
        const procesoBody = await procesoRes.json()
        const criteriosCatalogo = catalogoBody.criterios ?? []
        const criteriosActuales = Array.isArray(procesoBody) ? procesoBody : (procesoBody?.criterios ?? [])

        setCatalogo(criteriosCatalogo)
        setCriteriosProceso(criteriosActuales)

        const seleccion = new Set<string>()
        const config: Record<string, CriterioConfig> = {}

        criteriosActuales.forEach((criterio: Criterio) => {
          const key = criterio.criterio_evaluacion_id || criterio.id
          seleccion.add(key)
          config[key] = {
            criterioId: criterio.id,
            criterio_evaluacion_id: key,
            peso: criterio.peso,
            valorMin: criterio.valor_minimo,
            valorMax: criterio.valor_maximo,
            orden: criterio.orden,
            activo: criterio.activo,
          }
        })

        setSeleccionados(seleccion)
        setConfiguracion(config)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al cargar el catálogo'
        setCatalogoError(message)
      } finally {
        setCatalogoLoading(false)
      }
    }

    fetchData()
  }, [procesoId])

  // Toggle selección de criterio del catálogo
  const toggleSeleccion = (id: string) => {
    const newSeleccionados = new Set(seleccionados)
    if (newSeleccionados.has(id)) {
      newSeleccionados.delete(id)
      // Remover configuración
      const newConfig = { ...configuracion }
      delete newConfig[id]
      setConfiguracion(newConfig)
      setSaveSuccess(false)
    } else {
      newSeleccionados.add(id)
      // Agregar configuración por defecto
      setConfiguracion((prev) => ({
        ...prev,
        [id]: {
          criterio_evaluacion_id: id,
          peso: 0,
          valorMin: 1,
          valorMax: 5,
          orden: Object.keys(prev).length + 1,
          activo: true,
        },
      }))
      setSaveSuccess(false)
    }
    setSeleccionados(newSeleccionados)
  }

  // Actualizar campo de configuración
  const updateConfig = (id: string, field: keyof CriterioConfig, value: number | boolean) => {
    setConfiguracion((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
    setSaveSuccess(false)
  }

  // Calcular suma de pesos
  const pesoTotal = Object.values(configuracion)
    .filter((c) => c.activo)
    .reduce((sum, c) => sum + c.peso, 0)

  const pesoValido = pesoTotal === 100
  const criteriosActivos = Object.values(configuracion).filter((c) => c.activo).length

  // Ordenar criterios configurados
  const criteriosOrdenados = Object.values(configuracion).sort((a, b) => a.orden - b.orden)

  const handleSave = async () => {
    if (!pesoValido) {
      setSaveError('La suma de pesos debe ser 100%')
      return
    }

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const seleccionadosIds = new Set(seleccionados)
      const criteriosSeleccionados = Object.values(configuracion)

      const eliminados = criteriosProceso.filter(
        (criterio) => !seleccionadosIds.has(criterio.criterio_evaluacion_id)
      )

      const deletes = eliminados.map((criterio) =>
        fetch(`/api/criterios/${criterio.id}?proceso_id=${procesoId}`, {
          method: 'DELETE',
        }).then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error ?? 'No se pudo eliminar un criterio')
          }
        })
      )

      const updates = criteriosSeleccionados
        .filter((criterio) => criterio.criterioId)
        .map((criterio) =>
          fetch(`/api/criterios/${criterio.criterioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              proceso_id: procesoId,
              peso: criterio.peso,
              valor_minimo: criterio.valorMin,
              valor_maximo: criterio.valorMax,
              orden: criterio.orden,
              activo: criterio.activo,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              throw new Error(body.error ?? 'No se pudo actualizar un criterio')
            }
          })
        )

      const creates = criteriosSeleccionados
        .filter((criterio) => !criterio.criterioId)
        .map((criterio) =>
          fetch('/api/criterios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              proceso_id: procesoId,
              criterio_evaluacion_id: criterio.criterio_evaluacion_id,
              peso: criterio.peso,
              valor_minimo: criterio.valorMin,
              valor_maximo: criterio.valorMax,
              orden: criterio.orden,
              activo: criterio.activo,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              throw new Error(body.error ?? 'No se pudo crear un criterio')
            }
          })
        )

      await Promise.all([...deletes, ...updates, ...creates])

      const refreshRes = await fetch(`/api/criterios?proceso_id=${procesoId}`)
      if (!refreshRes.ok) {
        const body = await refreshRes.json().catch(() => ({}))
        throw new Error(body.error ?? 'No se pudo refrescar la configuración')
      }
      const refreshed = await refreshRes.json()
      const criteriosActuales = Array.isArray(refreshed) ? refreshed : (refreshed?.criterios ?? [])
      setCriteriosProceso(criteriosActuales)

      const seleccion = new Set<string>()
      const config: Record<string, CriterioConfig> = {}
      criteriosActuales.forEach((criterio: Criterio) => {
        const key = criterio.criterio_evaluacion_id || criterio.id
        seleccion.add(key)
        config[key] = {
          criterioId: criterio.id,
          criterio_evaluacion_id: key,
          peso: criterio.peso,
          valorMin: criterio.valor_minimo,
          valorMax: criterio.valor_maximo,
          orden: criterio.orden,
          activo: criterio.activo,
        }
      })
      setSeleccionados(seleccion)
      setConfiguracion(config)
      setSaveSuccess(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar la configuración'
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }

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
          <Button className="gap-2" onClick={handleSave} disabled={!pesoValido || saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
      {saveError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
          Configuración guardada correctamente.
        </div>
      )}

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
            {catalogoLoading ? (
              <div className="py-6 text-sm text-muted-foreground">Cargando catálogo...</div>
            ) : catalogoError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {catalogoError}
              </div>
            ) : catalogo.length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground">
                No hay criterios activos en el catálogo.
              </div>
            ) : catalogo.map((criterio) => (
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
                    const criterio = catalogo.find((c) => c.id === config.criterio_evaluacion_id)
                    if (!criterio) return null

                    return (
                      <div
                        key={config.criterio_evaluacion_id}
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
                                  <Label htmlFor={`peso-${config.criterio_evaluacion_id}`} className="text-xs">
                                    Peso (%)
                                  </Label>
                                  <Input
                                    id={`peso-${config.criterio_evaluacion_id}`}
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={config.peso}
                                    onChange={(e) =>
                                      updateConfig(config.criterio_evaluacion_id, 'peso', Number(e.target.value))
                                    }
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`min-${config.criterio_evaluacion_id}`} className="text-xs">
                                    Valor mínimo
                                  </Label>
                                  <Input
                                    id={`min-${config.criterio_evaluacion_id}`}
                                    type="number"
                                    min={0}
                                    value={config.valorMin}
                                    onChange={(e) =>
                                      updateConfig(config.criterio_evaluacion_id, 'valorMin', Number(e.target.value))
                                    }
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`max-${config.criterio_evaluacion_id}`} className="text-xs">
                                    Valor máximo
                                  </Label>
                                  <Input
                                    id={`max-${config.criterio_evaluacion_id}`}
                                    type="number"
                                    min={0}
                                    value={config.valorMax}
                                    onChange={(e) =>
                                      updateConfig(config.criterio_evaluacion_id, 'valorMax', Number(e.target.value))
                                    }
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`orden-${config.criterio_evaluacion_id}`} className="text-xs">
                                    Orden
                                  </Label>
                                  <Input
                                    id={`orden-${config.criterio_evaluacion_id}`}
                                    type="number"
                                    min={1}
                                    value={config.orden}
                                    onChange={(e) =>
                                      updateConfig(config.criterio_evaluacion_id, 'orden', Number(e.target.value))
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
              <Button disabled={!pesoValido || saving} className="gap-2" onClick={handleSave}>
                <Save className="h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
