'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useRutAutocompletado } from '@/components/admin/RegistroAutomaticoProveedores/hooks/useRutAutocompletado'
import { Spinner } from '@/components/ui/spinner'
import type { Proceso, Propuesta, PropuestaRutDatos } from '@/lib/types'

type DocumentoRow = {
  id: string
  propuesta_id: string
  nombre: string
  tipo: string
  estado: 'pendiente' | 'completo' | 'incompleto' | 'vencido'
  fecha_vencimiento?: string | null
  archivo_url?: string | null
}

type EstadoResumen = 'completo' | 'incompleto' | 'vencido'
type TipoDocumentoValue =
  | 'camara_comercio'
  | 'rut'
  | 'certificacion'
  | 'poliza'
  | 'estados_financieros'
  | 'referencia'
  | 'otro'

type RutFormState = {
  nit: string
  dv: string
  razonSocial: string
  tipoContribuyente: string
  revisorNombre: string
  contadorNombre: string
}

type RutRepresentanteItem = {
  nombre: string
  tipoRepresentacion: string
  isPep: boolean
  hasVinculoPep: boolean
}

type RutSocioItem = {
  nombre: string
  porcentaje: string
  isPep: boolean
  hasVinculoPep: boolean
}

const estadoClase: Record<string, string> = {
  completo: 'bg-emerald-500/10 text-emerald-700',
  pendiente: 'bg-amber-500/10 text-amber-700',
  incompleto: 'bg-amber-500/10 text-amber-700',
  vencido: 'bg-destructive/10 text-destructive',
}

function formatDate(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-CO')
}

const tiposDocumento: Array<{ value: TipoDocumentoValue; label: string }> = [
  { value: 'camara_comercio', label: 'Cámara de comercio' },
  { value: 'rut', label: 'RUT' },
  { value: 'certificacion', label: 'Certificación' },
  { value: 'poliza', label: 'Póliza' },
  { value: 'estados_financieros', label: 'Estados financieros' },
  { value: 'referencia', label: 'Referencia' },
  { value: 'otro', label: 'Otro' },
]

