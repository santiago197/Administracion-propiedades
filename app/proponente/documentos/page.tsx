'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  LogOut,
  UploadCloud,
  XCircle,
  Zap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import type { Propuesta } from '@/lib/types/index'

// ─────────────────────────────────────────────────────────────────────

interface TipoFaltante {
  id: string
  nombre: string
  descripcion: string
  esObligatorio: boolean
}

interface DocumentoCargado {
  id: string
  nombre: string
  tipoNombre: string
  estado: string
  creadoEn: string
  archivoUrl: string | null
}

interface EstadoDocumentos {
  total: number
  completados: number
  porcentaje: number
  faltantes: TipoFaltante[]
  vencidos: number
}

const ESTADO_DOC_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pendiente:  { label: 'Pendiente revisión', cls: 'bg-amber-500/10 text-amber-700 border-amber-200',   icon: <Clock className="h-3 w-3" /> },
  aprobado:   { label: 'Aprobado',           cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  rechazado:  { label: 'Rechazado',          cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: <XCircle className="h-3 w-3" /> },
  CARGADO:    { label: 'Cargado',            cls: 'bg-blue-500/10 text-blue-700 border-blue-200',      icon: <Check className="h-3 w-3" /> },
}

function estadoDocConfig(estado: string) {
  return ESTADO_DOC_CONFIG[estado] ?? { label: estado, cls: 'bg-muted text-muted-foreground', icon: null }
}

// ─────────────────────────────────────────────────────────────────────

