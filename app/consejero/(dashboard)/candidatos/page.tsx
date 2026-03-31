'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/dialog'
import {
  Eye,
  FileText,
  Building2,
  User,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  archivo_url?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(valor?: number | null) {
  if (!valor) return 'Sin dato'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

const TIPO_DOC_LABEL: Record<string, string> = {
  camara_comercio: 'Cámara de Comercio',
  rut: 'RUT',
  rut_nat: 'RUT',
  cedula: 'Cédula',
  hoja_vida: 'Hoja de Vida',
  propuesta_gestion: 'Propuesta de Gestión',
  propuesta_economica: 'Propuesta Económica',
  certificacion: 'Certificado de Experiencia',
  referencia: 'Referencia',
}

function getTipoDocLabel(tipo: string) {
  return TIPO_DOC_LABEL[tipo] ?? tipo.replace(/_/g, ' ')
}

function isImage(url: string) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url)
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function CandidatosPage() {
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog para ver documento
  const [docDialog, setDocDialog] = useState<Documento | null>(null)

  useEffect(() => {
    fetch('/api/consejero/perfil')
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar los candidatos')
        return r.json()
      })
      .then((d) => {
        setPropuestas(d.propuestas ?? [])
        setDocumentos(d.documentos ?? [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function getDocsByPropuesta(propuestaId: string) {
    return documentos.filter((doc) => doc.propuesta_id === propuestaId)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-40 rounded bg-muted animate-pulse" />
          <div className="h-4 w-56 rounded bg-muted animate-pulse mt-2" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-48 rounded bg-muted animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidatos</h1>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Candidatos</h1>
        <p className="text-muted-foreground">
          Lista de propuestas de administración recibidas
          {propuestas.length > 0 && ` (${propuestas.length})`}
        </p>
      </div>

      {propuestas.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
            <div className="text-center">
              <Building2 className="mx-auto h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No hay candidatos disponibles.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {propuestas.map((propuesta, idx) => {
            const docs = getDocsByPropuesta(propuesta.id)
            return (
              <AccordionItem
                key={propuesta.id}
                value={propuesta.id}
                className="border rounded-lg overflow-hidden bg-card"
              >
                <AccordionTrigger className="px-4 py-4 hover:no-underline">
                  <div className="flex flex-1 items-center gap-3 text-left">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{propuesta.razon_social}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {propuesta.tipo_persona === 'juridica' ? 'NIT' : 'C.C.'}: {propuesta.nit_cedula}
                        </span>
                        {propuesta.cumple_requisitos_legales === true ? (
                          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Habilitado
                          </Badge>
                        ) : propuesta.cumple_requisitos_legales === false ? (
                          <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-xs">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            No apto legal
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">
                            En revisión
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  <Tabs defaultValue="info">
                    <TabsList className="mb-4">
                      <TabsTrigger value="info">Información</TabsTrigger>
                      <TabsTrigger value="docs">
                        Documentos {docs.length > 0 && `(${docs.length})`}
                      </TabsTrigger>
                    </TabsList>

                    {/* ── Información ── */}
                    <TabsContent value="info" className="mt-0">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {propuesta.tipo_persona === 'juridica' && propuesta.representante_legal && (
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Representante Legal</p>
                              <p className="text-sm font-medium">{propuesta.representante_legal}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Experiencia</p>
                            <p className="text-sm font-medium">{propuesta.anios_experiencia} años</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Unidades administradas</p>
                            <p className="text-sm font-medium">
                              {propuesta.unidades_administradas > 0
                                ? propuesta.unidades_administradas.toLocaleString('es-CO')
                                : 'Sin dato'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Honorarios propuestos</p>
                            <p className="text-sm font-medium">{formatCurrency(propuesta.valor_honorarios)}</p>
                          </div>
                        </div>
                        {propuesta.email && (
                          <div className="flex items-start gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-medium break-all">{propuesta.email}</p>
                            </div>
                          </div>
                        )}
                        {propuesta.telefono && (
                          <div className="flex items-start gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Teléfono</p>
                              <p className="text-sm font-medium">{propuesta.telefono}</p>
                            </div>
                          </div>
                        )}
                        {propuesta.direccion && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Dirección</p>
                              <p className="text-sm font-medium">{propuesta.direccion}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {propuesta.observaciones_legales && (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-medium text-amber-800 mb-1">Observaciones legales</p>
                          <p className="text-sm text-amber-700">{propuesta.observaciones_legales}</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* ── Documentos ── */}
                    <TabsContent value="docs" className="mt-0">
                      {docs.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">
                          No hay documentos cargados para este candidato.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {docs.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between rounded-lg border p-3 gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {getTipoDocLabel(doc.tipo)}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">{doc.nombre}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {doc.estado === 'aprobado' ? (
                                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs hidden sm:flex">
                                    Aprobado
                                  </Badge>
                                ) : doc.estado === 'rechazado' ? (
                                  <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-xs hidden sm:flex">
                                    Rechazado
                                  </Badge>
                                ) : null}
                                {doc.archivo_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDocDialog(doc)}
                                    className="h-8 px-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">Ver</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}

      {/* Dialog visor de documentos */}
      <Dialog open={!!docDialog} onOpenChange={(open) => !open && setDocDialog(null)}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {docDialog ? getTipoDocLabel(docDialog.tipo) : ''}
            </DialogTitle>
          </DialogHeader>
          {docDialog?.archivo_url && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <a
                  href={docDialog.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir en nueva pestaña
                </a>
              </div>
              {isImage(docDialog.archivo_url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={docDialog.archivo_url}
                  alt={getTipoDocLabel(docDialog.tipo)}
                  className="w-full rounded-lg object-contain max-h-[60vh]"
                />
              ) : (
                <iframe
                  src={docDialog.archivo_url}
                  title={getTipoDocLabel(docDialog.tipo)}
                  className="w-full rounded-lg border"
                  style={{ height: '60vh' }}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
