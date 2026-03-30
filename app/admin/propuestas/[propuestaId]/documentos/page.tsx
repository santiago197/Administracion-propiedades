'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProtectedPage } from '@/hooks/use-protected-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileCheck,
  FileX,
  Loader2,
  Trash2,
  ExternalLink
} from 'lucide-react'
import type { Documento, TipoDocumentoConfig, TipoPersonaDocumento } from '@/lib/types/index'

interface DocumentosStatus {
  propuesta_id: string
  razon_social?: string
  tipo_persona: TipoPersonaDocumento
  documentos: Documento[]
  tipos_faltantes: TipoDocumentoConfig[]
  tipos_cubiertos: TipoDocumentoConfig[]
  estadisticas: {
    total_obligatorios: number
    completados: number
    faltantes: number
    porcentaje: number
    vencidos: number
  }
}

export default function DocumentosPropuestaPage() {
  useProtectedPage()
  const params = useParams()
  const router = useRouter()
  const propuestaId = params.propuestaId as string

  const [status, setStatus] = useState<DocumentosStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTipo, setSelectedTipo] = useState<string>('')
  const [otroNombre, setOtroNombre] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const cargarStatus = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/propuestas/${propuestaId}/documentos-status`)
      if (!res.ok) {
        throw new Error('Error al cargar documentos')
      }
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar los documentos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (propuestaId) {
      cargarStatus()
    }
  }, [propuestaId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedTipo) return

    const file = e.target.files[0]
    setIsUploading(true)

    try {
      // Encontrar el tipo de documento seleccionado
      const tipoDoc = (status?.tipos_faltantes ?? []).find(t => t.id === selectedTipo)
      const esOtro = selectedTipo === 'otros'

      if (!tipoDoc && !esOtro) {
        toast.error('Tipo de documento no encontrado')
        return
      }
      if (esOtro && !otroNombre.trim()) {
        toast.error('Ingresa un nombre para el documento')
        return
      }

      // 1. Subir archivo a storage
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'documentos')
      formData.append('type', 'documento')

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const uploadError = await uploadRes.json()
        throw new Error(uploadError.error || 'Error al subir archivo')
      }

      const uploadData = await uploadRes.json()

      // 2. Crear registro en la tabla documentos
      const docRes = await fetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propuesta_id: propuestaId,
          tipo: esOtro ? 'otro' : tipoDoc.codigo,
          nombre: esOtro ? otroNombre.trim() : tipoDoc.nombre,
          archivo_url: uploadData.url,
          archivo_pathname: uploadData.pathname,
          es_obligatorio: esOtro ? false : tipoDoc.es_obligatorio,
          estado: 'cargado',
          tipo_documento_id: esOtro ? null : tipoDoc.id,
          fecha_vencimiento: !esOtro && tipoDoc.dias_vigencia > 0
            ? new Date(Date.now() + tipoDoc.dias_vigencia * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : null,
        }),
      })

      if (!docRes.ok) {
        const docError = await docRes.json()
        throw new Error(docError.error || 'Error al registrar documento')
      }

      toast.success('Documento subido correctamente')
      setSelectedTipo('')
      setOtroNombre('')
      cargarStatus()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al subir el documento')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (documentoId: string) => {
    if (!confirm('¿Está seguro de eliminar este documento?')) return

    setIsDeleting(documentoId)
    try {
      const res = await fetch(`/api/documentos?id=${documentoId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Error al eliminar')
      }
      toast.success('Documento eliminado')
      cargarStatus()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar el documento')
    } finally {
      setIsDeleting(null)
    }
  }

  const getEstadoDocumento = (documento: Documento) => {
    if (!documento.fecha_vencimiento) return 'vigente'
    const vencimiento = new Date(documento.fecha_vencimiento)
    const hoy = new Date()
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diasRestantes < 0) return 'vencido'
    if (diasRestantes <= 30) return 'por_vencer'
    return 'vigente'
  }

  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Vigente</Badge>
      case 'por_vencer':
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" />Por vencer</Badge>
      case 'vencido':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Vencido</Badge>
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!status) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <FileX className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No se pudo cargar la información de documentos</p>
            <Button variant="outline" onClick={() => router.back()} className="mt-4">
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/documentos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">Documentos de propuesta</p>
          <h1 className="text-2xl font-bold">{status.razon_social || 'Propuesta'}</h1>
          <p className="text-muted-foreground">
            Tipo: {status.tipo_persona === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{status.estadisticas.completados}</p>
                <p className="text-sm text-muted-foreground">Completados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileX className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{status.estadisticas.faltantes}</p>
                <p className="text-sm text-muted-foreground">Faltantes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{status.estadisticas.vencidos}</p>
                <p className="text-sm text-muted-foreground">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span className="font-medium">{status.estadisticas.porcentaje}%</span>
              </div>
              <Progress value={status.estadisticas.porcentaje} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Documentos cargados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos Cargados ({status.documentos.length})
            </CardTitle>
            <CardDescription>
              Documentos que ya han sido subidos para esta propuesta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status.documentos.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FileX className="w-10 h-10 mx-auto mb-2 opacity-50" />
                No hay documentos cargados
              </div>
            ) : (
              <div className="space-y-3">
                {status.documentos.map((doc) => {
                  const estado = getEstadoDocumento(doc)
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString('es-CO')}
                            {doc.fecha_vencimiento && (
                              <span className="ml-2">
                                · Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString('es-CO')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getBadgeEstado(estado)}
                        {doc.archivo_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(doc.id)}
                          disabled={isDeleting === doc.id}
                        >
                          {isDeleting === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos faltantes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileX className="w-5 h-5 text-red-500" />
              Documentos Pendientes ({status.tipos_faltantes.length})
            </CardTitle>
            <CardDescription>
              Documentos requeridos que aún no han sido cargados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status.tipos_faltantes.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="text-muted-foreground">Todos los documentos obligatorios están completos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {status.tipos_faltantes.map((tipo) => (
                  <div
                    key={tipo.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-dashed border-red-200 bg-red-50/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileX className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium">{tipo.nombre}</p>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <span>{tipo.categoria}</span>
                          {tipo.es_obligatorio && (
                            <Badge variant="outline" className="text-xs">Obligatorio</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subir documento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Subir Nuevo Documento
          </CardTitle>
          <CardDescription>
            Seleccione el tipo de documento y suba el archivo correspondiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
             <Select value={selectedTipo} onValueChange={(val) => { setSelectedTipo(val); setOtroNombre('') }}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Seleccione tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                {status.tipos_faltantes.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id}>
                    {tipo.nombre} {tipo.es_obligatorio && '(Obligatorio)'}
                  </SelectItem>
                ))}
                <SelectItem value="otros">Otros (adjuntar adicional)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1">
              {selectedTipo === 'otros' && (
                <div className="mb-2">
                  <Label className="text-xs">Nombre del documento</Label>
                  <Input
                    placeholder="Ej: Certificado adicional"
                    value={otroNombre}
                    onChange={(e) => setOtroNombre(e.target.value)}
                    disabled={isUploading}
                  />
                </div>
              )}
              <label className="relative">
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={!selectedTipo || isUploading}
                />
                <Button
                  variant="default"
                  className="w-full sm:w-auto cursor-pointer"
                  disabled={!selectedTipo || isUploading || (selectedTipo === 'otros' && !otroNombre.trim())}
                  onClick={() => {
                    const input = document.querySelector('input[type="file"]') as HTMLInputElement
                    input?.click()
                  }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Seleccionar Archivo
                    </>
                  )}
                </Button>
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                Formatos aceptados: PDF, DOC, DOCX, JPG, PNG. Máximo 10MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
