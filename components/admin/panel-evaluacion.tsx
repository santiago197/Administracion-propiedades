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
} from 'lucide-react'
import type { Propuesta, ClasificacionPropuesta } from '@/lib/types/index'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type EvalData = {
  expPH: number | null               // 20 pts — Experiencia en propiedad horizontal
  expDensidad: number | null         // 15 pts — Experiencia en conjuntos de alta densidad
  capacidadOperativa: number | null  // 15 pts — Capacidad operativa / Equipo de apoyo
  propuestaTecnica: number | null    // 15 pts — Propuesta técnica / Plan de gestión
  formacionAcademica: number | null  // 10 pts — Formación académica
  conocimientosNormativos: number | null // 10 pts — Conocimientos normativos y técnicos
  referencias: number | null         //  5 pts — Referencias verificables
  economica: number | null           //  5 pts — Propuesta económica
  competenciasPersonales: number | null //  5 pts — Competencias personales
}

const CLAS_STYLE: Record<ClasificacionPropuesta, { label: string; cls: string }> = {
  destacado:    { label: 'Cumple',                    cls: 'bg-green-600 text-white' },
  apto:         { label: 'Cumple, con observaciones', cls: 'bg-yellow-500 text-white' },
  condicionado: { label: 'Cumple, con observaciones', cls: 'bg-orange-500 text-white' },
  no_apto:      { label: 'Rechazado',                 cls: 'bg-red-600 text-white' },
}

const DESGLOSE: { key: keyof EvalData; label: string; max: number }[] = [
  { key: 'expPH',                  label: 'Exp. prop. horizontal',  max: 20 },
  { key: 'expDensidad',            label: 'Exp. alta densidad',     max: 15 },
  { key: 'capacidadOperativa',     label: 'Capacidad operativa',    max: 15 },
  { key: 'propuestaTecnica',       label: 'Propuesta técnica',      max: 15 },
  { key: 'formacionAcademica',     label: 'Formación académica',    max: 10 },
  { key: 'conocimientosNormativos',label: 'Conoc. normativos',      max: 10 },
  { key: 'referencias',            label: 'Referencias',            max:  5 },
  { key: 'economica',              label: 'Prop. económica',        max:  5 },
  { key: 'competenciasPersonales', label: 'Comp. personales',       max:  5 },
]

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

function sumarPuntos(d: EvalData): number {
  return (
    (d.expPH                  ?? 0) +
    (d.expDensidad             ?? 0) +
    (d.capacidadOperativa      ?? 0) +
    (d.propuestaTecnica        ?? 0) +
    (d.formacionAcademica      ?? 0) +
    (d.conocimientosNormativos ?? 0) +
    (d.referencias             ?? 0) +
    (d.economica               ?? 0) +
    (d.competenciasPersonales  ?? 0)
  )
}

function getClasificacion(score: number): ClasificacionPropuesta {
  if (score === 100) return 'destacado'
  if (score >= 60) return 'apto'
  return 'no_apto'
}

