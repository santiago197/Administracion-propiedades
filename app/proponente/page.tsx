'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  KeyRound,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Building2,
  RefreshCw,
  X,
  FileUp,
} from 'lucide-react'

// Tipos
interface Documento {
  id: string
  nombre: string
  descripcion: string
  requerido: boolean
  estado: 'pendiente' | 'cargado' | 'rechazado'
  archivo?: string
  fechaCarga?: string
  observacion?: string
}

interface ProcesoInfo {
  id: string
  nombre: string
  conjunto: string
  proponente: string
  nit: string
  fechaLimite: string
  documentos: Documento[]
}

// Datos mock para simular respuesta del backend
const MOCK_PROCESO: ProcesoInfo = {
  id: 'proc-001',
  nombre: 'Selección Administrador 2024',
  conjunto: 'Conjunto Residencial Los Robles',
  proponente: 'Administraciones Integrales S.A.S',
  nit: '900.123.456-7',
  fechaLimite: '2024-02-15',
  documentos: [
    {
      id: 'doc-1',
      nombre: 'Cámara de Comercio',
      descripcion: 'Certificado de existencia y representación legal (vigente)',
      requerido: true,
      estado: 'cargado',
      archivo: 'camara_comercio.pdf',
      fechaCarga: '2024-01-20',
    },
    {
      id: 'doc-2',
      nombre: 'RUT',
      descripcion: 'Registro Único Tributario actualizado',
      requerido: true,
      estado: 'pendiente',
    },
    {
      id: 'doc-3',
      nombre: 'Estados Financieros',
      descripcion: 'Estados financieros del último año fiscal',
      requerido: true,
      estado: 'rechazado',
      observacion: 'El documento está incompleto, falta el estado de resultados.',
    },
    {
      id: 'doc-4',
      nombre: 'Póliza de Responsabilidad Civil',
      descripcion: 'Póliza vigente con cobertura mínima de 500 SMLMV',
      requerido: true,
      estado: 'pendiente',
    },
    {
      id: 'doc-5',
      nombre: 'Certificaciones Laborales',
      descripcion: 'Certificaciones de experiencia en administración de PH',
      requerido: false,
      estado: 'pendiente',
    },
    {
      id: 'doc-6',
      nombre: 'Propuesta Económica',
      descripcion: 'Propuesta de honorarios y servicios incluidos',
      requerido: true,
      estado: 'cargado',
      archivo: 'propuesta_economica.pdf',
      fechaCarga: '2024-01-22',
    },
  ],
}

