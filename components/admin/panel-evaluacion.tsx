'use client'

import { useState, useEffect, type ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
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
  ShieldCheck,
  Briefcase,
  Settings2,
  Users,
  FileText,
  Star,
  Banknote,
  CheckCircle2,
  Loader2,
  Info,
  AlertCircle,
} from 'lucide-react'
import type { Propuesta, ClasificacionPropuesta } from '@/lib/types/index'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type EvalData = {
  densidad: number | null
  cartera: number | null
  financiero: number | null
  complejaOps: string[]
  complejaNivel: number | null
  capacidad: number | null
  tecnica: number | null
  referencias: number | null
  economica: number | null
}

const OPERACIONES = ['Seguridad', 'Convivencia', 'Parqueaderos'] as const

const CLAS_STYLE: Record<ClasificacionPropuesta, { label: string; cls: string }> = {
  destacado: { label: 'Destacado', cls: 'bg-green-600 text-white' },
  apto: { label: 'Apto', cls: 'bg-yellow-500 text-white' },
  condicionado: { label: 'Condicionado', cls: 'bg-orange-500 text-white' },
  no_apto: { label: 'No Apto', cls: 'bg-red-600 text-white' },
}

const DESGLOSE: { key: keyof Omit<EvalData, 'complejaOps'>; label: string; max: number }[] = [
  { key: 'densidad', label: 'Experiencia densidad', max: 25 },
  { key: 'cartera', label: 'Cartera', max: 20 },
  { key: 'financiero', label: 'Control financiero', max: 15 },
  { key: 'complejaNivel', label: 'Operación compleja', max: 15 },
  { key: 'capacidad', label: 'Capacidad operativa', max: 10 },
  { key: 'tecnica', label: 'Propuesta técnica', max: 10 },
  { key: 'referencias', label: 'Referencias', max: 5 },
  { key: 'economica', label: 'Propuesta económica', max: 5 },
]

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

function sumarPuntos(d: EvalData): number {
  return (
    (d.densidad ?? 0) +
    (d.cartera ?? 0) +
    (d.financiero ?? 0) +
    (d.complejaNivel ?? 0) +
    (d.capacidad ?? 0) +
    (d.tecnica ?? 0) +
    (d.referencias ?? 0) +
    (d.economica ?? 0)
  )
}

function getClasificacion(score: number): ClasificacionPropuesta {
  if (score >= 85) return 'destacado'
  if (score >= 70) return 'apto'
  if (score >= 55) return 'condicionado'
  return 'no_apto'
}