function isComplete(d: EvalData): boolean {
  return (
    d.expPH                  !== null &&
    d.expDensidad             !== null &&
    d.capacidadOperativa      !== null &&
    d.propuestaTecnica        !== null &&
    d.formacionAcademica      !== null &&
    d.conocimientosNormativos !== null &&
    d.referencias             !== null &&
    d.economica               !== null &&
    d.competenciasPersonales  !== null
  )
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
  return (
    <RadioGroup
      value={value?.toString() ?? ''}
      onValueChange={(v) => onChange(parseInt(v))}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      <div className="flex items-center justify-between border rounded-md px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
        <div className="flex items-center gap-3">
          <RadioGroupItem value={max.toString()} id={`${field}-si`} />
          <Label htmlFor={`${field}-si`} className="cursor-pointer font-normal text-sm">
            Sí cumple
          </Label>
        </div>
        <span className="text-xs text-muted-foreground font-medium ml-3 shrink-0">{max} pts</span>
      </div>
      <div className="flex items-center justify-between border rounded-md px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer has-[[data-state=checked]]:border-destructive has-[[data-state=checked]]:bg-destructive/5">
        <div className="flex items-center gap-3">
          <RadioGroupItem value="0" id={`${field}-no`} />
          <Label htmlFor={`${field}-no`} className="cursor-pointer font-normal text-sm">
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
    expPH: null,
    expDensidad: null,
    capacidadOperativa: null,
    propuestaTecnica: null,
    formacionAcademica: null,
    conocimientosNormativos: null,
    referencias: null,
    economica: null,
    competenciasPersonales: null,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-sugerencias al abrir el panel con una propuesta distinta
  useEffect(() => {
    if (!propuesta) return
    setEvalData({
      expPH:                  propuesta.anios_experiencia >= 5 ? 20 : null,
      expDensidad:            propuesta.unidades_administradas > 500 ? 15 : null,
      capacidadOperativa:     null,
      propuestaTecnica:       null,
      formacionAcademica:     null,
      conocimientosNormativos:null,
      referencias:            null,
      economica:              null,
      competenciasPersonales: null,
    })
    setError(null)
  }, [propuesta?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = sumarPuntos(evalData)
  const clasificacion = getClasificacion(total)
  const clasStyle = CLAS_STYLE[clasificacion]
  const completo = isComplete(evalData)

  const set = (field: keyof EvalData, value: number) =>
    setEvalData((prev) => ({ ...prev, [field]: value }))

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

  const currentClasIndex = total === 100 ? 0 : total >= 60 ? 1 : 2

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl p-0 gap-0 flex flex-col"
      >
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
          <span className="text-sm text-muted-foreground">/100</span>
          <Progress value={Math.min(total, 100)} className="flex-1 h-2" />
          <div className={`py-1 px-2.5 rounded text-xs font-semibold shrink-0 ${clasStyle.cls}`}>
            {clasStyle.label}
          </div>
        </div>

        {/* Cuerpo: criterios + sidebar */}
        <div className="flex flex-1 overflow-hidden">

          {/* Columna de criterios */}
          <ScrollArea className="flex-1">
            <div className="px-4 sm:px-8 py-5 sm:py-7 space-y-6 sm:space-y-8">

              {/* 1. EXPERIENCIA EN PROPIEDAD HORIZONTAL */}
              <CriterioBloque
                numero={1}
                nombre="Experiencia en Propiedad Horizontal"
                pts={evalData.expPH}
                maxPts={20}
                icon={<Building2 className="h-5 w-5 text-blue-500" />}
                tooltip="Mínimo 5 años certificados en administración de propiedad horizontal."
                autosugerido
              >
                <OpcionBinaria field="expPH" max={20} value={evalData.expPH} onChange={(v) => set('expPH', v)} />
              </CriterioBloque>

              <Separator />

              {/* 2. EXPERIENCIA EN CONJUNTOS DE ALTA DENSIDAD */}
              <CriterioBloque
                numero={2}
                nombre="Experiencia en Conjuntos de Alta Densidad"
                pts={evalData.expDensidad}
                maxPts={15}
                icon={<Building2 className="h-5 w-5 text-purple-500" />}
                tooltip="Experiencia en conjuntos con más de 500 unidades, con retos de seguridad, convivencia y parqueaderos."
                autosugerido
              >
                <OpcionBinaria field="expDensidad" max={15} value={evalData.expDensidad} onChange={(v) => set('expDensidad', v)} />
              </CriterioBloque>

              <Separator />

              {/* 3. CAPACIDAD OPERATIVA / EQUIPO DE APOYO */}
              <CriterioBloque
                numero={3}
                nombre="Capacidad Operativa / Equipo de Apoyo"
                pts={evalData.capacidadOperativa}
                maxPts={15}
                icon={<Users className="h-5 w-5 text-cyan-500" />}
                tooltip="Recursos humanos y técnicos disponibles para la gestión del conjunto."
              >
                <OpcionBinaria field="capacidadOperativa" max={15} value={evalData.capacidadOperativa} onChange={(v) => set('capacidadOperativa', v)} />
              </CriterioBloque>

              <Separator />

              {/* 4. PROPUESTA TÉCNICA / PLAN DE GESTIÓN */}
              <CriterioBloque
                numero={4}
                nombre="Propuesta Técnica / Plan de Gestión"
                pts={evalData.propuestaTecnica}
                maxPts={15}
                icon={<ClipboardList className="h-5 w-5 text-indigo-500" />}
                tooltip="Claridad, organización y viabilidad del plan administrativo presentado."
              >
                <OpcionBinaria field="propuestaTecnica" max={15} value={evalData.propuestaTecnica} onChange={(v) => set('propuestaTecnica', v)} />
              </CriterioBloque>

              <Separator />

              {/* 5. FORMACIÓN ACADÉMICA */}
              <CriterioBloque
                numero={5}
                nombre="Formación Académica"
                pts={evalData.formacionAcademica}
                maxPts={10}
                icon={<GraduationCap className="h-5 w-5 text-amber-500" />}
                tooltip="Profesional en áreas administrativas, contables, económicas, ingeniería, derecho o afines."
              >
                <OpcionBinaria field="formacionAcademica" max={10} value={evalData.formacionAcademica} onChange={(v) => set('formacionAcademica', v)} />
              </CriterioBloque>

              <Separator />

              {/* 6. CONOCIMIENTOS NORMATIVOS Y TÉCNICOS */}
              <CriterioBloque
                numero={6}
                nombre="Conocimientos Normativos y Técnicos"
                pts={evalData.conocimientosNormativos}
                maxPts={10}
                icon={<Scale className="h-5 w-5 text-green-500" />}
                tooltip="Ley 675, Ley 1801, SST, manejo presupuestal y financiero."
              >
                <OpcionBinaria field="conocimientosNormativos" max={10} value={evalData.conocimientosNormativos} onChange={(v) => set('conocimientosNormativos', v)} />
              </CriterioBloque>

              <Separator />

              {/* 7. REFERENCIAS VERIFICABLES */}
              <CriterioBloque
                numero={7}
                nombre="Referencias Verificables"
                pts={evalData.referencias}
                maxPts={5}
                icon={<Star className="h-5 w-5 text-yellow-500" />}
                tooltip="Calidad y confiabilidad de las referencias presentadas."
              >
                <OpcionBinaria field="referencias" max={5} value={evalData.referencias} onChange={(v) => set('referencias', v)} />
              </CriterioBloque>

              <Separator />

              {/* 8. PROPUESTA ECONÓMICA */}
              <CriterioBloque
                numero={8}
                nombre="Propuesta Económica"
                pts={evalData.economica}
                maxPts={5}
                icon={<Banknote className="h-5 w-5 text-emerald-500" />}
                tooltip="Honorarios y condiciones económicas ofrecidas."
              >
                <OpcionBinaria field="economica" max={5} value={evalData.economica} onChange={(v) => set('economica', v)} />
              </CriterioBloque>

              <Separator />

              {/* 9. COMPETENCIAS PERSONALES */}
              <CriterioBloque
                numero={9}
                nombre="Competencias Personales"
                pts={evalData.competenciasPersonales}
                maxPts={5}
                icon={<Heart className="h-5 w-5 text-rose-500" />}
                tooltip="Liderazgo, ética, comunicación y manejo de conflictos."
              >
                <OpcionBinaria field="competenciasPersonales" max={5} value={evalData.competenciasPersonales} onChange={(v) => set('competenciasPersonales', v)} />
              </CriterioBloque>

            </div>
          </ScrollArea>

          {/* Sidebar: puntaje en vivo — oculto en mobile */}
          <aside className="hidden lg:flex w-72 border-l flex-col p-6 gap-5 bg-muted/10 shrink-0">

            {/* Score total */}
            <div className="space-y-3">
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
                Puntaje en vivo
              </p>
              <div className="text-center py-2">
                <span className="text-5xl font-black text-primary tabular-nums">{total}</span>
                <span className="text-lg text-muted-foreground">/100</span>
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
                { label: 'Cumple',                    min: '100',  cls: 'text-green-600',  i: 0 },
                { label: 'Cumple, con observaciones', min: '≥60',  cls: 'text-yellow-600', i: 1 },
                { label: 'Rechazado',                 min: '<60',  cls: 'text-red-600',    i: 2 },
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