// Componente de Dropzone
function FileDropzone({
  documento,
  onUpload,
  isUploading,
}: {
  documento: Documento
  onUpload: (file: File) => void
  isUploading: boolean
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }, [])

  const handleUploadClick = () => {
    if (selectedFile) {
      onUpload(selectedFile)
      setSelectedFile(null)
    }
  }

  const inputId = `file-${documento.id}`

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`p-3 rounded-full ${isDragging ? 'bg-primary/10' : 'bg-muted'}`}>
            <FileUp className={`h-6 w-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          
          {selectedFile ? (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium">Arrastra tu archivo aquí</p>
                <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar</p>
              </div>
              <p className="text-xs text-muted-foreground">Solo archivos PDF (máx. 10MB)</p>
            </>
          )}
        </div>

        <input
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
      </div>

      {selectedFile && (
        <Button 
          onClick={handleUploadClick} 
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir documento
            </>
          )}
        </Button>
      )}
    </div>
  )
}

// Componente de tarjeta de documento
function DocumentoCard({
  documento,
  onUpload,
  uploadingId,
}: {
  documento: Documento
  onUpload: (docId: string, file: File) => void
  uploadingId: string | null
}) {
  const isUploading = uploadingId === documento.id

  const estadoBadge = {
    pendiente: { variant: 'secondary' as const, icon: Clock, label: 'Pendiente', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
    cargado: { variant: 'secondary' as const, icon: CheckCircle, label: 'Cargado', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
    rechazado: { variant: 'destructive' as const, icon: AlertCircle, label: 'Rechazado', className: '' },
  }

  const estado = estadoBadge[documento.estado]
  const IconEstado = estado.icon

  return (
    <Card className={documento.estado === 'rechazado' ? 'border-destructive/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{documento.nombre}</CardTitle>
              {documento.requerido && (
                <span className="text-xs text-destructive font-medium">*Requerido</span>
              )}
            </div>
            <CardDescription className="mt-1">{documento.descripcion}</CardDescription>
          </div>
          <Badge variant={estado.variant} className={`shrink-0 ${estado.className}`}>
            <IconEstado className="mr-1 h-3 w-3" />
            {estado.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mostrar observación si fue rechazado */}
        {documento.estado === 'rechazado' && documento.observacion && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{documento.observacion}</AlertDescription>
          </Alert>
        )}

        {/* Mostrar archivo cargado */}
        {documento.estado === 'cargado' && documento.archivo && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{documento.archivo}</p>
                {documento.fechaCarga && (
                  <p className="text-xs text-muted-foreground">
                    Cargado el {new Date(documento.fechaCarga).toLocaleDateString('es-CO')}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-3 w-3" />
              Reemplazar
            </Button>
          </div>
        )}

        {/* Dropzone para documentos pendientes o rechazados */}
        {(documento.estado === 'pendiente' || documento.estado === 'rechazado') && (
          <FileDropzone
            documento={documento}
            onUpload={(file) => onUpload(documento.id, file)}
            isUploading={isUploading}
          />
        )}
      </CardContent>
    </Card>
  )
}

// Página principal
export default function ProponentePage() {
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [proceso, setProceso] = useState<ProcesoInfo | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  // Simular validación de código
  const handleValidarCodigo = async () => {
    if (!codigo.trim()) {
      setError('Por favor ingresa tu código de acceso')
      return
    }

    setError('')
    setLoading(true)

    // Simular llamada al backend
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Código válido de prueba: "ABC123"
    if (codigo.toUpperCase() === 'ABC123') {
      setProceso(MOCK_PROCESO)
    } else {
      setError('Código de acceso inválido. Verifica e intenta nuevamente.')
    }

    setLoading(false)
  }

  // Simular subida de documento
  const handleUpload = async (docId: string, file: File) => {
    setUploadingId(docId)
    setUploadSuccess(null)

    // Simular upload
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Actualizar estado del documento
    setProceso((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        documentos: prev.documentos.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                estado: 'cargado' as const,
                archivo: file.name,
                fechaCarga: new Date().toISOString().split('T')[0],
                observacion: undefined,
              }
            : doc
        ),
      }
    })

    setUploadingId(null)
    setUploadSuccess(docId)

    // Limpiar mensaje de éxito después de 3 segundos
    setTimeout(() => setUploadSuccess(null), 3000)
  }

  // Pantalla de acceso
  if (!proceso) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Portal de Proponentes</CardTitle>
            <CardDescription className="mt-2">
              Ingresa tu código de acceso para cargar la documentación requerida
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="codigo" className="text-sm font-medium">
                Código de acceso
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="codigo"
                  type="text"
                  placeholder="Ej: ABC123"
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value.toUpperCase())
                    setError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidarCodigo()}
                  className="pl-10 uppercase"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleValidarCodigo} 
              disabled={loading} 
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                'Ingresar'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              El código fue enviado por el conjunto residencial al correo registrado
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calcular estadísticas
  const totalDocs = proceso.documentos.length
  const docsCargados = proceso.documentos.filter((d) => d.estado === 'cargado').length
  const docsPendientes = proceso.documentos.filter((d) => d.estado === 'pendiente').length
  const docsRechazados = proceso.documentos.filter((d) => d.estado === 'rechazado').length
  const progreso = Math.round((docsCargados / totalDocs) * 100)

  // Pantalla de carga de documentos
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{proceso.nombre}</h1>
              <p className="text-sm text-muted-foreground">{proceso.conjunto}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{proceso.proponente}</p>
                <p className="text-xs text-muted-foreground">NIT: {proceso.nit}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setProceso(null)}
              >
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Mensaje de éxito */}
        {uploadSuccess && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Documento cargado exitosamente
            </AlertDescription>
          </Alert>
        )}

        {/* Resumen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen de documentación</CardTitle>
            <CardDescription>
              Fecha límite de entrega: {new Date(proceso.fechaLimite).toLocaleDateString('es-CO', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Barra de progreso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso de carga</span>
                  <span className="font-medium">{progreso}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{docsCargados}</p>
                  <p className="text-xs text-green-600">Cargados</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-700">{docsPendientes}</p>
                  <p className="text-xs text-amber-600">Pendientes</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">{docsRechazados}</p>
                  <p className="text-xs text-red-600">Rechazados</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Lista de documentos */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Documentos requeridos</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            {proceso.documentos.map((documento) => (
              <DocumentoCard
                key={documento.id}
                documento={documento}
                onUpload={handleUpload}
                uploadingId={uploadingId}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