export default function DocumentosPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openUpload, setOpenUpload] = useState(false)
  const [saving, setSaving] = useState(false)
  const [conjuntoId, setConjuntoId] = useState<string | null>(null)
  const [procesoId, setProcesoId] = useState<string | null>(null)
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [documentosByPropuesta, setDocumentosByPropuesta] = useState<Record<string, DocumentoRow[]>>({})
  const [selectedPropuestaId, setSelectedPropuestaId] = useState<string | null>(null)
  const [rutForm, setRutForm] = useState<RutFormState | null>(null)
  const [rutRepresentantes, setRutRepresentantes] = useState<RutRepresentanteItem[]>([])
  const [rutSocios, setRutSocios] = useState<RutSocioItem[]>([])
  const [savingRut, setSavingRut] = useState(false)
  const [nitCoincidePersistente, setNitCoincidePersistente] = useState<boolean | null>(null)
  const { upload, uploading } = useFileUpload()
  const { extraerRut, limpiar: limpiarRut, extrayendo: extrayendoRut, progreso: progresoRut, error: errorRut, datos: datosRut } = useRutAutocompletado()
  const rutFileRef = useRef<HTMLInputElement>(null)
  const [uploadForm, setUploadForm] = useState({
    propuesta_id: '',
    tipo: 'otro' as TipoDocumentoValue,
    nombre: '',
    estado: 'pendiente' as DocumentoRow['estado'],
    fecha_vencimiento: '',
    observaciones: '',
    es_obligatorio: false,
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const propuestaSeleccionada = propuestas.find((p) => p.id === uploadForm.propuesta_id) ?? null

  const nitCoincideExtraido =
    datosRut && propuestaSeleccionada
      ? propuestaSeleccionada.nit_cedula.replace(/[^0-9]/g, '').startsWith(datosRut.nit.replace(/[^0-9]/g, ''))
      : null

  const nitCoincide = nitCoincideExtraido ?? nitCoincidePersistente

  // Inicializar formulario editable del RUT a partir de los datos extraídos
  useEffect(() => {
    if (datosRut) {
      setRutForm({
        nit: datosRut.nit,
        dv: datosRut.dv,
        razonSocial: datosRut.razonSocial,
        tipoContribuyente:
          datosRut.tipoPersona === 'juridica' ? 'Persona jurídica' : 'Persona natural',
        revisorNombre: '',
        contadorNombre: '',
      })
      setRutRepresentantes(datosRut.representantes ?? [])
      setRutSocios(datosRut.socios ?? [])
      setNitCoincidePersistente(null)
    } else {
      setRutForm(null)
      setRutRepresentantes([])
      setRutSocios([])
    }
  }, [datosRut])

  const handleArchivoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setUploadFile(file)
    limpiarRut()
    if (file && uploadForm.tipo === 'rut') {
      await extraerRut(file)
    }
  }

  useEffect(() => {
    if (!uploadForm.propuesta_id || datosRut) {
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const loadRutDesdeDB = async () => {
      try {
        const res = await fetch(`/api/propuestas/rut-datos?propuesta_id=${uploadForm.propuesta_id}`, {
          signal: controller.signal,
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as PropuestaRutDatos | null
        if (!data || cancelled) return

        setRutForm({
          nit: data.nit_extraido ?? '',
          dv: data.dv_extraido ?? '',
          razonSocial: data.razon_social_extraida ?? '',
          tipoContribuyente: data.tipo_contribuyente ?? '',
          revisorNombre:
            data.revisor_fiscal_principal && typeof data.revisor_fiscal_principal === 'object'
              ? String(
                  (data.revisor_fiscal_principal as any).sociedadDesignada ??
                    (data.revisor_fiscal_principal as any).nombre ??
                    ''
                )
              : '',
          contadorNombre:
            data.contador && typeof data.contador === 'object'
              ? String((data.contador as any).nombre ?? '')
              : '',
        })

        setRutRepresentantes(
          (data.representantes_legales ?? []).map((r) => ({
            nombre:
              (r as any).razonSocial ||
              [r.primerNombre, r.otrosNombres, r.primerApellido, r.segundoApellido]
                .filter(Boolean)
                .join(' ') ||
              '',
            tipoRepresentacion: r.tipoRepresentacion,
            isPep: r.isPep,
            hasVinculoPep: r.hasVinculoPep,
          }))
        )

        setRutSocios(
          (data.socios ?? []).map((s) => ({
            nombre:
              s.razonSocial ||
              [s.primerNombre, s.primerApellido].filter(Boolean).join(' ') ||
              '',
            porcentaje: s.porcentajeParticipacion || '',
            isPep: s.isPep,
            hasVinculoPep: s.hasVinculoPep,
          }))
        )

        setNitCoincidePersistente(data.nit_coincide ?? null)
      } catch (error) {
        if (controller.signal.aborted || cancelled) return
      }
    }

    loadRutDesdeDB()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [uploadForm.propuesta_id, datosRut])

  const loadDocumentosByPropuestas = async (propuestasData: Propuesta[]) => {
    if (propuestasData.length === 0) {
      setDocumentosByPropuesta({})
      return
    }

    const results = await Promise.all(
      propuestasData.map(async (propuesta) => {
        const docsRes = await fetch(`/api/documentos?propuesta_id=${propuesta.id}`)
        if (!docsRes.ok) throw new Error(`No se pudieron obtener documentos de ${propuesta.razon_social}`)
        const docs = (await docsRes.json()) as DocumentoRow[]
        return [propuesta.id, docs] as const
      })
    )

    setDocumentosByPropuesta(Object.fromEntries(results))
  }

  const loadProcesoData = async (targetProcesoId: string) => {
    const propuestasRes = await fetch(`/api/propuestas?proceso_id=${targetProcesoId}`)
    if (!propuestasRes.ok) throw new Error('No se pudieron obtener las propuestas')
    const propuestasData = (await propuestasRes.json()) as Propuesta[]
    setPropuestas(propuestasData)
    await loadDocumentosByPropuestas(propuestasData)

    setUploadForm((prev) => ({
      ...prev,
      propuesta_id: propuestasData[0]?.id ?? '',
    }))
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const conjuntoRes = await fetch('/api/conjuntos')
        if (!conjuntoRes.ok) throw new Error('No se pudo obtener el conjunto')
        const conjunto = await conjuntoRes.json()
        if (!conjunto?.id) throw new Error('No hay conjunto asociado')
        setConjuntoId(conjunto.id)

        const procesosRes = await fetch(`/api/procesos?conjunto_id=${conjunto.id}`)
        if (!procesosRes.ok) throw new Error('No se pudieron obtener los procesos')
        const procesos = (await procesosRes.json()) as Proceso[]
        const procesoActivo =
          procesos.find((proceso) => proceso.estado === 'configuracion' || proceso.estado === 'evaluacion' || proceso.estado === 'votacion') ??
          procesos[0]

        if (!procesoActivo) {
          setPropuestas([])
          setDocumentosByPropuesta({})
          setProcesoId(null)
          return
        }

        setProcesoId(procesoActivo.id)
        await loadProcesoData(procesoActivo.id)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSubmitUpload = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!uploadForm.propuesta_id) {
      setError('Debes seleccionar una propuesta')
      return
    }

    if (!uploadForm.nombre.trim()) {
      setError('El nombre del documento es obligatorio')
      return
    }

    if (!uploadFile) {
      setError('Debes seleccionar un archivo')
      return
    }

    const propuestaActual = propuestas.find((p) => p.id === uploadForm.propuesta_id) ?? null

    try {
      setSaving(true)

      const uploadResult = await upload(uploadFile, `propuestas/${uploadForm.propuesta_id}`)

      const payload = {
        propuesta_id: uploadForm.propuesta_id,
        tipo: uploadForm.tipo,
        nombre: uploadForm.nombre.trim(),
        estado: uploadForm.estado,
        fecha_vencimiento: uploadForm.fecha_vencimiento || null,
        observaciones: uploadForm.observaciones.trim() || null,
        es_obligatorio: uploadForm.es_obligatorio,
        archivo_url: uploadResult.url ?? null,
        archivo_pathname: uploadResult.pathname ?? null,
      }

      const response = await fetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(responseData.error || 'Error al crear documento')
      }

      await loadDocumentosByPropuestas(propuestas)

      setUploadForm({
        propuesta_id: propuestas[0]?.id ?? '',
        tipo: 'otro',
        nombre: '',
        estado: 'pendiente',
        fecha_vencimiento: '',
        observaciones: '',
        es_obligatorio: false,
      })
      setUploadFile(null)
      setOpenUpload(false)
      setSuccessMessage('Documento cargado correctamente')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleGuardarRut = async () => {
    if (!propuestaSeleccionada || !rutForm) return

    setSavingRut(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const hayAlertaPep =
        rutRepresentantes.some((r) => r.isPep || r.hasVinculoPep) ||
        rutSocios.some((s) => s.isPep || s.hasVinculoPep)

      const payload = {
        propuesta_id: propuestaSeleccionada.id,
        nit_extraido: rutForm.nit || null,
        dv_extraido: rutForm.dv || null,
        razon_social_extraida: rutForm.razonSocial || null,
        tipo_contribuyente: rutForm.tipoContribuyente || null,
        representantes_legales: rutRepresentantes.map((r) => ({
          tipoRepresentacion: r.tipoRepresentacion,
          tipoDocumento: '',
          numeroIdentificacion: '',
          primerNombre: r.nombre,
          primerApellido: '',
          segundoApellido: null,
          otrosNombres: null,
          fechaInicioVinculacion: null,
          isPep: r.isPep,
          hasVinculoPep: r.hasVinculoPep,
        })),
        socios: rutSocios.map((s) => ({
          tipoDocumento: '',
          numeroIdentificacion: '',
          primerNombre: null,
          primerApellido: null,
          razonSocial: s.nombre,
          porcentajeParticipacion: s.porcentaje || null,
          isPep: s.isPep,
          hasVinculoPep: s.hasVinculoPep,
        })),
        revisor_fiscal_principal: rutForm.revisorNombre
          ? { nombre: rutForm.revisorNombre }
          : null,
        revisor_fiscal_suplente: null,
        contador: rutForm.contadorNombre ? { nombre: rutForm.contadorNombre } : null,
        responsabilidades: [] as any[],
        hay_alerta_pep: hayAlertaPep,
        nit_coincide: nitCoincide,
      }

      const res = await fetch('/api/propuestas/rut-datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || 'Error al guardar datos del RUT')
      }

      setSuccessMessage('Datos del RUT guardados correctamente')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar datos del RUT'
      setError(message)
    } finally {
      setSavingRut(false)
    }
  }

  const resumenPorPropuesta = useMemo(() => {
    return propuestas.map((propuesta) => {
      const docs = documentosByPropuesta[propuesta.id] ?? []
      const total = docs.length
      const completos = docs.filter((doc) => doc.estado === 'completo').length
      const hayVencido = docs.some((doc) => doc.estado === 'vencido')
      const estado: EstadoResumen = hayVencido ? 'vencido' : completos === total && total > 0 ? 'completo' : 'incompleto'
      const avance = total > 0 ? Math.round((completos / total) * 100) : 0
      return { propuesta, docs, estado, total, avance }
    })
  }, [propuestas, documentosByPropuesta])

  const documentosFlat = useMemo(() => {
    return resumenPorPropuesta.flatMap((item) =>
      item.docs.map((doc) => ({
        ...doc,
        propuesta: item.propuesta.razon_social,
        propuesta_id: item.propuesta.id,
      }))
    )
  }, [resumenPorPropuesta])

  const documentosFiltrados = useMemo(
    () =>
      selectedPropuestaId
        ? documentosFlat.filter((doc) => doc.propuesta_id === selectedPropuestaId)
        : documentosFlat,
    [documentosFlat, selectedPropuestaId]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Soportes por propuesta</p>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Vista por propuesta con indicadores de completitud y vencimiento.
          </p>
        </div>
        <Dialog
          open={openUpload}
          onOpenChange={(open) => {
            setOpenUpload(open)
            if (!open) {
              limpiarRut()
              setUploadFile(null)
            }
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <form onSubmit={handleSubmitUpload}>
              <DialogHeader>
                <DialogTitle>Cargar documento</DialogTitle>
                <DialogDescription>Adjunta un soporte a una propuesta del proceso activo.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="propuesta_id">Propuesta *</Label>
                  <Select
                    value={uploadForm.propuesta_id}
                    onValueChange={(value) => setUploadForm((prev) => ({ ...prev, propuesta_id: value }))}
                  >
                    <SelectTrigger id="propuesta_id">
                      <SelectValue placeholder="Selecciona una propuesta" />
                    </SelectTrigger>
                    <SelectContent>
                      {propuestas.map((propuesta) => (
                        <SelectItem key={propuesta.id} value={propuesta.id}>
                          {propuesta.razon_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo de documento *</Label>
                    <Select
                      value={uploadForm.tipo}
                      onValueChange={(value: TipoDocumentoValue) => {
                        setUploadForm((prev) => ({ ...prev, tipo: value }))
                        limpiarRut()
                      }}
                    >
                      <SelectTrigger id="tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposDocumento.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado *</Label>
                    <Select
                      value={uploadForm.estado}
                      onValueChange={(value: DocumentoRow['estado']) =>
                        setUploadForm((prev) => ({ ...prev, estado: value }))
                      }
                    >
                      <SelectTrigger id="estado">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="completo">Completo</SelectItem>
                        <SelectItem value="incompleto">Incompleto</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del documento *</Label>
                  <Input
                    id="nombre"
                    value={uploadForm.nombre}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Certificado de Cámara de Comercio"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="archivo">Archivo *</Label>
                  <Input
                    ref={rutFileRef}
                    id="archivo"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleArchivoChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Formatos permitidos: PDF, DOC, DOCX.</p>
                </div>

                {/* Panel de validación RUT (solo cuando tipo = 'rut') */}
                {uploadForm.tipo === 'rut' && (
                  <div className="rounded-md border border-border/50 bg-muted/30 p-3 space-y-2">
                    {extrayendoRut && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="h-4 w-4 shrink-0" />
                        <span>{progresoRut || 'Procesando RUT...'}</span>
                      </div>
                    )}

                    {errorRut && (
                      <p className="text-xs text-destructive">{errorRut}. Puede continuar con la carga manual.</p>
                    )}

                    {datosRut && !extrayendoRut && (
                      <div className="space-y-1.5">
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">RUT extraído:</span>{' '}
                          {datosRut.razonSocial} · NIT {datosRut.nitCompleto}
                        </div>

                        {nitCoincide === true && (
                          <p className="text-xs text-emerald-700">
                            NIT coincide con la propuesta seleccionada.
                          </p>
                        )}

                        {nitCoincide === false && (
                          <p className="text-xs text-amber-700">
                            El NIT del RUT ({datosRut.nitCompleto}) no coincide con el registrado en la propuesta ({propuestaSeleccionada?.nit_cedula}). Verifique antes de guardar.
                          </p>
                        )}

                        {datosRut.hayAlertaPep && (
                          <p className="text-xs text-amber-700">
                            Alerta PEP: se detectaron personas expuestas políticamente. Revise en validación legal.
                          </p>
                        )}
                      </div>
                    )}

                    {!uploadFile && !extrayendoRut && !datosRut && (
                      <p className="text-xs text-muted-foreground">
                        Al seleccionar el PDF del RUT se extraerán y validarán los datos automáticamente.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fecha_vencimiento">Fecha de vencimiento</Label>
                  <Input
                    id="fecha_vencimiento"
                    type="date"
                    value={uploadForm.fecha_vencimiento}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, fecha_vencimiento: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={uploadForm.observaciones}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                    rows={3}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={uploadForm.es_obligatorio}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, es_obligatorio: e.target.checked }))}
                  />
                  Documento obligatorio
                </label>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpenUpload(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || uploading}>
                  {saving || uploading ? 'Cargando...' : 'Guardar documento'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Cargando soportes...</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8">
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          </CardContent>
        </Card>
      ) : !procesoId ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No hay procesos disponibles para consultar soportes.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Estado por propuesta</CardTitle>
              <CardDescription>Completo / incompleto / vencido</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {resumenPorPropuesta.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay propuestas en el proceso actual.</p>
              ) : (
                resumenPorPropuesta.map((item) => (
                  <div
                    key={item.propuesta.id}
                    className={`rounded-lg border bg-muted/40 p-3 space-y-3 ${
                      selectedPropuestaId === item.propuesta.id ? 'border-primary/70' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPropuestaId(item.propuesta.id)
                            setUploadForm((prev) => ({ ...prev, propuesta_id: item.propuesta.id }))
                            setOpenUpload(true)
                          }}
                          className="font-semibold text-left text-primary hover:underline"
                        >
                          {item.propuesta.razon_social}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {item.total} documentos
                          {selectedPropuestaId === item.propuesta.id && ' · seleccionada'}
                        </p>
                      </div>
                      <Badge className={estadoClase[item.estado] ?? ''} variant="outline">
                        {item.estado.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={item.avance} className="flex-1" />
                      <span className="text-xs font-semibold">{item.avance}%</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {item.docs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-md border px-2 py-1">
                          <span>{doc.tipo}</span>
                          <div className="flex items-center gap-2">
                            <Badge className={estadoClase[doc.estado] ?? ''} variant="outline">
                              {doc.estado}
                            </Badge>
                            <span className="text-muted-foreground">{formatDate(doc.fecha_vencimiento)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Control documental</CardTitle>
              <CardDescription>Completo / pendiente / vencido</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedPropuestaId && (
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Filtrando por:{' '}
                    <span className="font-medium">
                      {propuestas.find((p) => p.id === selectedPropuestaId)?.razon_social ?? 'Propuesta'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPropuestaId(null)}
                    className="text-primary hover:underline"
                  >
                    Quitar filtro
                  </button>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Propuesta</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No hay documentos registrados para este proceso.
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentosFiltrados.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPropuestaId(doc.propuesta_id)
                              setUploadForm((prev) => ({ ...prev, propuesta_id: doc.propuesta_id }))
                              setOpenUpload(true)
                            }}
                            className="text-left text-primary hover:underline"
                          >
                            {doc.propuesta}
                          </button>
                        </TableCell>
                        <TableCell>{doc.nombre}</TableCell>
                        <TableCell>
                          <Badge className={estadoClase[doc.estado] ?? ''} variant="outline">
                            {doc.estado.charAt(0).toUpperCase() + doc.estado.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(doc.fecha_vencimiento)}</TableCell>
                        <TableCell className="text-right">
                          {doc.archivo_url ? (
                            <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">
                                Ver
                              </Button>
                            </a>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              Sin archivo
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {propuestaSeleccionada && rutForm && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Información general del RUT</CardTitle>
                <CardDescription>
                  {rutForm.razonSocial || propuestaSeleccionada.razon_social}
                  {rutForm.nit && ` · NIT ${rutForm.nit}${rutForm.dv ? `-${rutForm.dv}` : ''}`}
                  {nitCoincide === true && ' — NIT coincide con la propuesta seleccionada.'}
                  {nitCoincide === false &&
                    ` — El NIT no coincide con el registrado en la propuesta (${propuestaSeleccionada.nit_cedula}).`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Razón social</Label>
                    <Input
                      value={rutForm.razonSocial}
                      onChange={(e) => setRutForm({ ...rutForm, razonSocial: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2 col-span-2">
                      <Label>NIT</Label>
                      <Input value={rutForm.nit} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>DV</Label>
                      <Input value={rutForm.dv} readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de contribuyente</Label>
                    <Input
                      value={rutForm.tipoContribuyente}
                      onChange={(e) => setRutForm({ ...rutForm, tipoContribuyente: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Revisor fiscal principal</Label>
                    <Input
                      placeholder="Nombre completo"
                      value={rutForm.revisorNombre}
                      onChange={(e) => setRutForm({ ...rutForm, revisorNombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contador</Label>
                    <Input
                      placeholder="Nombre completo"
                      value={rutForm.contadorNombre}
                      onChange={(e) => setRutForm({ ...rutForm, contadorNombre: e.target.value })}
                    />
                  </div>
                </div>

                {rutRepresentantes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Representantes legales
                    </p>
                    <div className="space-y-2">
                      {rutRepresentantes.map((r, idx) => (
                        <div
                          key={idx}
                          className="space-y-2 rounded-md border border-border/40 bg-background px-3 py-2 text-sm"
                        >
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Nombre</Label>
                              <Input
                                value={r.nombre}
                                onChange={(e) => {
                                  const next = [...rutRepresentantes]
                                  next[idx] = { ...next[idx], nombre: e.target.value }
                                  setRutRepresentantes(next)
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tipo de representación</Label>
                              <Input
                                value={r.tipoRepresentacion}
                                onChange={(e) => {
                                  const next = [...rutRepresentantes]
                                  next[idx] = { ...next[idx], tipoRepresentacion: e.target.value }
                                  setRutRepresentantes(next)
                                }}
                              />
                            </div>
                          </div>
                          {(r.isPep || r.hasVinculoPep) && (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs"
                            >
                              PEP
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rutSocios.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Socios / Accionistas
                    </p>
                    <div className="space-y-2">
                      {rutSocios.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-md border border-border/40 bg-background px-3 py-2 text-sm"
                        >
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Nombre / Razón social</Label>
                            <Input
                              value={s.nombre}
                              onChange={(e) => {
                                const next = [...rutSocios]
                                next[idx] = { ...next[idx], nombre: e.target.value }
                                setRutSocios(next)
                              }}
                            />
                          </div>
                          <div className="w-28 space-y-1">
                            <Label className="text-xs">% participación</Label>
                            <Input
                              value={s.porcentaje}
                              onChange={(e) => {
                                const next = [...rutSocios]
                                next[idx] = { ...next[idx], porcentaje: e.target.value }
                                setRutSocios(next)
                              }}
                            />
                          </div>
                          {(s.isPep || s.hasVinculoPep) && (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs"
                            >
                              PEP
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleGuardarRut}
                    disabled={savingRut || !propuestaSeleccionada || !rutForm}
                  >
                    {savingRut ? 'Guardando...' : 'Guardar datos del RUT'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Conjunto actual: {conjuntoId ?? 'N/A'}.
      </p>
    </div>
  )
}