function isComplete(d: EvalData): boolean {
  return (
    d.densidad !== null &&
    d.cartera !== null &&
    d.financiero !== null &&
    d.complejaNivel !== null &&
    d.capacidad !== null &&
    d.tecnica !== null &&
    d.referencias !== null &&
    d.economica !== null
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes de UI
// ---------------------------------------------------------------------------

function OpcionRadio({
  id,
  value,
  label,
  badge,
}: {
  id: string
  value: string
  label: string
  badge?: string
}) {
  return (
    <div className="flex items-center justify-between border rounded-md px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
      <div className="flex items-center gap-3">
        <RadioGroupItem value={value} id={id} />
        <Label htmlFor={id} className="cursor-pointer font-normal text-sm leading-snug">
          {label}
        </Label>
      </div>
      {badge && (
        <span className="text-xs text-muted-foreground font-medium ml-3 shrink-0">{badge}</span>
      )}
    </div>
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
          {pts !== null ? pts : '–'}/{maxPts}
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
  const [evalData, setEvalData] = useState<EvalData>({
    densidad: null,
    cartera: null,
    financiero: null,
    complejaOps: [],
    complejaNivel: null,
    capacidad: null,
    tecnica: null,
    referencias: null,
    economica: null,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-sugerencias al abrir el panel con una propuesta distinta
  useEffect(() => {
    if (!propuesta) return
    const densidad =
      propuesta.unidades_administradas > 500 ? 25
      : propuesta.unidades_administradas >= 300 ? 15
      : 5
    const capacidad = propuesta.tipo_persona === 'juridica' ? 10 : 5
    setEvalData({
      densidad,
      cartera: null,
      financiero: null,
      complejaOps: [],
      complejaNivel: null,
      capacidad,
      tecnica: null,
      referencias: null,
      economica: null,
    })
    setError(null)
  }, [propuesta?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = sumarPuntos(evalData)
  const clasificacion = getClasificacion(total)
  const clasStyle = CLAS_STYLE[clasificacion]
  const completo = isComplete(evalData)

  const set = (field: keyof Omit<EvalData, 'complejaOps'>, value: number) =>
    setEvalData((prev) => ({ ...prev, [field]: value }))

  const toggleOp = (op: string) =>
    setEvalData((prev) => ({
      ...prev,
      complejaOps: prev.complejaOps.includes(op)
        ? prev.complejaOps.filter((o) => o !== op)
        : [...prev.complejaOps, op],
    }))

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

  const currentClasIndex =
    total >= 85 ? 0 : total >= 70 ? 1 : total >= 55 ? 2 : 3

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl p-0 gap-0 flex flex-col"
      >
        {/* Encabezado */}
        <SheetHeader className="px-8 pt-8 pb-5 border-b shrink-0">
          <SheetTitle className="text-2xl">Panel de Calificación</SheetTitle>
          <SheetDescription>
            <span className="font-semibold text-foreground">{propuesta.razon_social}</span>
            {' · '}
            {propuesta.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'}
            {' · NIT/CC: '}
            {propuesta.nit_cedula}
            {propuesta.unidades_administradas > 0 && (
              <> · <span className="text-blue-500">{propuesta.unidades_administradas.toLocaleString()} uds. administradas</span></>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Cuerpo: criterios + sidebar */}
        <div className="flex flex-1 overflow-hidden">

          {/* Columna de criterios */}
          <ScrollArea className="flex-1">
            <div className="px-8 py-7 space-y-8">

              {/* 1. EXPERIENCIA EN ALTA DENSIDAD */}
              <CriterioBloque
                numero={1}
                nombre="Experiencia en Alta Densidad"
                pts={evalData.densidad}
                maxPts={25}
                icon={<Building2 className="h-5 w-5 text-blue-500" />}
                tooltip="Capacidad del candidato de administrar conjuntos de alta densidad. Se sugiere automáticamente con base en unidades_administradas."
                autosugerido
              >
                <RadioGroup
                  value={evalData.densidad?.toString() ?? ''}
                  onValueChange={(v) => set('densidad', parseInt(v))}
                  className="space-y-2"
                >
                  <OpcionRadio id="d-25" value="25" label="+500 unidades administradas" badge="25 pts" />
                  <OpcionRadio id="d-15" value="15" label="300 – 500 unidades" badge="15 pts" />
                  <OpcionRadio id="d-5" value="5" label="Menos de 300 unidades" badge="5 pts" />
                </RadioGroup>
              </CriterioBloque>

              <Separator />

              {/* 2. RESULTADOS EN CARTERA */}
              <CriterioBloque
                numero={2}
                nombre="Resultados en Cartera"
                pts={evalData.cartera}
                maxPts={20}
                icon={<ShieldCheck className="h-5 w-5 text-green-500" />}
                tooltip="Evidencia documentada de reducción de cartera morosa en conjuntos administrados anteriormente."
              >
                <RadioGroup
                  value={evalData.cartera?.toString() ?? ''}
                  onValueChange={(v) => set('cartera', parseInt(v))}
                  className="space-y-2"
                >
                  <OpcionRadio id="c-20" value="20" label="Reducción comprobada de cartera morosa" badge="20 pts" />
                  <OpcionRadio id="c-10" value="10" label="Manejo operativo sin resultados medibles" badge="10 pts" />
                  <OpcionRadio id="c-0" value="0" label="Sin experiencia en gestión de cartera" badge="0 pts" />
                </RadioGroup>
              </CriterioBloque>

              <Separator />

              {/* 3. CONTROL FINANCIERO */}
              <CriterioBloque
                numero={3}
                nombre="Control Financiero"
                pts={evalData.financiero}
                maxPts={15}
                icon={<Briefcase className="h-5 w-5 text-amber-500" />}
                tooltip="Capacidad de elaborar informes financieros, presupuestos y controlar egresos e ingresos del conjunto."
              >
                <RadioGroup
                  value={evalData.financiero?.toString() ?? ''}
                  onValueChange={(v) => set('financiero', parseInt(v))}
                  className="grid grid-cols-2 gap-3"
                >
                  <OpcionRadio id="f-15" value="15" label="Manejo completo: informes, presupuesto y control de egresos" badge="15 pts" />
                  <OpcionRadio id="f-8" value="8" label="Básico / limitado" badge="8 pts" />
                </RadioGroup>
              </CriterioBloque>

              <Separator />

              {/* 4. OPERACIÓN COMPLEJA */}
              <CriterioBloque
                numero={4}
                nombre="Operación Compleja"
                pts={evalData.complejaNivel}
                maxPts={15}
                icon={<Settings2 className="h-5 w-5 text-purple-500" />}
                tooltip="Experiencia administrando aspectos complejos como seguridad, convivencia y parqueaderos."
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Áreas de experiencia declaradas (informativo):
                    </p>
                    <div className="flex gap-6">
                      {OPERACIONES.map((op) => (
                        <div key={op} className="flex items-center gap-2">
                          <Checkbox
                            id={`op-${op}`}
                            checked={evalData.complejaOps.includes(op)}
                            onCheckedChange={() => toggleOp(op)}
                          />
                          <label htmlFor={`op-${op}`} className="text-sm cursor-pointer">
                            {op}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <RadioGroup
                    value={evalData.complejaNivel?.toString() ?? ''}
                    onValueChange={(v) => set('complejaNivel', parseInt(v))}
                    className="grid grid-cols-3 gap-3"
                  >
                    <OpcionRadio id="o-15" value="15" label="Alta experiencia" badge="15 pts" />
                    <OpcionRadio id="o-8" value="8" label="Experiencia media" badge="8 pts" />
                    <OpcionRadio id="o-3" value="3" label="Experiencia baja" badge="3 pts" />
                  </RadioGroup>
                </div>
              </CriterioBloque>

              <Separator />

              {/* 5. CAPACIDAD OPERATIVA */}
              <CriterioBloque
                numero={5}
                nombre="Capacidad Operativa"
                pts={evalData.capacidad}
                maxPts={10}
                icon={<Users className="h-5 w-5 text-cyan-500" />}
                tooltip="Personas jurídicas típicamente tienen mayor capacidad operativa. Ajustable manualmente."
                autosugerido
              >
                <RadioGroup
                  value={evalData.capacidad?.toString() ?? ''}
                  onValueChange={(v) => set('capacidad', parseInt(v))}
                  className="grid grid-cols-2 gap-3"
                >
                  <OpcionRadio id="ca-10" value="10" label="Empresa / Equipo completo (Jurídica)" badge="10 pts" />
                  <OpcionRadio id="ca-5" value="5" label="Persona natural con soporte parcial" badge="5 pts" />
                </RadioGroup>
              </CriterioBloque>

              <Separator />

              {/* 6. PROPUESTA TÉCNICA */}
              <CriterioBloque
                numero={6}
                nombre="Propuesta Técnica"
                pts={evalData.tecnica}
                maxPts={10}
                icon={<FileText className="h-5 w-5 text-indigo-500" />}
                tooltip="Claridad, profundidad y alineación del plan de trabajo con las necesidades específicas del conjunto."
              >
                <RadioGroup
                  value={evalData.tecnica?.toString() ?? ''}
                  onValueChange={(v) => set('tecnica', parseInt(v))}
                  className="grid grid-cols-2 gap-3"
                >
                  <OpcionRadio id="t-10" value="10" label="Clara, estructurada y alineada al conjunto" badge="10 pts" />
                  <OpcionRadio id="t-5" value="5" label="Genérica o poco detallada" badge="5 pts" />
                </RadioGroup>
              </CriterioBloque>

              <Separator />

              {/* 7. REFERENCIAS */}
              <CriterioBloque
                numero={7}
                nombre="Referencias"
                pts={evalData.referencias}
                maxPts={5}
                icon={<Star className="h-5 w-5 text-yellow-500" />}
                tooltip="Referencias comerciales o de conjuntos administrados anteriormente, contactables y verificables."
              >
                <RadioGroup
                  value={evalData.referencias?.toString() ?? ''}
                  onValueChange={(v) => set('referencias', parseInt(v))}
                  className="grid grid-cols-2 gap-3"
                >
                  <OpcionRadio id="r-5" value="5" label="Verificadas y positivas" badge="5 pts" />
                  <OpcionRadio id="r-2" value="2" label="Débiles o no verificables" badge="2 pts" />
                </RadioGroup>
              </CriterioBloque>

              <Separator />

              {/* 8. PROPUESTA ECONÓMICA */}
              <CriterioBloque
                numero={8}
                nombre="Propuesta Económica"
                pts={evalData.economica}
                maxPts={5}
                icon={<Banknote className="h-5 w-5 text-emerald-500" />}
                tooltip="Relación calidad-precio: honorarios competitivos y justificados con el alcance de los servicios."
              >
                <RadioGroup
                  value={evalData.economica?.toString() ?? ''}
                  onValueChange={(v) => set('economica', parseInt(v))}
                  className="grid grid-cols-2 gap-3"
                >
                  <OpcionRadio id="e-5" value="5" label="Competitiva y justificada con el alcance" badge="5 pts" />
                  <OpcionRadio id="e-2" value="2" label="Solo económica sin justificación técnica" badge="2 pts" />
                </RadioGroup>
              </CriterioBloque>

            </div>
          </ScrollArea>

          {/* Sidebar: puntaje en vivo */}
          <aside className="w-72 border-l flex flex-col p-6 gap-5 bg-muted/10 shrink-0">

            {/* Score total */}
            <div className="space-y-3">
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                Puntaje en vivo
              </p>
              <div className="text-center py-2">
                <span className="text-6xl font-black text-primary tabular-nums">{total}</span>
                <span className="text-xl text-muted-foreground">/100</span>
              </div>
              <Progress value={Math.min(total, 100)} className="h-3" />
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
              {DESGLOSE.map(({ key, label, max }) => {
                const val = evalData[key] as number | null
                return (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground truncate mr-2">{label}</span>
                    <span className={`tabular-nums shrink-0 ${val !== null ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {val !== null ? val : '–'}/{max}
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
                { label: 'Destacado', min: '≥85', cls: 'text-green-600', i: 0 },
                { label: 'Apto', min: '≥70', cls: 'text-yellow-600', i: 1 },
                { label: 'Condicionado', min: '≥55', cls: 'text-orange-500', i: 2 },
                { label: 'No Apto', min: '<55', cls: 'text-red-600', i: 3 },
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

            {/* Acciones */}
            <div className="mt-auto space-y-3">
              {error && (
                <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {!completo && (
                <p className="text-xs text-muted-foreground text-center">
                  Selecciona todos los criterios para habilitar el guardado.
                </p>
              )}
              <Button
                className="w-full gap-2"
                disabled={!completo || guardando}
                onClick={handleGuardar}
              >
                {guardando
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />
                }
                {guardando ? 'Guardando...' : 'Guardar Calificación'}
              </Button>
            </div>

          </aside>
        </div>
      </SheetContent>
    </Sheet>
  )
}