function ProponenteDocumentosContent() {
  const searchParams = useSearchParams()
  const codigo = searchParams.get('codigo')
  const { toast } = useToast()

  const [validando, setValidando]           = useState(true)
  const [propuesta, setPropuesta]           = useState<Propuesta | null>(null)
  const [estadoDocumentos, setEstadoDocumentos] = useState<EstadoDocumentos | null>(null)
  const [documentosCargados, setDocumentosCargados] = useState<DocumentoCargado[]>([])
  const [error, setError]                   = useState<string | null>(null)
  const [uploading, setUploading]           = useState(false)
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<string | null>(null)

  // ── Validación inicial ──────────────────────────────────────────────
  useEffect(() => {
    if (!codigo) {
      setError('Código de acceso no proporcionado')
      setValidando(false)
      return
    }

    const validarAcceso = async () => {
      try {
        const res = await fetch(`/api/proponente/validar?codigo=${codigo}`)
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error || 'Código inválido o expirado')
        }

        const data = await res.json()

        setPropuesta({
          id: data.propuesta_id,
          razon_social: data.razon_social,
          nit_cedula: data.nit_cedula,
          email: data.email,
        } as Propuesta)

        aplicarEstado(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al validar acceso')
        setPropuesta(null)
      } finally {
        setValidando(false)
      }
    }

    validarAcceso()
  }, [codigo])

  // ── Helpers de estado ───────────────────────────────────────────────
  function aplicarEstado(data: any) {
    setEstadoDocumentos({
      total: data.estadisticas.total_obligatorios,
      completados: data.estadisticas.completados,
      porcentaje: data.estadisticas.porcentaje,
      faltantes: (data.tipos_faltantes ?? []).map((t: any) => ({
        id: t.id,
        nombre: t.nombre,
        descripcion: t.descripcion,
        esObligatorio: t.es_obligatorio,
      })),
      vencidos: data.estadisticas.vencidos,
    })

    // Cruzar documentos cargados con sus tipos para mostrar nombre legible
    const tiposMap: Record<string, string> = {}
    for (const t of data.tipos_cubiertos ?? []) tiposMap[t.id] = t.nombre

    setDocumentosCargados(
      (data.documentos ?? []).map((d: any) => ({
        id: d.id,
        nombre: d.nombre,
        tipoNombre: tiposMap[d.tipo_documento_id] ?? d.tipo ?? 'Documento',
        estado: d.estado,
        creadoEn: d.created_at,
        archivoUrl: d.archivo_url ?? null,
      }))
    )
  }

  // ── Subida de documento ─────────────────────────────────────────────
  const handleSubirDocumento = useCallback(
    async (evento: React.ChangeEvent<HTMLInputElement>, tipoDoc: TipoFaltante) => {
      const archivo = evento.target.files?.[0]
      if (!archivo || !propuesta || !codigo) return

      setUploading(true)
      setDocumentoSeleccionado(tipoDoc.id)
      try {
        // 1. Obtener URL pre-firmada del servidor (sin enviar el archivo)
        const urlRes = await fetch('/api/proponente/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo,
            nombre: archivo.name,
            tipo_mime: archivo.type,
            tamanio: archivo.size,
          }),
        })
        if (!urlRes.ok) {
          const body = await urlRes.json()
          throw new Error(body.error || 'Error al obtener URL de subida')
        }
        const { signed_url, path, public_url } = await urlRes.json()

        // 2. Subir directamente a Supabase Storage (no pasa por Vercel)
        const storageRes = await fetch(signed_url, {
          method: 'PUT',
          headers: { 'Content-Type': archivo.type },
          body: archivo,
        })
        if (!storageRes.ok) throw new Error('Error al subir el archivo al storage')

        const url = public_url
        const pathname = path

        // 3. Registrar documento (endpoint público)
        const docRes = await fetch('/api/proponente/documentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo,
            tipo_documento_id: tipoDoc.id,
            nombre: archivo.name,
            archivo_url: url,
            archivo_pathname: pathname,
          }),
        })
        if (!docRes.ok) throw new Error('Error al registrar documento')

        const { documento, estadisticas, tipos_faltantes, tipos_cubiertos } = await docRes.json()

        toast({ title: 'Documento cargado', description: 'Tu documento se subió correctamente' })

        // Actualizar estado de progreso y faltantes
        aplicarEstado({ estadisticas, tipos_faltantes, tipos_cubiertos, documentos: undefined })

        // Agregar el nuevo documento a la lista de cargados
        setDocumentosCargados((prev) => [
          {
            id: documento.id,
            nombre: archivo.name,
            tipoNombre: tipoDoc.nombre,
            estado: documento.estado ?? 'pendiente',
            creadoEn: documento.created_at ?? new Date().toISOString(),
            archivoUrl: url,
          },
          ...prev,
        ])

        setDocumentoSeleccionado(null)
        // Limpiar el input para permitir re-subida
        evento.target.value = ''
      } catch (err) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'No se pudo cargar el documento',
          variant: 'destructive',
        })
      } finally {
        setUploading(false)
      }
    },
    [propuesta, codigo, toast]
  )

  // ── Pantallas de estado ─────────────────────────────────────────────
  if (validando) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-lg">
          <CardContent className="pt-10 pb-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Validando acceso...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !propuesta) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-500/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-destructive/30 shadow-lg">
          <CardContent className="pt-8 pb-8 px-6">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h2 className="text-base font-semibold text-center mb-2">Acceso no válido</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {error || 'El código proporcionado no es válido o ha expirado. Contacta al administrador.'}
            </p>
            <Button variant="outline" className="w-full h-11" onClick={() => window.history.back()}>
              Volver atrás
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Pantalla principal ──────────────────────────────────────────────
  const porcentaje       = estadoDocumentos?.porcentaje ?? 0
  const faltantes        = estadoDocumentos?.faltantes ?? []
  const completados      = estadoDocumentos?.completados ?? 0
  const totalObligatorios = estadoDocumentos?.total ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-6 sm:py-8 px-4 pb-safe">
      <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">

        {/* Header */}
        <div className="text-center space-y-1 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Cargar Documentos</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{propuesta.razon_social}</p>
        </div>

        {/* Progreso */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">Estado de documentación</CardTitle>
                <CardDescription className="mt-1">
                  {completados} de {totalObligatorios} documentos obligatorios entregados
                </CardDescription>
              </div>
              {porcentaje === 100 && (
                <div className="rounded-full bg-emerald-500/10 p-2">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progreso</span>
                <span className="text-muted-foreground">{porcentaje}%</span>
              </div>
              <Progress value={porcentaje} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Documentos pendientes de cargar */}
        {faltantes.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pendientes de entrega</CardTitle>
              <CardDescription>{faltantes.length} documento{faltantes.length !== 1 ? 's' : ''} por cargar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {faltantes.map((doc) => (
                <label
                  key={doc.id}
                  className="block p-4 sm:p-5 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 active:bg-primary/10 transition-all cursor-pointer group touch-manipulation"
                >
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => handleSubirDocumento(e, doc)}
                    disabled={uploading}
                  />
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors shrink-0">
                      {uploading && documentoSeleccionado === doc.id ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      ) : (
                        <UploadCloud className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">
                        {doc.nombre}
                        {doc.esObligatorio && <span className="ml-1 text-destructive">*</span>}
                      </p>
                      {doc.descripcion && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{doc.descripcion}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {uploading && documentoSeleccionado === doc.id ? 'Subiendo...' : 'Toca para seleccionar archivo'}
                      </p>
                    </div>
                    <UploadCloud className="h-4 w-4 text-muted-foreground shrink-0 sm:hidden" />
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Documentos ya cargados */}
        {documentosCargados.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Documentos entregados</CardTitle>
              <CardDescription>{documentosCargados.length} archivo{documentosCargados.length !== 1 ? 's' : ''} cargado{documentosCargados.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {documentosCargados.map((doc) => {
                const cfg = estadoDocConfig(doc.estado)
                return (
                  <div key={doc.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="rounded-lg bg-muted p-2 shrink-0 mt-0.5">
                      <Check className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium truncate flex-1 min-w-0">{doc.tipoNombre}</p>
                        {doc.archivoUrl && (
                          <a
                            href={doc.archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5"
                            title="Ver archivo"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.nombre}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-xs gap-1 ${cfg.cls}`}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(doc.creadoEn), "d MMM, HH:mm", { locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Completado */}
        {faltantes.length === 0 && documentosCargados.length > 0 && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-1">
            <Check className="h-6 w-6 text-emerald-600 mx-auto" />
            <p className="font-medium text-emerald-700">¡Documentación completa!</p>
            <p className="text-xs text-emerald-600">
              Todos los documentos obligatorios han sido entregados
            </p>
          </div>
        )}

        {/* Aviso vencidos */}
        {(estadoDocumentos?.vencidos ?? 0) > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2 text-sm text-amber-700">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{estadoDocumentos!.vencidos} documento{estadoDocumentos!.vencidos !== 1 ? 's' : ''} vencido{estadoDocumentos!.vencidos !== 1 ? 's' : ''}. Contacta al administrador.</p>
          </div>
        )}

        {/* Informativo */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Zap className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm space-y-0.5">
                <p className="font-medium text-amber-900">Los campos marcados con * son obligatorios</p>
                <p className="text-amber-800">Debes completar todos los documentos antes de que se inicie la evaluación</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full h-11" onClick={() => { window.location.href = '/' }}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>

        {/* Espacio seguro inferior (iPhone home bar) */}
        <div className="h-4 sm:hidden" />

      </div>
    </div>
  )
}

export default function ProponenteDocumentosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    }>
      <ProponenteDocumentosContent />
    </Suspense>
  )
}
