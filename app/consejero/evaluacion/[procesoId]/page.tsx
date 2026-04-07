'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  GraduationCap,
  DollarSign,
  ClipboardCheck,
  Download,
  Eye,
  Building2,
  Calendar,
  Users,
  Phone,
  Mail,
  MapPin,
  Vote,
  X,
  Loader2,
} from 'lucide-react'
import type { Criterio } from '@/lib/types/index'

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface PropuestaResumen {
  id: string
  razon_social: string
  tipo_persona: 'juridica' | 'natural'
  nit_cedula: string
  representante_legal?: string
  anios_experiencia: number
  unidades_administradas: number
  valor_honorarios?: number
  telefono?: string
  email?: string
  direccion?: string
  observaciones?: string
}

interface CriterioConfig extends Criterio {
  valor_minimo?: number
  valor_maximo?: number
}

interface DocumentoResumen {
  id: string
  propuesta_id: string
  nombre: string
  tipo: string
  estado: string
  archivo_url?: string | null
  categoria?: string
}

interface ConsejeroPerfil {
  id: string
  nombre_completo: string
  cargo: string
}

interface EvaluacionDB {
  propuesta_id: string
  criterio_id: string
  valor: number
}

type EvaluacionesState = Record<string, Record<string, number>>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEvaluacionesState(rows: EvaluacionDB[]): EvaluacionesState {
  return rows.reduce<EvaluacionesState>((acc, ev) => {
    if (!acc[ev.propuesta_id]) acc[ev.propuesta_id] = {}
    acc[ev.propuesta_id][ev.criterio_id] = ev.valor
    return acc
  }, {})
}

