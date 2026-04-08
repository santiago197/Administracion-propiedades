'use client'

import { useState, useEffect, useMemo, type ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Building2,
  Users,
  FileText,
  Star,
  Banknote,
  GraduationCap,
  Scale,
  Heart,
  ClipboardList,
  CheckCircle2,
  Loader2,
  Info,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import type { Propuesta, ClasificacionPropuesta } from '@/lib/types/index'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface CriterioConfig {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  peso: number
  orden: number
  activo: boolean
}

type EvalData = Record<string, number | null>

const CLAS_STYLE: Record<ClasificacionPropuesta, { label: string; cls: string }> = {
  destacado:    { label: 'Cumple',                    cls: 'bg-green-600 text-white' },
  apto:         { label: 'Cumple, con observaciones', cls: 'bg-yellow-500 text-white' },
  condicionado: { label: 'Cumple, con observaciones', cls: 'bg-orange-500 text-white' },
  no_apto:      { label: 'Rechazado',                 cls: 'bg-red-600 text-white' },
}

// Iconos por código de criterio (fallback a HelpCircle)
const ICON_MAP: Record<string, ReactNode> = {
  expPH:                   <Building2 className="h-5 w-5 text-blue-500" />,
  expDensidad:             <Building2 className="h-5 w-5 text-purple-500" />,
  capacidadOperativa:      <Users className="h-5 w-5 text-cyan-500" />,
  propuestaTecnica:        <ClipboardList className="h-5 w-5 text-indigo-500" />,
  formacionAcademica:      <GraduationCap className="h-5 w-5 text-amber-500" />,
  conocimientosNormativos: <Scale className="h-5 w-5 text-green-500" />,
  referencias:             <Star className="h-5 w-5 text-yellow-500" />,
  economica:               <Banknote className="h-5 w-5 text-emerald-500" />,
  competenciasPersonales:  <Heart className="h-5 w-5 text-rose-500" />,
}

function getIconForCriterio(codigo: string): ReactNode {
  return ICON_MAP[codigo] ?? <HelpCircle className="h-5 w-5 text-muted-foreground" />
}

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

function sumarPuntos(evalData: EvalData): number {
  return Object.values(evalData).reduce((acc, val) => acc + (val ?? 0), 0)
}

function getClasificacion(score: number, maxScore: number): ClasificacionPropuesta {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
  if (pct === 100) return 'destacado'
  if (pct >= 60) return 'apto'
  return 'no_apto'
}

function isComplete(evalData: EvalData, criterios: CriterioConfig[]): boolean {
  return criterios.every((c) => evalData[c.codigo] !== null && evalData[c.codigo] !== undefined)
}

// ---------------------------------------------------------------------------
// Sub-componentes de UI
// ---------------------------------------------------------------------------

function OpcionBinaria({
  field,
  max,
  value,
  onChange,
}: {
  field: string
  max: number
  value: number | null
  onChange: (v: number) => void
}) {
  const maxPts = max ?? 0
  const uniqueId = `eval-${field}`
  return (
    <RadioGroup
      name={uniqueId}
      value={value?.toString() ?? ''}
      onValueChange={(v) => onChange(parseInt(v))}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <div className="flex items-center justify-between border rounded-md px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
        <div className="flex items-center gap-3">
          <RadioGroupItem value={maxPts.toString()} id={`${uniqueId}-si`} />
          <Label htmlFor={`${uniqueId}-si`} className="cursor-pointer font-normal text-sm">
            Sí cumple
          </Label>
        </div>
        <span className="text-xs text-muted-foreground font-medium ml-3 shrink-0">{maxPts} pts</span>
      </div>
      <div className="flex items-center justify-between border rounded-md px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer has-[[data-state=checked]]:border-destructive has-[[data-state=checked]]:bg-destructive/5">
        <div className="flex items-center gap-3">
          <RadioGroupItem value="0" id={`${uniqueId}-no`} />
          <Label htmlFor={`${uniqueId}-no`} className="cursor-pointer font-normal text-sm">
            No cumple
          </Label>
        </div>
        <span className="text-xs text-muted-foreground font-medium ml-3 shrink-0">0 pts</span>
      </div>
    </RadioGroup>
  )
}

function CriterioBloque({
  numero,
  nombre,
  pts,
  maxPts,
  icon,
  tooltip,
  autosugerido,
  children,
}: {
  numero: number
  nombre: string
  pts: number | null
  maxPts: number
  icon: ReactNode
  tooltip: string
  autosugerido?: boolean
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">
            {numero}
          </span>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-semibold text-base">{nombre}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-sm">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {autosugerido && (
              <span className="text-xs text-blue-500 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Auto-sugerido con datos del candidato
              </span>
            )}
          </div>
        </div>
        <span className={`text-base font-bold shrink-0 tabular-nums ${pts !== null ? 'text-primary' : 'text-muted-foreground'}`}>
          {pts !== null ? pts : '–'}/{maxPts ?? 0}
        </span>
      </div>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface PanelEvaluacionProps {
  propuesta: Propuesta | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function PanelEvaluacion({ propuesta, open, onOpenChange, onSaved }: PanelEvaluacionProps) {
  const [criterios, setCriterios] = useState<CriterioConfig[]>([])
  const [criteriosLoading, setCriteriosLoading] = useState(true)
  const [evalData, setEvalData] = useState<EvalData>({})
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar criterios de evaluación desde la BD (por proceso_id)
  useEffect(() => {
    if (!propuesta?.proceso_id) {
      setCriteriosLoading(false)
      return
    }

    const cargarCriterios = async () => {
      setCriteriosLoading(true)
      try {
        const res = await fetch(`/api/criterios?proceso_id=${propuesta.proceso_id}`)
        if (res.ok) {
          const data = await res.json()
          // data puede ser { criterios: [...] } o directamente [...]
          const lista = Array.isArray(data) ? data : (data.criterios ?? [])
          const criteriosActivos = lista
            .filter((c: CriterioConfig) => c.activo !== false)
            .sort((a: CriterioConfig, b: CriterioConfig) => (a.orden ?? 0) - (b.orden ?? 0))
          setCriterios(criteriosActivos)
        }
      } catch (e) {
        console.error('Error cargando criterios:', e)
      } finally {
        setCriteriosLoading(false)
      }
    }
    cargarCriterios()
  }, [propuesta?.proceso_id])

  // Calcular el puntaje máximo posible
  const maxScore = useMemo(() => {
    return criterios.reduce((acc, c) => acc + c.peso, 0)
  }, [criterios])

  // Cargar evaluación existente o auto-sugerir al abrir con una propuesta distinta
  useEffect(() => {
    if (!propuesta || criterios.length === 0) return

    const cargarEvaluacion = async () => {
      setCargando(true)
      setError(null)
      try {
        const res = await fetch(`/api/propuestas/${propuesta.id}/evaluar`)
        if (res.ok) {
          const data = await res.json()
          if (data?.detalles) {
            // Mapear los detalles guardados a evalData
            const dataFromServer: EvalData = {}
            for (const c of criterios) {
              dataFromServer[c.codigo] = data.detalles[c.codigo] ?? null
            }
            setEvalData(dataFromServer)
            return
          }
        }
      } catch {
        // si falla la carga, seguir con auto-sugerencia
      } finally {
        setCargando(false)
      }
      
      // Sin evaluación previa: auto-sugerir algunos campos si es posible
      const initialData: EvalData = {}
      for (const c of criterios) {
        if (c.codigo === 'expPH' && propuesta.anios_experiencia >= 5) {
          initialData[c.codigo] = c.peso
        } else if (c.codigo === 'expDensidad' && propuesta.unidades_administradas > 500) {
          initialData[c.codigo] = c.peso
        } else {
          initialData[c.codigo] = null
        }
      }
      setEvalData(initialData)
    }

    cargarEvaluacion()
  }, [propuesta?.id, criterios]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = sumarPuntos(evalData)
  const clasificacion = getClasificacion(total, maxScore)
  const clasStyle = CLAS_STYLE[clasificacion]
  const completo = isComplete(evalData, criterios)

  const set = (codigo: string, value: number) =>
    setEvalData((prev) => ({ ...prev, [codigo]: value }))

  const handleGuardar = async () => {
    if (!propuesta || !completo) return
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/propuestas/${propuesta.id}/evaluar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puntaje_total: total,
          clasificacion,
          detalles: evalData,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Error al guardar la evaluación')
        return
      }
      onOpenChange(false)
      onSaved()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (!propuesta) return null

  const pctScore = maxScore > 0 ? (total / maxScore) * 100 : 0
  const currentClasIndex = pctScore === 100 ? 0 : pctScore >= 60 ? 1 : 2

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl p-0 gap-0 flex flex-col"
      >
        {/* Cargando criterios o evaluación existente */}
        {(cargando || criteriosLoading) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Encabezado */}
        <SheetHeader className="px-4 sm:px-8 pt-5 sm:pt-8 pb-4 sm:pb-5 border-b shrink-0">
          <SheetTitle className="text-2xl">Panel de Calificación</SheetTitle>
          <SheetDescription>
            <span className="font-semibold text-foreground">{propuesta.razon_social}</span>
            {' · '}
            {propuesta.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'}
            {' · NIT/CC: '}
            {propuesta.nit_cedula}
            {propuesta.anios_experiencia > 0 && (
              <> · <span className="text-blue-500">{propuesta.anios_experiencia} años de experiencia</span></>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Score compacto — solo visible en mobile */}
        <div className="lg:hidden shrink-0 px-4 py-3 border-b bg-muted/10 flex items-center gap-3">
          <span className="text-3xl font-black text-primary tabular-nums">{total}</span>
          <span className="text-sm text-muted-foreground">/{maxScore}</span>
          <Progress value={Math.min(pctScore, 100)} className="flex-1 h-2" />
          <div className={`py-1 px-2.5 rounded text-xs font-semibold shrink-0 ${clasStyle.cls}`}>
            {clasStyle.label}
          </div>
        </div>

        {/* Cuerpo: criterios + sidebar */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Columna de criterios */}
          <ScrollArea className="flex-1">
            <div className="px-4 sm:px-8 py-5 sm:py-7 space-y-6 sm:space-y-8">
              {criterios.map((criterio, index) => (
                <div key={criterio.id}>
                  {index > 0 && <Separator className="mb-6 sm:mb-8" />}
                  <CriterioBloque
                    numero={index + 1}
                    nombre={criterio.nombre}
                    pts={evalData[criterio.codigo] ?? null}
                    maxPts={criterio.peso ?? 0}
                    icon={getIconForCriterio(criterio.codigo)}
                    tooltip={criterio.descripcion || criterio.nombre}
                    autosugerido={
                      (criterio.codigo === 'expPH' && propuesta.anios_experiencia >= 5) ||
                      (criterio.codigo === 'expDensidad' && propuesta.unidades_administradas > 500)
                    }
                  >
                    <OpcionBinaria
                      field={criterio.codigo}
                      max={criterio.peso ?? 0}
                      value={evalData[criterio.codigo] ?? null}
                      onChange={(v) => set(criterio.codigo, v)}
                    />
                  </CriterioBloque>
                </div>
              ))}

              {criterios.length === 0 && !criteriosLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No hay criterios de evaluación configurados.</p>
                  <p className="text-sm">Configure los criterios en Configuración → Criterios de Evaluación.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Sidebar: puntaje en vivo — oculto en mobile */}
          <aside className="hidden lg:flex w-72 border-l flex-col p-6 gap-5 bg-muted/10 shrink-0 overflow-y-auto">

            {/* Score total */}
            <div className="space-y-3">
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                Puntaje en vivo
              </p>
              <div className="text-center py-2">
                <span className="text-5xl font-black text-primary tabular-nums">{total}</span>
                <span className="text-lg text-muted-foreground">/{maxScore}</span>
              </div>
              <Progress value={Math.min(pctScore, 100)} className="h-3" />
              <div className={`py-2 px-3 rounded-lg text-center text-sm font-semibold ${clasStyle.cls}`}>
                {clasStyle.label.toUpperCase()}
              </div>
            </div>

            <Separator />

            {/* Desglose por criterio */}
            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                Desglose
              </p>
              {criterios.map((c) => {
                const val = evalData[c.codigo] ?? null
                return (
                  <div key={c.codigo} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground truncate mr-2">{c.nombre}</span>
                    <span className={`tabular-nums shrink-0 ${val !== null ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {val !== null ? val : '–'}/{c.peso}
                    </span>
                  </div>
                )
              })}
            </div>

            <Separator />

            {/* Umbrales de clasificación */}
            <div className="space-y-1.5">
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                Umbrales
              </p>
              {[
                { label: 'Cumple',                    min: '100%', cls: 'text-green-600',  i: 0 },
                { label: 'Cumple, con observaciones', min: '≥60%', cls: 'text-yellow-600', i: 1 },
                { label: 'Rechazado',                 min: '<60%', cls: 'text-red-600',    i: 2 },
              ].map(({ label, min, cls, i }) => (
                <div
                  key={label}
                  className={`flex justify-between text-xs ${cls} ${i === currentClasIndex ? 'font-bold' : 'opacity-60'}`}
                >
                  <span>{label}</span>
                  <span>{min}</span>
                </div>
              ))}
            </div>

          </aside>
        </div>

        {/* Footer sticky: botón guardar visible en todos los tamaños */}
        <div className="shrink-0 border-t px-4 sm:px-8 py-4 bg-background space-y-2">
          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {!completo && criterios.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Selecciona todos los criterios para habilitar el guardado.
            </p>
          )}
          <Button
            className="w-full gap-2"
            disabled={!completo || guardando || criterios.length === 0}
            onClick={handleGuardar}
          >
            {guardando
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <CheckCircle2 className="h-4 w-4" />
            }
            {guardando ? 'Guardando...' : 'Guardar Calificación'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
