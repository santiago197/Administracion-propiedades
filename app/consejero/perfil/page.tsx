'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Eye,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Vote,
  Building2,
  Users,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Download,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Criterio {
  id: string
  nombre: string
  descripcion?: string | null
  peso: number
  tipo?: string
  valor_minimo?: number
  valor_maximo?: number
  orden?: number
}

interface Propuesta {
  id: string
  razon_social: string
  tipo_persona: 'juridica' | 'natural'
  nit_cedula: string
  representante_legal?: string | null
  anios_experiencia: number
  unidades_administradas: number
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  valor_honorarios?: number | null
  estado: string
  cumple_requisitos_legales?: boolean | null
  observaciones_legales?: string | null
  puntaje_evaluacion?: number | null
}

interface Documento {
  id: string
  propuesta_id: string
  tipo: string
  nombre: string
  estado: string
  es_obligatorio: boolean
  fecha_vencimiento?: string | null
  archivo_url?: string | null
}

type EvaluacionesState = Record<string, Record<string, number>>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(valor?: number | null) {
  if (!valor) return 'Sin dato'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

function formatFecha(value?: string | null) {
  if (!value) return 'Sin fecha'
  try {
    return new Date(value).toLocaleDateString('es-CO')
  } catch {
    return value
  }
}

const TIPO_DOCUMENTO: Record<string, string> = {
  camara_comercio: 'Cámara de Comercio',
  rut: 'RUT',
  rut_nat: 'RUT (Persona Natural)',
  cedula: 'Cédula',
  poliza: 'Póliza',
  estados_financieros: 'Estados Financieros',
  certificacion: 'Certificado de Experiencia',
  certificacion_sst: 'Certificación SST',
  parafiscales: 'Certificación Parafiscales',
  referencia: 'Referencia / Carta de recomendación',
  hoja_vida: 'Hoja de Vida',
  propuesta_gestion: 'Propuesta de Gestión',
  propuesta_economica: 'Propuesta Económica',
  antecedentes: 'Antecedentes (disciplinarios / judiciales)',
  medidas_correctivas: 'Medidas Correctivas',
  redam: 'REDAM',
}

function mapTipoDoc(tipo: string) {
  return TIPO_DOCUMENTO[tipo] ?? tipo.replace(/_/g, ' ')
}

function isPropuestaCompleta(
  propuestaId: string,
  criterios: Criterio[],
  evaluaciones: EvaluacionesState
): boolean {
  return criterios.length > 0 && criterios.every((c) => evaluaciones[propuestaId]?.[c.id] !== undefined)
}

// ─── Sub-componente: Panel de evaluación de una propuesta ─────────────────────

function PanelEvaluacion({
  propuesta,
  criterios,
  evaluaciones,
  onCalificar,
  saving,
}: {
  propuesta: Propuesta
  criterios: Criterio[]
  evaluaciones: EvaluacionesState
  onCalificar: (propuestaId: string, criterioId: string, valor: number) => void
  saving: boolean
}) {
  const puntosEvaluados = criterios.filter(
    (c) => evaluaciones[propuesta.id]?.[c.id] !== undefined
  ).length

  if (criterios.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No hay criterios de evaluación configurados para este proceso.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {puntosEvaluados} de {criterios.length} criterios calificados
        </p>
        {saving && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando...
          </span>
        )}
        {puntosEvaluados === criterios.length && !saving && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Evaluación completa
          </span>
        )}
      </div>

      <div className="space-y-5">
        {criterios.map((criterio) => {
          const valorActual = evaluaciones[propuesta.id]?.[criterio.id]
          return (
            <div key={criterio.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{criterio.nombre}</p>
                  {criterio.descripcion && (
                    <p className="text-xs text-muted-foreground mt-0.5">{criterio.descripcion}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Peso: {criterio.peso}%
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => onCalificar(propuesta.id, criterio.id, val)}
                    className={`h-9 w-9 rounded-md border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                      valorActual === val
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {val}
                  </button>
                ))}
                <span className="self-center text-xs text-muted-foreground ml-1">
                  {valorActual !== undefined
                    ? val_label(valorActual)
                    : 'Sin calificar'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function val_label(v: number) {
  return ['', 'Muy bajo', 'Bajo', 'Regular', 'Bueno', 'Excelente'][v] ?? ''
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PerfilConsejeroPage() {
  const router = useRouter()

  // Datos de la API de perfil
  const [consejero, setConsejero] = useState<{
    id: string; nombre_completo: string; cargo: string
    torre?: string | null; apartamento: string
    email?: string | null; telefono?: string | null
  } | null>(null)
  const [proceso, setProceso] = useState<{ id: string; nombre: string; estado: string } | null>(null)
  const [progreso, setProgreso] = useState({ propuestas_requeridas: 0, propuestas_evaluadas: 0, evaluacion_completa: false, ya_voto: false, fecha_voto: null as string | null })
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [mensajeProceso, setMensajeProceso] = useState<string | null>(null)

  // Datos de la API de evaluación
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionesState>({})
  const [yaVoto, setYaVoto] = useState(false)

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({})
  const [docEnVista, setDocEnVista] = useState<Documento | null>(null)
  const [votoSeleccionado, setVotoSeleccionado] = useState<string | null>(null)
  const [confirmVoto, setConfirmVoto] = useState(false)
  const [votando, setVotando] = useState(false)
  const [errorVoto, setErrorVoto] = useState<string | null>(null)

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    const cargar = async () => {
      try {
        const perfilRes = await fetch('/api/consejero/perfil')
        if (!perfilRes.ok) {
          const body = await perfilRes.json()
          throw new Error(body.error ?? 'No fue posible cargar el perfil')
        }
        const perfil = await perfilRes.json()
        setConsejero(perfil.consejero)
        setProceso(perfil.proceso)
        setProgreso(perfil.progreso)
        setPropuestas(perfil.propuestas ?? [])
        setDocumentos(perfil.documentos ?? [])
        setMensajeProceso(perfil.mensaje ?? null)

        if (perfil.proceso?.id) {
          const evalRes = await fetch(`/api/evaluacion/datos?proceso_id=${perfil.proceso.id}`)
          if (evalRes.ok) {
            const evalData = await evalRes.json()
            setCriterios(evalData.criterios ?? [])
            setYaVoto(evalData.ya_voto ?? false)
            const estado: EvaluacionesState = (evalData.evaluaciones ?? []).reduce(
              (acc: EvaluacionesState, ev: { propuesta_id: string; criterio_id: string; valor: number }) => {
                if (!acc[ev.propuesta_id]) acc[ev.propuesta_id] = {}
                acc[ev.propuesta_id][ev.criterio_id] = ev.valor
                return acc
              },
              {}
            )
            setEvaluaciones(estado)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  // ── Calificar criterio ─────────────────────────────────────────────────────

  const handleCalificar = useCallback(
    async (propuestaId: string, criterioId: string, valor: number) => {
      setEvaluaciones((prev) => ({
        ...prev,
        [propuestaId]: { ...(prev[propuestaId] ?? {}), [criterioId]: valor },
      }))

      setSavingMap((prev) => ({ ...prev, [propuestaId]: true }))
      try {
        const criteriosActuales = criterios
        const evActuales = { ...(evaluaciones[propuestaId] ?? {}), [criterioId]: valor }
        const items = criteriosActuales
          .filter((c) => evActuales[c.id] !== undefined)
          .map((c) => ({ criterio_id: c.id, valor: evActuales[c.id] }))

        if (!proceso?.id) return

        await fetch('/api/evaluacion/guardar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proceso_id: proceso.id, propuesta_id: propuestaId, items }),
        })

        // Actualizar progreso local
        setProgreso((prev) => {
          const evaluadas = propuestas.filter((p) =>
            isPropuestaCompleta(p.id === propuestaId ? propuestaId : p.id, criteriosActuales, {
              ...evaluaciones,
              [propuestaId]: evActuales,
            })
          ).length
          return {
            ...prev,
            propuestas_evaluadas: evaluadas,
            evaluacion_completa: evaluadas >= prev.propuestas_requeridas,
          }
        })
      } finally {
        setSavingMap((prev) => ({ ...prev, [propuestaId]: false }))
      }
    },
    [criterios, evaluaciones, proceso?.id, propuestas]
  )

  // ── Votar ──────────────────────────────────────────────────────────────────

  const handleVotar = async () => {
    if (!votoSeleccionado || !proceso?.id) return
    setVotando(true)
    setErrorVoto(null)
    try {
      const res = await fetch('/api/evaluacion/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proceso_id: proceso.id, propuesta_id: votoSeleccionado }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        setErrorVoto(msg ?? 'Error al registrar el voto')
        return
      }
      router.push('/consejero/gracias')
    } catch {
      setErrorVoto('Error de conexión')
    } finally {
      setVotando(false)
      setConfirmVoto(false)
    }
  }

  const cerrarSesion = async () => {
    await fetch('/api/consejero/logout', { method: 'POST' })
    router.push('/consejero')
  }

  // ── Derivados ──────────────────────────────────────────────────────────────

  const docsDeProps = (propuestaId: string) =>
    documentos.filter((d) => d.propuesta_id === propuestaId)

  const totalEvaluadas = propuestas.filter((p) =>
    isPropuestaCompleta(p.id, criterios, evaluaciones)
  ).length

  const todasEvaluadas = criterios.length > 0 && totalEvaluadas === propuestas.length && propuestas.length > 0

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-4">
          <Card className="h-24 animate-pulse bg-card/50" />
          <Card className="h-32 animate-pulse bg-card/50" />
          <Card className="h-48 animate-pulse bg-card/50" />
        </main>
      </div>
    )
  }

  if (error || !consejero) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="p-8 text-center max-w-md w-full">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="font-semibold text-foreground mb-1">No se pudo cargar el perfil</p>
          <p className="text-sm text-muted-foreground">{error ?? 'Sesión no válida'}</p>
          <Link href="/consejero">
            <Button className="mt-5">Volver al ingreso</Button>
          </Link>
        </Card>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

        {/* ── Tarjeta consejero ── */}
        <Card className="border border-border/50 bg-card/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Consejero</p>
              <h1 className="text-xl font-bold text-foreground">{consejero.nombre_completo}</h1>
              <p className="text-sm text-muted-foreground mt-1 capitalize">
                {consejero.cargo}
                {consejero.torre ? ` · Torre ${consejero.torre}` : ''}
                {` · Apto ${consejero.apartamento}`}
              </p>
              {(consejero.email || consejero.telefono) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {consejero.email}{consejero.email && consejero.telefono ? ' · ' : ''}{consejero.telefono}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground shrink-0" onClick={cerrarSesion}>
              Cerrar sesión
            </Button>
          </div>
        </Card>

        {/* ── Proceso y progreso ── */}
        {proceso ? (
          <Card className="border border-border/50 bg-card/50 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Proceso activo</p>
                <p className="text-lg font-semibold text-foreground">{proceso.nombre}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Evaluados</p>
                  <p className="font-semibold">{totalEvaluadas} / {propuestas.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Voto</p>
                  <p className="font-semibold">{yaVoto ? 'Registrado' : 'Pendiente'}</p>
                </div>
              </div>
            </div>
            <Progress
              value={propuestas.length > 0 ? (totalEvaluadas / propuestas.length) * 100 : 0}
              className="h-2"
            />
            {todasEvaluadas && !yaVoto && (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Evaluación completa — ya puedes emitir tu voto abajo
              </p>
            )}
            {yaVoto && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Voto registrado
                {progreso.fecha_voto ? ` el ${new Date(progreso.fecha_voto).toLocaleDateString('es-CO')}` : ''}
              </p>
            )}
          </Card>
        ) : (
          <Card className="border border-border/50 bg-card/50 p-5">
            <p className="text-muted-foreground text-sm">
              {mensajeProceso ?? 'No hay un proceso activo en este momento.'}
            </p>
          </Card>
        )}

        {/* ── Candidatos ── */}
        {proceso && propuestas.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground px-1">
              Candidatos ({propuestas.length})
            </h2>

            <Accordion type="single" collapsible className="space-y-3">
              {propuestas.map((propuesta, idx) => {
                const completa = isPropuestaCompleta(propuesta.id, criterios, evaluaciones)
                const docs = docsDeProps(propuesta.id)
                const docsConArchivo = docs.filter((d) => d.archivo_url)

                return (
                  <AccordionItem
                    key={propuesta.id}
                    value={propuesta.id}
                    className="border border-border/50 rounded-lg bg-card/50 overflow-hidden"
                  >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/30">
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{propuesta.razon_social}</p>
                          <p className="text-xs text-muted-foreground">
                            {propuesta.tipo_persona === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'}
                            {' · '}
                            {propuesta.anios_experiencia} años exp.
                            {' · '}
                            {propuesta.unidades_administradas} unidades
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {completa ? (
                            <Badge variant="outline" className="text-xs border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Evaluado
                            </Badge>
                          ) : criterios.length > 0 ? (
                            <Badge variant="outline" className="text-xs border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                              {Object.keys(evaluaciones[propuesta.id] ?? {}).length}/{criterios.length} criterios
                            </Badge>
                          ) : null}
                          {docs.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              {docsConArchivo.length} docs
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-5 pb-5 pt-1">
                      <Tabs defaultValue="info">
                        <TabsList className="mb-4">
                          <TabsTrigger value="info">Información</TabsTrigger>
                          <TabsTrigger value="documentos">
                            Documentos
                            {docs.length > 0 && (
                              <span className="ml-1.5 text-xs text-muted-foreground">({docs.length})</span>
                            )}
                          </TabsTrigger>
                          {criterios.length > 0 && (
                            <TabsTrigger value="evaluacion">Evaluación</TabsTrigger>
                          )}
                        </TabsList>

                        {/* ─ Tab Información ─ */}
                        <TabsContent value="info" className="space-y-4 mt-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <InfoItem icon={<Building2 className="h-4 w-4" />} label="Razón social / Nombre" value={propuesta.razon_social} />
                            <InfoItem icon={<FileText className="h-4 w-4" />} label="NIT / Cédula" value={propuesta.nit_cedula} />
                            {propuesta.representante_legal && (
                              <InfoItem icon={<Users className="h-4 w-4" />} label="Representante legal" value={propuesta.representante_legal} />
                            )}
                            <InfoItem
                              icon={<Briefcase className="h-4 w-4" />}
                              label="Experiencia en PH"
                              value={`${propuesta.anios_experiencia} años · ${propuesta.unidades_administradas} unidades administradas`}
                            />
                            <InfoItem
                              icon={<DollarSign className="h-4 w-4" />}
                              label="Honorarios propuestos"
                              value={formatCurrency(propuesta.valor_honorarios)}
                            />
                            {propuesta.telefono && (
                              <InfoItem icon={<Phone className="h-4 w-4" />} label="Teléfono" value={propuesta.telefono} />
                            )}
                            {propuesta.email && (
                              <InfoItem icon={<Mail className="h-4 w-4" />} label="Correo" value={propuesta.email} />
                            )}
                            {propuesta.direccion && (
                              <InfoItem icon={<MapPin className="h-4 w-4" />} label="Dirección" value={propuesta.direccion} className="sm:col-span-2" />
                            )}
                          </div>

                          {/* Estado legal */}
                          <div className="rounded-md border border-border/50 bg-muted/30 p-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado legal</p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  propuesta.cumple_requisitos_legales
                                    ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
                                    : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
                                }
                              >
                                {propuesta.cumple_requisitos_legales
                                  ? 'Cumple requisitos legales'
                                  : 'Verificación pendiente'}
                              </Badge>
                            </div>
                            {propuesta.observaciones_legales && (
                              <p className="text-xs text-muted-foreground mt-1">{propuesta.observaciones_legales}</p>
                            )}
                          </div>
                        </TabsContent>

                        {/* ─ Tab Documentos ─ */}
                        <TabsContent value="documentos" className="mt-0">
                          {docs.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              Esta propuesta no tiene documentos cargados aún.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {docs.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/50 px-3 py-2.5"
                                >
                                  <div className="flex items-start gap-2 min-w-0">
                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {mapTipoDoc(doc.tipo)}
                                      </p>
                                      {doc.nombre && (
                                        <p className="text-xs text-muted-foreground truncate">{doc.nombre}</p>
                                      )}
                                      {doc.fecha_vencimiento && (
                                        <p className="text-xs text-muted-foreground">
                                          Vence: {formatFecha(doc.fecha_vencimiento)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="outline" className="text-xs capitalize hidden sm:flex">
                                      {doc.estado}
                                    </Badge>
                                    {doc.archivo_url ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs gap-1"
                                        onClick={() => setDocEnVista(doc)}
                                      >
                                        <Eye className="h-3 w-3" />
                                        <span className="hidden sm:inline">Ver</span>
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Sin archivo</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        {/* ─ Tab Evaluación ─ */}
                        {criterios.length > 0 && (
                          <TabsContent value="evaluacion" className="mt-0">
                            <PanelEvaluacion
                              propuesta={propuesta}
                              criterios={criterios}
                              evaluaciones={evaluaciones}
                              onCalificar={handleCalificar}
                              saving={savingMap[propuesta.id] ?? false}
                            />
                          </TabsContent>
                        )}
                      </Tabs>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        )}

        {/* ── Sección de votación ── */}
        {proceso && !yaVoto && todasEvaluadas && (
          <Card className="border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Paso final</p>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Vote className="h-5 w-5 text-primary" />
                Emite tu voto
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Selecciona la propuesta que consideras más adecuada para administrar el conjunto. Tu voto es definitivo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {propuestas.map((propuesta) => (
                <button
                  key={propuesta.id}
                  onClick={() => setVotoSeleccionado(propuesta.id)}
                  className={`rounded-lg border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                    votoSeleccionado === propuesta.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 bg-card/50 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{propuesta.razon_social}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {propuesta.anios_experiencia} años exp. · {formatCurrency(propuesta.valor_honorarios)}
                      </p>
                    </div>
                    {votoSeleccionado === propuesta.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {errorVoto && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorVoto}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!votoSeleccionado}
              onClick={() => setConfirmVoto(true)}
            >
              <Vote className="h-4 w-4 mr-2" />
              Confirmar voto
            </Button>
          </Card>
        )}

        {/* ── Ya votó ── */}
        {yaVoto && (
          <Card className="border border-green-500/30 bg-green-500/5 p-5 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-foreground">Voto registrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tu participación ha quedado registrada. Gracias por tu voto.
            </p>
          </Card>
        )}

        {/* ── Sin proceso ── */}
        {!proceso && (
          <Card className="border border-border/50 bg-card/50 p-5 text-center">
            <p className="text-muted-foreground text-sm">
              {mensajeProceso ?? 'No hay un proceso de evaluación activo en este momento.'}
            </p>
          </Card>
        )}

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={cerrarSesion}>
          Cerrar sesión de consejero
        </Button>
      </main>

      {/* ── Modal vista de documento ── */}
      <Dialog open={!!docEnVista} onOpenChange={() => setDocEnVista(null)}>
        {docEnVista && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{mapTipoDoc(docEnVista.tipo)}</DialogTitle>
              {docEnVista.nombre && (
                <DialogDescription>{docEnVista.nombre}</DialogDescription>
              )}
            </DialogHeader>
            <div className="mt-2 space-y-3">
              {docEnVista.archivo_url ? (
                <>
                  {docEnVista.archivo_url.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={docEnVista.archivo_url}
                      className="w-full rounded border border-border"
                      style={{ height: '60vh' }}
                      title={docEnVista.nombre}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={docEnVista.archivo_url}
                      alt={docEnVista.nombre}
                      className="max-h-[60vh] w-auto mx-auto rounded border border-border object-contain"
                    />
                  )}
                  <a
                    href={docEnVista.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary underline"
                  >
                    <Download className="h-3 w-3" />
                    Abrir en nueva pestaña
                  </a>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No hay archivo disponible.</p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Modal confirmación de voto ── */}
      <Dialog open={confirmVoto} onOpenChange={setConfirmVoto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar voto</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Solo puedes votar una vez.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {votoSeleccionado && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-sm font-medium text-foreground">
                  {propuestas.find((p) => p.id === votoSeleccionado)?.razon_social}
                </p>
              </div>
            )}
          </div>
          {errorVoto && (
            <p className="text-sm text-destructive">{errorVoto}</p>
          )}
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmVoto(false)} disabled={votando}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleVotar} disabled={votando}>
              {votando ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registrando...</>
              ) : (
                'Confirmar voto'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Micro-componente ─────────────────────────────────────────────────────────

function InfoItem({
  icon,
  label,
  value,
  className = '',
}: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground font-medium">{value}</p>
      </div>
    </div>
  )
}