function isPropuestaCompleta(
  propuestaId: string,
  criterios: CriterioConfig[],
  evaluaciones: EvaluacionesState
): boolean {
  return criterios.every((c) => evaluaciones[propuestaId]?.[c.id] !== undefined)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function categorizarDocumentos(docs: DocumentoResumen[]) {
  const categorias: Record<string, DocumentoResumen[]> = {
    certificados: [],
    referencias: [],
    financiero: [],
    legal: [],
    otros: [],
  }
  
  docs.forEach(doc => {
    const tipo = doc.tipo?.toLowerCase() || ''
    const nombre = doc.nombre?.toLowerCase() || ''
    
    if (tipo.includes('certificacion') || nombre.includes('certificado') || nombre.includes('laboral')) {
      categorias.certificados.push(doc)
    } else if (tipo.includes('referencia') || nombre.includes('referencia') || nombre.includes('recomendacion')) {
      categorias.referencias.push(doc)
    } else if (tipo.includes('financiero') || nombre.includes('propuesta') || nombre.includes('honorarios')) {
      categorias.financiero.push(doc)
    } else if (tipo.includes('legal') || tipo.includes('camara') || tipo.includes('rut')) {
      categorias.legal.push(doc)
    } else {
      categorias.otros.push(doc)
    }
  })
  
  return categorias
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PaginaEvaluacion() {
  const params = useParams()
  const router = useRouter()
  const procesoId = params.procesoId as string

  const [propuestas, setPropuestas] = useState<PropuestaResumen[]>([])
  const [criterios, setCriterios] = useState<CriterioConfig[]>([])
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionesState>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentos, setDocumentos] = useState<DocumentoResumen[]>([])
  const [consejero, setConsejero] = useState<ConsejeroPerfil | null>(null)
  const [activeTab, setActiveTab] = useState('evaluacion')
  const [pdfPreview, setPdfPreview] = useState<{ url: string; nombre: string } | null>(null)

  const fetchDatos = useCallback(async () => {
    try {
      const res = await fetch(`/api/evaluacion/datos?proceso_id=${procesoId}`)

      if (!res.ok) {
        const { error: msg } = await res.json()
        setError(msg ?? 'Error al cargar los datos')
        return
      }

      const {
        propuestas: props,
        criterios: crits,
        evaluaciones: evDB,
        documentos: docs,
        consejero: consejeroActual,
        ya_voto,
      } = await res.json()

      if (ya_voto) {
        router.replace('/consejero/gracias')
        return
      }

      setPropuestas(props)
      setCriterios(crits)
      setDocumentos(docs ?? [])
      setConsejero(consejeroActual ?? null)

      const estado = buildEvaluacionesState(evDB)
      setEvaluaciones(estado)

      const primeraSin = (props as PropuestaResumen[]).findIndex(
        (p) => !isPropuestaCompleta(p.id, crits, estado)
      )
      setCurrentIndex(primeraSin === -1 ? Math.max(0, props.length - 1) : primeraSin)
    } catch (err) {
      console.error('[evaluacion] fetch error:', err)
      setError('Error de conexion')
    } finally {
      setLoading(false)
    }
  }, [procesoId, router])

  useEffect(() => {
    fetchDatos()
  }, [fetchDatos])

  const handleEvaluacion = (criterioId: string, valor: number) => {
    const propuestaId = propuestas[currentIndex].id
    setEvaluaciones((prev) => ({
      ...prev,
      [propuestaId]: { ...(prev[propuestaId] ?? {}), [criterioId]: valor },
    }))
  }

  const handleGuardar = async () => {
    const propuesta = propuestas[currentIndex]
    const vals = evaluaciones[propuesta.id] ?? {}
    const items = criterios.map((c) => ({ criterio_id: c.id, valor: vals[c.id] }))

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/evaluacion/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proceso_id: procesoId,
          propuesta_id: propuesta.id,
          items,
        }),
      })

      if (!res.ok) {
        const { error: msg } = await res.json()
        setError(msg ?? 'Error al guardar')
        return
      }

      const { evaluacion_completa } = await res.json()

      if (currentIndex < propuestas.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setActiveTab('evaluacion')
        return
      }

      if (evaluacion_completa) {
        router.push(`/consejero/votacion/${procesoId}`)
        return
      }

      const primeraSin = propuestas.findIndex(
        (p) => !isPropuestaCompleta(p.id, criterios, evaluaciones)
      )
      if (primeraSin !== -1) {
        setCurrentIndex(primeraSin)
        setActiveTab('evaluacion')
      } else {
        router.push(`/consejero/votacion/${procesoId}`)
      }
    } catch (err) {
      console.error('[evaluacion] save error:', err)
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando evaluacion...</p>
        </div>
      </div>
    )
  }

  if (error && !propuestas.length) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="max-w-md mx-auto p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-2">Error al cargar</p>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/consejero">
            <Button>Volver al inicio</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (!propuestas.length || !criterios.length) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="max-w-md mx-auto p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-2">Proceso no disponible</p>
          <p className="text-muted-foreground mb-6">
            No hay propuestas o criterios configurados para esta evaluacion.
          </p>
          <Link href="/consejero">
            <Button>Volver al inicio</Button>
          </Link>
        </Card>
      </div>
    )
  }

  // ─── Data Preparation ───────────────────────────────────────────────────────

  const propuesta = propuestas[currentIndex]
  const currentEvals = evaluaciones[propuesta.id] ?? {}
  const documentosPropuesta = documentos.filter((d) => d.propuesta_id === propuesta.id)
  const documentosCategorias = categorizarDocumentos(documentosPropuesta)
  const criteriosEvaluados = criterios.filter((c) => currentEvals[c.id] !== undefined).length
  const todasEvaluadas = criteriosEvaluados === criterios.length
  const esUltima = currentIndex === propuestas.length - 1
  const propuestasCompletadas = propuestas.filter((p) =>
    isPropuestaCompleta(p.id, criterios, evaluaciones)
  ).length
  const progreso = (propuestasCompletadas / propuestas.length) * 100

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      {/* Header Sticky */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold truncate">Evaluacion de Propuestas</h1>
              {consejero && (
                <p className="text-xs text-muted-foreground truncate">
                  {consejero.nombre_completo} - {consejero.cargo}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm hidden sm:block">
                <p className="font-medium">{currentIndex + 1} de {propuestas.length}</p>
                <p className="text-xs text-muted-foreground">{propuestasCompletadas} completadas</p>
              </div>
              <Badge variant={todasEvaluadas ? 'default' : 'secondary'} className="hidden sm:flex">
                {todasEvaluadas ? 'Listo' : 'Pendiente'}
              </Badge>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <Progress value={progreso} className="h-1.5" />
          </div>
          
          {/* Mini Navigation Pills - Mobile */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 sm:hidden">
            {propuestas.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setCurrentIndex(idx)}
                className={`flex-shrink-0 w-8 h-8 rounded-full text-xs font-medium transition-all ${
                  idx === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : isPropuestaCompleta(p.id, criterios, evaluaciones)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
        {/* Selector de Propuesta - Desktop */}
        <div className="hidden sm:flex gap-2 mb-6 overflow-x-auto pb-2">
          {propuestas.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setCurrentIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                idx === currentIndex
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : isPropuestaCompleta(p.id, criterios, evaluaciones)
                  ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {isPropuestaCompleta(p.id, criterios, evaluaciones) && (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span className="truncate max-w-[150px]">{p.razon_social}</span>
            </button>
          ))}
        </div>

        {/* Card Principal del Proveedor */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold truncate">{propuesta.razon_social}</h2>
                  <p className="text-sm text-muted-foreground">
                    {propuesta.tipo_persona === 'juridica' ? 'Persona Juridica' : 'Persona Natural'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isPropuestaCompleta(propuesta.id, criterios, evaluaciones) ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Evaluado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  {criteriosEvaluados}/{criterios.length} criterios
                </Badge>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-background/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Experiencia</span>
              </div>
              <p className="text-lg font-bold">{propuesta.anios_experiencia} anos</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Unidades</span>
              </div>
              <p className="text-lg font-bold">{propuesta.unidades_administradas.toLocaleString()}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 col-span-2">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Honorarios Mensuales</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {propuesta.valor_honorarios ? formatCurrency(propuesta.valor_honorarios) : 'Por definir'}
              </p>
            </div>
          </div>
        </Card>

        {/* Tabs de Contenido */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex h-auto p-1">
            <TabsTrigger value="evaluacion" className="gap-1.5 text-xs sm:text-sm py-2">
              <ClipboardCheck className="h-4 w-4 hidden sm:block" />
              <span>Evaluar</span>
              {!todasEvaluadas && (
                <span className="ml-1 text-[10px] bg-destructive/10 text-destructive px-1.5 rounded-full">
                  {criterios.length - criteriosEvaluados}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="financiero" className="gap-1.5 text-xs sm:text-sm py-2">
              <DollarSign className="h-4 w-4 hidden sm:block" />
              <span>Propuesta</span>
            </TabsTrigger>
            <TabsTrigger value="experiencia" className="gap-1.5 text-xs sm:text-sm py-2">
              <Briefcase className="h-4 w-4 hidden sm:block" />
              <span>Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="documentos" className="gap-1.5 text-xs sm:text-sm py-2">
              <FileText className="h-4 w-4 hidden sm:block" />
              <span>Docs</span>
              {documentosPropuesta.length > 0 && (
                <span className="ml-1 text-[10px] bg-muted px-1.5 rounded-full">
                  {documentosPropuesta.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Evaluacion por Criterios */}
          <TabsContent value="evaluacion" className="space-y-4 mt-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Criterios de Evaluacion
                </h3>
                <span className="text-sm text-muted-foreground">
                  {criteriosEvaluados} de {criterios.length} completados
                </span>
              </div>

              <div className="space-y-6">
                {criterios.map((criterio, idx) => {
                  const valorActual = currentEvals[criterio.id]
                  const evaluado = valorActual !== undefined
                  
                  return (
                    <div
                      key={criterio.id}
                      className={`rounded-xl border-2 p-4 transition-all ${
                        evaluado ? 'border-primary/30 bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            evaluado ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {evaluado ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{criterio.nombre}</h4>
                            {criterio.descripcion && (
                              <p className="text-sm text-muted-foreground mt-1">{criterio.descripcion}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">
                          {criterio.peso}%
                        </Badge>
                      </div>

                      {criterio.tipo === 'booleano' ? (
                        <div className="flex gap-3">
                          {[
                            { label: 'No cumple', valor: 0, icon: X },
                            { label: 'Cumple', valor: 1, icon: CheckCircle2 },
                          ].map(({ label, valor, icon: Icon }) => (
                            <button
                              key={label}
                              onClick={() => handleEvaluacion(criterio.id, valor)}
                              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                                valorActual === valor
                                  ? valor === 1
                                    ? 'bg-green-500 text-white shadow-md'
                                    : 'bg-destructive text-destructive-foreground shadow-md'
                                  : 'border-2 border-border bg-background hover:border-primary/50'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            {Array.from(
                              { length: (criterio.valor_maximo ?? 5) - (criterio.valor_minimo ?? 1) + 1 },
                              (_, i) => (criterio.valor_minimo ?? 1) + i
                            ).map((val) => (
                              <button
                                key={val}
                                onClick={() => handleEvaluacion(criterio.id, val)}
                                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                                  valorActual === val
                                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                                    : 'border-2 border-border bg-background hover:border-primary/50 hover:scale-102'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground px-1">
                            <span>Insuficiente</span>
                            <span>Excelente</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Propuesta Financiera */}
          <TabsContent value="financiero" className="space-y-4 mt-4">
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <DollarSign className="h-5 w-5 text-primary" />
                Propuesta Economica
              </h3>

              <div className="space-y-4">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Honorarios Mensuales Propuestos</p>
                  <p className="text-3xl sm:text-4xl font-bold text-primary">
                    {propuesta.valor_honorarios ? formatCurrency(propuesta.valor_honorarios) : 'Por definir'}
                  </p>
                  {propuesta.valor_honorarios && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Anual: {formatCurrency(propuesta.valor_honorarios * 12)}
                    </p>
                  )}
                </div>

                {documentosCategorias.financiero.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-3">Documentos de propuesta economica:</p>
                    <div className="space-y-2">
                      {documentosCategorias.financiero.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => doc.archivo_url && setPdfPreview({ url: doc.archivo_url, nombre: doc.nombre })}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                        >
                          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="flex-1 truncate">{doc.nombre}</span>
                          {doc.archivo_url ? (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin archivo</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {propuesta.observaciones && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Observaciones adicionales:</p>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                      {propuesta.observaciones}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Experiencia y Perfil */}
          <TabsContent value="experiencia" className="space-y-4 mt-4">
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <Briefcase className="h-5 w-5 text-primary" />
                Experiencia y Formacion
              </h3>

              <Accordion type="multiple" defaultValue={['experiencia', 'contacto']} className="space-y-2">
                <AccordionItem value="experiencia" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span>Experiencia Laboral</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="text-2xl font-bold text-primary">{propuesta.anios_experiencia}</p>
                          <p className="text-sm text-muted-foreground">Anos de experiencia</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="text-2xl font-bold text-primary">{propuesta.unidades_administradas.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">Unidades administradas</p>
                        </div>
                      </div>
                      
                      {documentosCategorias.certificados.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Certificados laborales:</p>
                          <div className="space-y-2">
                            {documentosCategorias.certificados.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => doc.archivo_url && setPdfPreview({ url: doc.archivo_url, nombre: doc.nombre })}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                              >
                                <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                                <span className="flex-1 truncate text-sm">{doc.nombre}</span>
                                {doc.archivo_url && <Eye className="h-4 w-4 text-muted-foreground" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="formacion" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span>Formacion Academica</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <p className="text-sm text-muted-foreground">
                        Consulte los documentos adjuntos para verificar titulos y certificaciones academicas.
                      </p>
                      {documentosCategorias.legal.length > 0 && (
                        <div className="space-y-2">
                          {documentosCategorias.legal.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => doc.archivo_url && setPdfPreview({ url: doc.archivo_url, nombre: doc.nombre })}
                              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                            >
                              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              <span className="flex-1 truncate text-sm">{doc.nombre}</span>
                              {doc.archivo_url && <Eye className="h-4 w-4 text-muted-foreground" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="referencias" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Referencias</span>
                      {documentosCategorias.referencias.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {documentosCategorias.referencias.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {documentosCategorias.referencias.length > 0 ? (
                        documentosCategorias.referencias.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => doc.archivo_url && setPdfPreview({ url: doc.archivo_url, nombre: doc.nombre })}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                          >
                            <FileText className="h-5 w-5 text-amber-600 flex-shrink-0" />
                            <span className="flex-1 truncate text-sm">{doc.nombre}</span>
                            {doc.archivo_url && <Eye className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No hay referencias registradas.</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="contacto" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>Informacion de Contacto</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {propuesta.representante_legal && (
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Representante Legal</p>
                            <p className="font-medium">{propuesta.representante_legal}</p>
                          </div>
                        </div>
                      )}
                      {propuesta.telefono && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Telefono</p>
                            <a href={`tel:${propuesta.telefono}`} className="font-medium text-primary hover:underline">
                              {propuesta.telefono}
                            </a>
                          </div>
                        </div>
                      )}
                      {propuesta.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <a href={`mailto:${propuesta.email}`} className="font-medium text-primary hover:underline truncate block max-w-[200px] sm:max-w-none">
                              {propuesta.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {propuesta.direccion && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Direccion</p>
                            <p className="font-medium">{propuesta.direccion}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">{propuesta.tipo_persona === 'juridica' ? 'NIT' : 'Cedula'}</p>
                          <p className="font-medium">{propuesta.nit_cedula}</p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </TabsContent>

          {/* Tab: Documentos */}
          <TabsContent value="documentos" className="space-y-4 mt-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Documentacion
                </h3>
                <Badge variant="secondary">{documentosPropuesta.length} archivos</Badge>
              </div>

              {documentosPropuesta.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay documentos registrados para esta propuesta.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Certificados Laborales */}
                  {documentosCategorias.certificados.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Certificados Laborales
                      </h4>
                      <div className="grid gap-2">
                        {documentosCategorias.certificados.map((doc) => (
                          <DocumentoCard key={doc.id} doc={doc} onPreview={setPdfPreview} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Referencias */}
                  {documentosCategorias.referencias.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Recomendaciones y Referencias
                      </h4>
                      <div className="grid gap-2">
                        {documentosCategorias.referencias.map((doc) => (
                          <DocumentoCard key={doc.id} doc={doc} onPreview={setPdfPreview} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Propuesta Financiera */}
                  {documentosCategorias.financiero.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Propuesta Financiera
                      </h4>
                      <div className="grid gap-2">
                        {documentosCategorias.financiero.map((doc) => (
                          <DocumentoCard key={doc.id} doc={doc} onPreview={setPdfPreview} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documentos Legales */}
                  {documentosCategorias.legal.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documentos Legales
                      </h4>
                      <div className="grid gap-2">
                        {documentosCategorias.legal.map((doc) => (
                          <DocumentoCard key={doc.id} doc={doc} onPreview={setPdfPreview} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Otros */}
                  {documentosCategorias.otros.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Otros Documentos
                      </h4>
                      <div className="grid gap-2">
                        {documentosCategorias.otros.map((doc) => (
                          <DocumentoCard key={doc.id} doc={doc} onPreview={setPdfPreview} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Error Alert */}
        {error && (
          <Card className="mt-4 border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border p-4 lg:relative lg:bg-transparent lg:border-0 lg:p-0 lg:mt-6">
        <div className="mx-auto max-w-5xl flex gap-3">
          {currentIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setCurrentIndex(currentIndex - 1)
                setActiveTab('evaluacion')
              }}
              disabled={saving}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
          )}
          
          <Button
            onClick={handleGuardar}
            disabled={!todasEvaluadas || saving}
            className="flex-1 gap-2"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : esUltima ? (
              <>
                <Vote className="h-4 w-4" />
                Guardar e Ir a Votar
              </>
            ) : (
              <>
                Guardar y Siguiente
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={!!pdfPreview} onOpenChange={() => setPdfPreview(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b flex-shrink-0">
            <DialogTitle className="truncate pr-8">{pdfPreview?.nombre}</DialogTitle>
            <DialogDescription className="flex gap-2">
              <a
                href={pdfPreview?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Eye className="h-4 w-4" />
                Abrir en nueva pestana
              </a>
              <a
                href={pdfPreview?.url}
                download
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                Descargar
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {pdfPreview?.url && (
              <iframe
                src={pdfPreview.url}
                className="w-full h-full border-0"
                title={pdfPreview.nombre}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Componente Documento Card ────────────────────────────────────────────────

function DocumentoCard({
  doc,
  onPreview,
}: {
  doc: DocumentoResumen
  onPreview: (data: { url: string; nombre: string }) => void
}) {
  const tieneArchivo = !!doc.archivo_url
  const estadoColor =
    doc.estado === 'completo'
      ? 'text-green-600 bg-green-500/10'
      : doc.estado === 'vencido'
      ? 'text-destructive bg-destructive/10'
      : 'text-amber-600 bg-amber-500/10'

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all group">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{doc.nombre}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{doc.tipo}</span>
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${estadoColor}`}>
            {doc.estado}
          </Badge>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {tieneArchivo ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPreview({ url: doc.archivo_url!, nombre: doc.nombre })}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={doc.archivo_url!} download>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground px-2">Sin archivo</span>
        )}
      </div>
    </div>
  )
}
