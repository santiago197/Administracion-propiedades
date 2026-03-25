'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye, FileText } from 'lucide-react'
import { LABEL_ESTADO } from '@/lib/types'

interface PropuestaDetalle {
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
  votos_recibidos?: number | null
  puntaje_final?: number | null
}

interface DocumentoDetalle {
  id: string
  propuesta_id: string
  tipo: string
  nombre: string
  estado: string
  es_obligatorio: boolean
  fecha_vencimiento?: string | null
  archivo_url?: string | null
}

interface ConsejeroPerfilResponse {
  consejero: {
    id: string
    nombre_completo: string
    cargo: string
    torre?: string | null
    apartamento: string
    email?: string | null
    telefono?: string | null
  }
  proceso: {
    id: string
    nombre: string
    estado: string
  } | null
  progreso: {
    propuestas_requeridas: number
    propuestas_evaluadas: number
    evaluacion_completa: boolean
    ya_voto: boolean
    fecha_voto: string | null
  }
  mensaje?: string
  propuestas?: PropuestaDetalle[]
  documentos?: DocumentoDetalle[]
}

export default function PerfilConsejeroPage() {
  const router = useRouter()
  const [data, setData] = useState<ConsejeroPerfilResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  interface PropuestaDetalle {
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
    votos_recibidos?: number | null
    puntaje_final?: number | null
  }

  interface DocumentoDetalle {
    id: string
    propuesta_id: string
    tipo: string
    nombre: string
    estado: string
    es_obligatorio: boolean
    fecha_vencimiento?: string | null
    archivo_url?: string | null
  }

  const [propuestas, setPropuestas] = useState<PropuestaDetalle[]>([])
  const [documentos, setDocumentos] = useState<DocumentoDetalle[]>([])
  const [selectedPropuestaId, setSelectedPropuestaId] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState<'general' | 'documentos' | 'legal'>('general')
  const [documentoEnVista, setDocumentoEnVista] = useState<DocumentoDetalle | null>(null)

  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        const res = await fetch('/api/consejero/perfil')
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error ?? 'No fue posible cargar el perfil')
        }
        const payload = (await res.json()) as ConsejeroPerfilResponse
        setData(payload)
        setPropuestas(payload.propuestas ?? [])
        setDocumentos(payload.documentos ?? [])
        if (payload.propuestas && payload.propuestas.length > 0) {
          setSelectedPropuestaId(payload.propuestas[0].id)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchPerfil()
  }, [])

  const cerrarSesion = async () => {
    await fetch('/api/consejero/logout', { method: 'POST' })
    router.push('/consejero')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
          <Card className="h-28 animate-pulse bg-card/50" />
          <Card className="h-44 animate-pulse bg-card/50" />
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="p-8 text-center">
            <p className="text-foreground font-semibold mb-2">No se pudo cargar el perfil</p>
            <p className="text-muted-foreground text-sm">{error ?? 'Sesión no válida'}</p>
            <Link href="/consejero">
              <Button className="mt-6">Volver al ingreso</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  const { consejero, proceso, progreso } = data

  const selectedPropuesta = selectedPropuestaId
    ? propuestas.find((p) => p.id === selectedPropuestaId) ?? null
    : null

  const documentosPorPropuesta = (propuestaId: string) =>
    documentos.filter((d) => d.propuesta_id === propuestaId)

  const buildEstadoDocumentacion = (propuestaId: string) => {
    const docs = documentosPorPropuesta(propuestaId)
    if (!docs.length) {
      return {
        label: 'Sin documentos',
        color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
        total: 0,
        completos: 0,
        vencidos: 0,
        porcentaje: 0,
      }
    }

    const obligatorios = docs.filter((d) => d.es_obligatorio)
    const completos = obligatorios.filter((d) => d.estado === 'completo')
    const vencidos = obligatorios.filter((d) => d.estado === 'vencido')

    const total = obligatorios.length || docs.length
    const done = obligatorios.length ? completos.length : docs.filter((d) => d.estado === 'completo').length
    const porcentaje = total > 0 ? Math.round((done / total) * 100) : 0

    let label = 'Incompleta'
    let color = 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30'

    if (vencidos.length > 0) {
      label = 'Crítica'
      color = 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30'
    } else if (done === total && total > 0) {
      label = 'Completa'
      color = 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30'
    }

    return { label, color, total, completos: done, vencidos: vencidos.length, porcentaje }
  }

  const formatTipoPersona = (tipo: 'juridica' | 'natural') =>
    tipo === 'juridica' ? 'Persona Jurídica' : 'Persona Natural'

  const formatCurrency = (valor?: number | null) => {
    if (!valor) return 'Sin dato'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor)
  }

  const formatFecha = (value?: string | null) => {
    if (!value) return 'Sin fecha'
    try {
      return new Date(value).toLocaleDateString('es-CO')
    } catch {
      return value
    }
  }

  const mapTipoDocumento = (tipo: string) => {
    switch (tipo) {
      case 'camara_comercio':
        return 'Cámara de Comercio'
      case 'rut':
        return 'RUT'
      case 'poliza':
        return 'Póliza'
      case 'estados_financieros':
        return 'Estados Financieros'
      case 'certificacion':
        return 'Certificación'
      case 'referencia':
        return 'Referencia'
      default:
        return 'Otro documento'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <Card className="border border-border/50 bg-card/50 p-6">
          <p className="text-sm text-muted-foreground">Perfil de consejero</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">{consejero.nombre_completo}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {consejero.cargo} · {consejero.torre ? `Torre ${consejero.torre} · ` : ''}Apto {consejero.apartamento}
          </p>
          <p className="text-sm text-muted-foreground">
            {consejero.email ?? 'Sin correo'} · {consejero.telefono ?? 'Sin teléfono'}
          </p>
        </Card>

        <Card className="border border-border/50 bg-card/50 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">Proceso actual</p>
              {proceso ? (
                <>
                  <p className="text-xl font-semibold text-foreground mt-1">{proceso.nombre}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Estado:{' '}
                    <span className="font-medium capitalize">{proceso.estado}</span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {data.mensaje ?? 'No hay un proceso activo en este momento.'}
                </p>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>
                Evaluación:{' '}
                <span className="font-medium">
                  {progreso.propuestas_evaluadas} / {progreso.propuestas_requeridas}
                </span>
              </p>
              <p>
                Voto:{' '}
                {progreso.ya_voto
                  ? `registrado${
                      progreso.fecha_voto
                        ? ` (${new Date(progreso.fecha_voto).toLocaleDateString('es-CO')})`
                        : ''
                    }`
                  : 'pendiente'}
              </p>
            </div>
          </div>

          <Progress
            value={
              progreso.propuestas_requeridas > 0
                ? (progreso.propuestas_evaluadas / progreso.propuestas_requeridas) * 100
                : 0
            }
          />
        </Card>

        {proceso && (
          <>
            <Card className="border border-border/50 bg-card/50 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Propuestas del proceso</p>
                  <h2 className="text-lg font-semibold text-foreground mt-1">
                    Candidatos para la administración
                  </h2>
                </div>
              </div>

              {detalleLoading ? (
                <div className="space-y-2">
                  <div className="h-8 rounded bg-muted animate-pulse" />
                  <div className="h-10 rounded bg-muted animate-pulse" />
                  <div className="h-10 rounded bg-muted animate-pulse" />
                  <div className="h-10 rounded bg-muted animate-pulse" />
                </div>
              ) : detalleError ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <p>{detalleError}</p>
                </div>
              ) : propuestas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay propuestas cargadas para este proceso todavía.
                </p>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proponente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Experiencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Documentación</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {propuestas.map((p) => {
                        const docEstado = buildEstadoDocumentacion(p.id)
                        const isSelected = selectedPropuestaId === p.id
                        return (
                          <TableRow
                            key={p.id}
                            data-state={isSelected ? 'selected' : undefined}
                            className="cursor-pointer"
                            onClick={() => setSelectedPropuestaId(p.id)}
                          >
                            <TableCell className="max-w-xs">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground truncate">
                                  {p.razon_social}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {p.nit_cedula}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {formatTipoPersona(p.tipo_persona)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {p.anios_experiencia} años · {p.unidades_administradas} unidades
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {LABEL_ESTADO[p.estado as keyof typeof LABEL_ESTADO] ?? p.estado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${docEstado.color} border`}
                                >
                                  {docEstado.label}
                                </Badge>
                                {docEstado.total > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Documentos: {docEstado.completos} / {docEstado.total}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedPropuestaId(p.id)
                                  setTabValue('general')
                                }}
                              >
                                Ver detalle
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {selectedPropuesta && (
                    <div className="mt-4 border-t border-border/50 pt-4">
                      <Tabs value={tabValue} onValueChange={(v) => setTabValue(v as typeof tabValue)}>
                        <TabsList>
                          <TabsTrigger value="general">Información general</TabsTrigger>
                          <TabsTrigger value="documentos">Documentación</TabsTrigger>
                          <TabsTrigger value="legal">Estado legal</TabsTrigger>
                        </TabsList>
                        <TabsContent value="general" className="mt-4">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {selectedPropuesta.razon_social}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {formatTipoPersona(selectedPropuesta.tipo_persona)} · {selectedPropuesta.nit_cedula}
                            </p>
                            {selectedPropuesta.representante_legal && (
                              <p className="text-sm text-muted-foreground">
                                Representante legal: {selectedPropuesta.representante_legal}
                              </p>
                            )}
                            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 mt-2">
                              <p>
                                <span className="font-semibold">Experiencia:</span>{' '}
                                {selectedPropuesta.anios_experiencia} años
                              </p>
                              <p>
                                <span className="font-semibold">Unidades administradas:</span>{' '}
                                {selectedPropuesta.unidades_administradas}
                              </p>
                              <p>
                                <span className="font-semibold">Honorarios estimados:</span>{' '}
                                {formatCurrency(selectedPropuesta.valor_honorarios)}
                              </p>
                              <p>
                                <span className="font-semibold">Contacto:</span>{' '}
                                {selectedPropuesta.telefono || selectedPropuesta.email
                                  ? `${selectedPropuesta.telefono ?? ''}$${
                                      selectedPropuesta.telefono && selectedPropuesta.email ? ' · ' : ''
                                    }${selectedPropuesta.email ?? ''}`
                                  : 'Sin datos de contacto'}
                              </p>
                              <p className="sm:col-span-2">
                                <span className="font-semibold">Dirección:</span>{' '}
                                {selectedPropuesta.direccion || 'Sin dirección registrada'}
                              </p>
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="documentos" className="mt-4">
                          <div className="space-y-3">
                            {documentosPorPropuesta(selectedPropuesta.id).length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Esta propuesta aún no tiene documentos cargados.
                              </p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Tipo de documento</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Vencimiento</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {documentosPorPropuesta(selectedPropuesta.id).map((doc) => (
                                    <TableRow key={doc.id}>
                                      <TableCell>
                                        <span className="text-sm text-foreground">
                                          {mapTipoDocumento(doc.tipo)}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          className="text-xs capitalize"
                                        >
                                          {doc.estado}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-xs text-muted-foreground">
                                          {doc.fecha_vencimiento
                                            ? formatFecha(doc.fecha_vencimiento)
                                            : 'Sin fecha'}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {doc.archivo_url ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-3 text-xs inline-flex items-center gap-1"
                                            onClick={() => setDocumentoEnVista(doc)}
                                          >
                                            <Eye className="h-3 w-3" /> Ver documento
                                          </Button>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">
                                            No disponible
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </TabsContent>
                        <TabsContent value="legal" className="mt-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  selectedPropuesta.cumple_requisitos_legales
                                    ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
                                    : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
                                }
                              >
                                {selectedPropuesta.cumple_requisitos_legales
                                  ? 'Cumple requisitos legales'
                                  : 'Pendiente / No cumple'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {selectedPropuesta.observaciones_legales
                                ? selectedPropuesta.observaciones_legales
                                : 'Aún no hay observaciones legales registradas para esta propuesta.'}
                            </p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href={`/consejero/evaluacion/${proceso.id}`}>
                <Button className="w-full">Ir a evaluación</Button>
              </Link>
              <Link href={`/consejero/votacion/${proceso.id}`}>
                <Button variant="outline" className="w-full">
                  Ir a votación
                </Button>
              </Link>
            </div>
          </>
        )}

        <Button onClick={cerrarSesion} variant="ghost" className="w-full text-muted-foreground">
          Cerrar sesión de consejero
        </Button>

        <Dialog open={!!documentoEnVista} onOpenChange={() => setDocumentoEnVista(null)}>
          {documentoEnVista && (
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{mapTipoDocumento(documentoEnVista.tipo)}</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium text-foreground">{documentoEnVista.nombre}</p>
                <p className="text-muted-foreground text-xs">
                  {documentoEnVista.archivo_url
                    ? 'El documento se abrirá en una nueva pestaña de tu navegador.'
                    : 'No hay archivo disponible para este documento.'}
                </p>
                {documentoEnVista.archivo_url && (
                  <a
                    href={documentoEnVista.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary underline mt-2"
                  >
                    <Eye className="h-3 w-3" /> Abrir documento
                  </a>
                )}
              </div>
            </DialogContent>
          )}
        </Dialog>
      </main>
    </div>
  )
}
