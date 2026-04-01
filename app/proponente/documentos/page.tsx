/**
 * Página pública para que proponentes carguen documentos
 * URL: /proponente/documentos?codigo=ABC12345
 * 
 * Flujo:
 * 1. Valida código de acceso
 * 2. Obtiene propuesta y documentos faltantes
 * 3. Permite cargar documentos
 * 4. Muestra progreso en tiempo real
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertCircle,
  Check,
  Clock,
  File,
  FileX,
  Loader2,
  LogOut,
  UploadCloud,
  Zap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import type { Propuesta, Documento } from '@/lib/types/index'

// ─────────────────────────────────────────────────────────────────────

interface DocumentoFaltante {
  id: string
  nombre: string
  descripcion: string
  esObligatorio: boolean
}

interface EstadoDocumentos {
  total: number
  completados: number
  porcentaje: number
  faltantes: DocumentoFaltante[]
  vencidos: number
}

// ─────────────────────────────────────────────────────────────────────

export default function ProponenteDocumentosPage() {
  const searchParams = useSearchParams()
  const codigo = searchParams.get('codigo')
  const { toast } = useToast()

  // Estados principales
  const [loading, setLoading] = useState(true)
  const [validando, setValidando] = useState(true)
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null)
  const [estadoDocumentos, setEstadoDocumentos] = useState<EstadoDocumentos | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Estados de carga
  const [uploading, setUploading] = useState(false)
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<string | null>(null)

  // Validación inicial del código
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
          const data = await res.json()
          throw new Error(data.error || 'Código inválido o expirado')
        }

        const data = await res.json()
        setPropuesta({
          id: data.propuesta_id,
          razon_social: data.razon_social,
          numero_documento: data.numero_documento,
          email: data.email,
        } as Propuesta)
        setEstadoDocumentos({
          total: data.estadisticas.total_obligatorios,
          completados: data.estadisticas.completados,
          porcentaje: data.estadisticas.porcentaje,
          faltantes: data.tipos_faltantes.map((tipo: any) => ({
            id: tipo.id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion,
            esObligatorio: tipo.es_obligatorio,
          })),
          vencidos: data.estadisticas.vencidos,
        })
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al validar acceso')
        setPropuesta(null)
      } finally {
        setValidando(false)
        setLoading(false)
      }
    }

    validarAcceso()
  }, [codigo])

  const handleSubirDocumento = useCallback(
    async (evento: React.ChangeEvent<HTMLInputElement>, tipoDocId: string) => {
      const archivo = evento.target.files?.[0]
      if (!archivo || !propuesta || !codigo) return

      setUploading(true)
      setDocumentoSeleccionado(tipoDocId)
      try {
        // 1. Subir archivo a /api/upload
        const formData = new FormData()
        formData.append('file', archivo)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) throw new Error('Error al subir archivo')

        const { url, pathname } = await uploadRes.json()

        // 2. Crear registro de documento (endpoint público — usa código para autenticar)
        const docRes = await fetch('/api/proponente/documentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo,
            tipo_documento_id: tipoDocId,
            nombre: archivo.name,
            archivo_url: url,
            archivo_pathname: pathname,
          }),
        })

        if (!docRes.ok) throw new Error('Error al registrar documento')

        // 3. La respuesta ya incluye el estado actualizado de documentos
        const { estadisticas, tipos_faltantes } = await docRes.json()

        toast({
          title: 'Documento cargado',
          description: 'Tu documento se subió correctamente',
        })

        setEstadoDocumentos({
          total: estadisticas.total_obligatorios,
          completados: estadisticas.completados,
          porcentaje: estadisticas.porcentaje,
          faltantes: tipos_faltantes.map((tipo: any) => ({
            id: tipo.id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion,
            esObligatorio: tipo.es_obligatorio,
          })),
          vencidos: estadisticas.vencidos,
        })

        setDocumentoSeleccionado(null)
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

  // ─── Pantalla de validación ───
  if (validando) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="pt-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Validando acceso...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Pantalla de error ───
  if (error || !propuesta) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-500/5 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/30 shadow-lg">
          <CardContent className="pt-8">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-center mb-2">Acceso no válido</h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {error ||
                'El código proporcionado no es válido o ha expirado. Contacta al administrador.'}
            </p>
            <Button variant="outline" className="w-full" onClick={() => window.history.back()}>
              Volver atrás
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Pantalla principal ───
  const porcentajeProgreso = estadoDocumentos?.porcentaje ?? 0
  const documentosFaltantes = estadoDocumentos?.faltantes ?? []
  const completados = estadoDocumentos?.completados ?? 0
  const totalObligatorios = (estadoDocumentos?.total ?? 0) - (estadoDocumentos?.faltantes.length ?? 0) + documentosFaltantes.length

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold">Cargar Documentos</h1>
          <p className="text-muted-foreground">
            {propuesta.razon_social}
          </p>
        </div>

        {/* Card principal */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">Estado de documentación</CardTitle>
                <CardDescription className="mt-2">
                  {completados} de {totalObligatorios} documentos obligatorios
                </CardDescription>
              </div>
              {porcentajeProgreso === 100 && (
                <div className="rounded-full bg-emerald-500/10 p-2">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Barra de progreso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progreso</span>
                <span className="text-muted-foreground">{porcentajeProgreso}%</span>
              </div>
              <Progress value={porcentajeProgreso} className="h-2" />
            </div>

            {/* Documentos faltantes */}
            {documentosFaltantes.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Documentos para cargar</h3>

                {documentosFaltantes.map((doc) => (
                  <label
                    key={doc.id}
                    className="block p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                  >
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      onChange={(e) => handleSubirDocumento(e, doc.id)}
                      disabled={uploading}
                    />

                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                        {uploading && documentoSeleccionado === doc.id ? (
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        ) : (
                          <UploadCloud className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">
                          {doc.nombre}
                          {doc.esObligatorio && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {doc.descripcion}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, DOCX, JPG, PNG (máx 10MB)
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-2">
                <div className="flex justify-center">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="font-medium text-emerald-700">¡Documentación completa!</p>
                <p className="text-xs text-emerald-600">
                  Todos los documentos obligatorios han sido cargados
                </p>
              </div>
            )}

            {/* Información adicional */}
            {estadoDocumentos && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Documentos completos</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700">
                    {completados}
                  </Badge>
                </div>
                {estadoDocumentos.vencidos > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Documentos vencidos
                    </span>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700">
                      {estadoDocumentos.vencidos}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informativo */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Zap className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-amber-900">
                  Los campos marcados con * son obligatorios
                </p>
                <p className="text-amber-800">
                  Debes completar todos los documentos antes de que se inicie la evaluación
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botón de logout (opcional) */}
        <Button variant="outline" className="w-full" onClick={() => {
          window.location.href = '/'
        }}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
