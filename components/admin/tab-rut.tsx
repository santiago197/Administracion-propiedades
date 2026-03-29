'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Loader2, AlertCircle, Upload, CheckCircle2, Sparkles, Info } from 'lucide-react'
import type { PropuestaRutDatos } from '@/lib/types/index'

// ---------------------------------------------------------------------------
// Tipos locales (espejo del OCR — no importar desde el modelo con deps rotas)
// ---------------------------------------------------------------------------

type RUTData = {
  header: { nit: string; dv: string; direccionSeccional: string }
  identificacion: {
    tipoContribuyente: string
    razonSocial: string | null
    primerNombre: string | null
    primerApellido: string | null
    otrosNombres: string | null
  }
  ubicacion: {
    ciudad: string
    departamento: string
    direccion: string
    email: string
    telefono1: string
  }
  clasificacion: { actividadPrincipal: string }
  responsabilidades: { codigos: { codigo: string; nombre: string }[] }
  representantesLegales: {
    tipoRepresentacion: string
    tipoDocumento: string
    numeroIdentificacion: string
    primerNombre: string
    primerApellido: string
    segundoApellido: string | null
    otrosNombres: string | null
    fechaInicioVinculacion: string | null
    isPep?: boolean
    hasVinculoPep?: boolean
  }[]
  socios: {
    tipoDocumento: string
    numeroIdentificacion: string
    primerNombre: string | null
    primerApellido: string | null
    razonSocial: string | null
    porcentajeParticipacion: string | null
    isPep?: boolean
    hasVinculoPep?: boolean
  }[]
  revisorFiscalPrincipal: {
    tipoDocumento: string
    numeroIdentificacion: string
    primerNombre: string | null
    primerApellido: string | null
    segundoApellido: string | null
    nit?: string | null
    sociedadDesignada?: string | null
    tarjetaProfesional: string | null
    isPep?: boolean
    hasVinculoPep?: boolean
  } | null
  revisorFiscalSuplente: {
    tipoDocumento: string
    numeroIdentificacion: string
    primerNombre: string | null
    primerApellido: string | null
    tarjetaProfesional: string | null
    isPep?: boolean
    hasVinculoPep?: boolean
  } | null
  contador: {
    tipoDocumento: string
    numeroIdentificacion: string
    primerNombre: string | null
    primerApellido: string | null
    tarjetaProfesional: string | null
    nit?: string | null
    sociedadDesignada?: string | null
    isPep?: boolean
    hasVinculoPep?: boolean
  } | null
}

type OcrFn = (
  file: File,
  signal?: AbortSignal,
  onProgress?: (msg: string) => void
) => Promise<{
  statusCode: number
  success: boolean
  message: string
  data: { data: RUTData; processingTimeMs: number; pagesProcessed: number }
}>

// ---------------------------------------------------------------------------
// Tipo de formulario editable
// ---------------------------------------------------------------------------

type Representante = {
  tipoRepresentacion: string
  tipoDocumento: string
  numeroIdentificacion: string
  primerNombre: string
  primerApellido: string
  segundoApellido: string | null
  otrosNombres: string | null
  fechaInicioVinculacion: string | null
  isPep: boolean
  hasVinculoPep: boolean
}

type Socio = {
  tipoDocumento: string
  numeroIdentificacion: string
  primerNombre: string | null
  primerApellido: string | null
  razonSocial: string | null
  porcentajeParticipacion: string | null
  isPep: boolean
  hasVinculoPep: boolean
}

type FormRUT = {
  nit: string
  dv: string
  razonSocial: string
  tipoContribuyente: string
  ciudad: string
  departamento: string
  direccion: string
  email: string
  telefono: string
  actividadPrincipal: string
  responsabilidades: { codigo: string; nombre: string }[]
  representantes: Representante[]
  socios: Socio[]
  revisorFiscalPrincipal: Record<string, unknown> | null
  revisorFiscalSuplente: Record<string, unknown> | null
  contador: Record<string, unknown> | null
  hayAlertaPep: boolean
  nitCoincide: boolean | null
}

// ---------------------------------------------------------------------------
// Helpers de conversión
// ---------------------------------------------------------------------------

function emptyForm(): FormRUT {
  return {
    nit: '', dv: '', razonSocial: '', tipoContribuyente: '',
    ciudad: '', departamento: '', direccion: '', email: '', telefono: '',
    actividadPrincipal: '', responsabilidades: [],
    representantes: [], socios: [],
    revisorFiscalPrincipal: null, revisorFiscalSuplente: null, contador: null,
    hayAlertaPep: false, nitCoincide: null,
  }
}

function rutDataToForm(rut: RUTData, nitPropuesta: string): FormRUT {
  const hayPep =
    rut.representantesLegales.some((r) => r.isPep || r.hasVinculoPep) ||
    rut.socios.some((s) => s.isPep || s.hasVinculoPep) ||
    !!(rut.contador?.isPep)
  const nit = rut.header.nit || ''
  const nitNorm = (v: string) => v.replace(/[^0-9]/g, '')
  return {
    nit,
    dv: rut.header.dv || '',
    razonSocial:
      rut.identificacion.razonSocial ||
      [rut.identificacion.primerNombre, rut.identificacion.primerApellido]
        .filter(Boolean)
        .join(' '),
    tipoContribuyente: rut.identificacion.tipoContribuyente || '',
    ciudad: rut.ubicacion.ciudad || '',
    departamento: rut.ubicacion.departamento || '',
    direccion: rut.ubicacion.direccion || '',
    email: rut.ubicacion.email || '',
    telefono: rut.ubicacion.telefono1 || '',
    actividadPrincipal: rut.clasificacion.actividadPrincipal || '',
    responsabilidades: rut.responsabilidades.codigos,
    representantes: rut.representantesLegales.map((r) => ({
      tipoRepresentacion: r.tipoRepresentacion,
      tipoDocumento: r.tipoDocumento,
      numeroIdentificacion: r.numeroIdentificacion,
      primerNombre: r.primerNombre,
      primerApellido: r.primerApellido,
      segundoApellido: r.segundoApellido,
      otrosNombres: r.otrosNombres,
      fechaInicioVinculacion: r.fechaInicioVinculacion,
      isPep: r.isPep ?? false,
      hasVinculoPep: r.hasVinculoPep ?? false,
    })),
    socios: rut.socios.map((s) => ({
      tipoDocumento: s.tipoDocumento,
      numeroIdentificacion: s.numeroIdentificacion,
      primerNombre: s.primerNombre,
      primerApellido: s.primerApellido,
      razonSocial: s.razonSocial,
      porcentajeParticipacion: s.porcentajeParticipacion,
      isPep: s.isPep ?? false,
      hasVinculoPep: s.hasVinculoPep ?? false,
    })),
    revisorFiscalPrincipal: rut.revisorFiscalPrincipal as Record<string, unknown> | null,
    revisorFiscalSuplente: rut.revisorFiscalSuplente as Record<string, unknown> | null,
    contador: rut.contador as Record<string, unknown> | null,
    hayAlertaPep: hayPep,
    nitCoincide: nit ? nitNorm(nit) === nitNorm(nitPropuesta) : null,
  }
}

function dbToForm(d: PropuestaRutDatos): FormRUT {
  return {
    nit: d.nit_extraido || '',
    dv: d.dv_extraido || '',
    razonSocial: d.razon_social_extraida || '',
    tipoContribuyente: d.tipo_contribuyente || '',
    ciudad: '', departamento: '', direccion: '', email: '', telefono: '', actividadPrincipal: '',
    responsabilidades: d.responsabilidades,
    representantes: d.representantes_legales as Representante[],
    socios: d.socios as Socio[],
    revisorFiscalPrincipal: d.revisor_fiscal_principal,
    revisorFiscalSuplente: d.revisor_fiscal_suplente,
    contador: d.contador,
    hayAlertaPep: d.hay_alerta_pep,
    nitCoincide: d.nit_coincide,
  }
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

type Props = {
  propuestaId: string
  nitPropuesta: string
}

export function TabRut({ propuestaId, nitPropuesta }: Props) {
  const [file, setFile]               = useState<File | null>(null)
  const [status, setStatus]           = useState<
    'idle' | 'extracting' | 'extracted' | 'saving' | 'saved' | 'error'
  >('idle')
  const [progress, setProgress]       = useState('')
  const [form, setForm]               = useState<FormRUT | null>(null)
  const [isFromDB, setIsFromDB]       = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const abortRef                      = useRef<AbortController | null>(null)

  // -------------------------------------------------------------------------
  // Cargar datos existentes
  // -------------------------------------------------------------------------

  const loadExisting = useCallback(() => {
    fetch(`/api/propuestas/rut-datos?propuesta_id=${propuestaId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PropuestaRutDatos | null) => {
        if (data) {
          setForm(dbToForm(data))
          setIsFromDB(true)
          setStatus('extracted')
        }
      })
      .catch(() => {})
  }, [propuestaId])

  useEffect(() => {
    setForm(null)
    setFile(null)
    setStatus('idle')
    setError(null)
    setIsFromDB(false)
    loadExisting()
  }, [propuestaId, loadExisting])

  // -------------------------------------------------------------------------
  // Extracción OCR
  // -------------------------------------------------------------------------

  async function handleExtract() {
    if (!file) return
    abortRef.current = new AbortController()
    setStatus('extracting')
    setProgress('Iniciando procesamiento...')
    setError(null)

    try {
      // Dynamic import to avoid transitive broken imports (CamaraComercio model missing)
      const mod = (await import(
        // @ts-expect-error pre-existing module resolution error in OCRResponse.model.ts
        '@/components/admin/RegistroAutomaticoProveedores/services/ocr/analizarRutLocal'
      )) as unknown as { analizarRutLocal: OcrFn }

      const result = await mod.analizarRutLocal(
        file,
        abortRef.current.signal,
        (msg) => setProgress(msg)
      )

      if (!result.success) {
        setError(result.message)
        setStatus('error')
        return
      }

      setForm(rutDataToForm(result.data.data, nitPropuesta))
      setIsFromDB(false)
      setStatus('extracted')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setStatus('idle')
        setError(null)
      } else {
        setError(e instanceof Error ? e.message : 'Error al procesar el documento')
        setStatus('error')
      }
    }
  }

  function handleCancel() {
    abortRef.current?.abort()
    setStatus('idle')
    setProgress('')
  }

  // -------------------------------------------------------------------------
  // Guardar en base de datos
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!form) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/propuestas/rut-datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propuesta_id:              propuestaId,
          nit_extraido:              form.nit || null,
          dv_extraido:               form.dv || null,
          razon_social_extraida:     form.razonSocial || null,
          tipo_contribuyente:        form.tipoContribuyente || null,
          representantes_legales:    form.representantes,
          socios:                    form.socios,
          revisor_fiscal_principal:  form.revisorFiscalPrincipal,
          revisor_fiscal_suplente:   form.revisorFiscalSuplente,
          contador:                  form.contador,
          responsabilidades:         form.responsabilidades,
          hay_alerta_pep:            form.hayAlertaPep,
          nit_coincide:              form.nitCoincide,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al guardar')
      }
      setIsFromDB(true)
      setStatus('saved')
      setTimeout(() => setStatus('extracted'), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Renders parciales
  // -------------------------------------------------------------------------

  function Field({ label, value }: { label: string; value: string | null | undefined }) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '—'}</p>
      </div>
    )
  }

  function PepFlag({ isPep, hasVinculoPep }: { isPep?: boolean; hasVinculoPep?: boolean }) {
    return (
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>PEP: <span className={isPep ? 'text-destructive font-medium' : ''}>{isPep ? 'Sí' : 'No'}</span></span>
        <span>Administra recursos: <span className={hasVinculoPep ? 'text-destructive font-medium' : ''}>{hasVinculoPep ? 'Sí' : 'No'}</span></span>
      </div>
    )
  }

  function PersonaRow({ tipoDoc, numDoc, nombres, apellidos }: {
    tipoDoc: string; numDoc: string; nombres: string | null; apellidos: string | null
  }) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Field label="Tipo documento" value={tipoDoc} />
        <Field label="Número" value={numDoc} />
        <Field label="Nombres" value={nombres} />
        <Field label="Apellidos" value={apellidos} />
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Estado de extracción
  // -------------------------------------------------------------------------

  if (status === 'extracting') {
    return (
      <div className="space-y-4 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-medium">Procesando RUT...</p>
          {progress && <p className="text-sm text-muted-foreground">{progress}</p>}
        </div>
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={handleCancel}>Cancelar</Button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render principal
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Upload + extracción */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium">Cargar archivo RUT</p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                setStatus('idle')
                setError(null)
              }}
            />
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background text-sm hover:bg-accent transition-colors">
              <Upload className="h-4 w-4" />
              {file ? file.name : 'Seleccionar archivo'}
            </div>
          </label>
          {file && (
            <Button
              size="sm"
              onClick={handleExtract}
              disabled={status === 'extracting'}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              Extraer información del RUT
            </Button>
          )}
          {!file && form && (
            <p className="text-xs text-muted-foreground">Carga un nuevo archivo para re-extraer.</p>
          )}
        </div>
        {file && (
          <p className="text-xs text-muted-foreground">
            Archivo: <span className="font-medium">{file.name}</span> — {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>

      {/* Errores */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Saved confirmation */}
      {status === 'saved' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-500/10 p-3 rounded-md">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Datos del RUT guardados correctamente.
        </div>
      )}

      {/* Resultado */}
      {form && (
        <div className="space-y-4">
          {/* Banner IA */}
          {!isFromDB && (
            <div className="flex items-start gap-2 text-sm text-blue-700 bg-blue-500/10 border border-blue-200/60 p-3 rounded-md">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Datos extraídos con IA.</strong> Los datos pueden presentar inconsistencias.
                Verifique toda la información antes de guardar.
              </span>
              <Badge variant="outline" className="ml-auto shrink-0 text-blue-700 border-blue-300">
                Extraído con IA
              </Badge>
            </div>
          )}

          {/* Alerta PEP */}
          {form.hayAlertaPep && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <strong>Alerta PEP:</strong> Se detectaron personas políticamente expuestas. Revisión obligatoria.
            </div>
          )}

          {/* NIT coincidencia */}
          {form.nitCoincide !== null && (
            <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${form.nitCoincide ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700'}`}>
              {form.nitCoincide ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              {form.nitCoincide
                ? 'NIT extraído coincide con el NIT registrado en la propuesta.'
                : `NIT extraído (${form.nit}) difiere del NIT registrado (${nitPropuesta}). Verifique.`}
            </div>
          )}

          {/* Acordeón de secciones */}
          <Accordion type="multiple" defaultValue={['general', 'tributaria']} className="space-y-1">

            {/* 1. Información general */}
            <AccordionItem value="general" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium">Información general</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-2">
                  <Field label="Tipo de contribuyente" value={form.tipoContribuyente} />
                  <Field label="Razón social / Nombre" value={form.razonSocial} />
                  <Field label="NIT / Cédula" value={form.nit ? `${form.nit}${form.dv ? ` - ${form.dv}` : ''}` : null} />
                  <Field label="Ciudad" value={form.ciudad} />
                  <Field label="Departamento" value={form.departamento} />
                  <Field label="Dirección" value={form.direccion} />
                  <Field label="Email" value={form.email} />
                  <Field label="Teléfono" value={form.telefono} />
                  <div className="col-span-2">
                    <Field label="Actividad económica (CIIU)" value={form.actividadPrincipal} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Representantes legales */}
            {form.representantes.length > 0 && (
              <AccordionItem value="representantes" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium">
                  Representantes legales
                  <Badge variant="secondary" className="ml-2">{form.representantes.length}</Badge>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pb-2">
                    {form.representantes.map((r, i) => (
                      <div key={i} className="rounded-md border bg-muted/20 p-3 space-y-3">
                        <Badge variant="outline" className="capitalize">{r.tipoRepresentacion}</Badge>
                        <PersonaRow
                          tipoDoc={r.tipoDocumento}
                          numDoc={r.numeroIdentificacion}
                          nombres={r.primerNombre + (r.otrosNombres ? ` ${r.otrosNombres}` : '')}
                          apellidos={[r.primerApellido, r.segundoApellido].filter(Boolean).join(' ')}
                        />
                        <PepFlag isPep={r.isPep} hasVinculoPep={r.hasVinculoPep} />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* 3. Socios */}
            {form.socios.length > 0 && (
              <AccordionItem value="socios" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium">
                  Socios / Accionistas
                  <Badge variant="secondary" className="ml-2">{form.socios.length}</Badge>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pb-2">
                    {form.socios.map((s, i) => (
                      <div key={i} className="rounded-md border bg-muted/20 p-3 space-y-3">
                        <PersonaRow
                          tipoDoc={s.tipoDocumento}
                          numDoc={s.numeroIdentificacion}
                          nombres={s.primerNombre}
                          apellidos={s.primerApellido}
                        />
                        {s.razonSocial && <Field label="Razón social" value={s.razonSocial} />}
                        {s.porcentajeParticipacion && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Participación:</span>
                            <Badge variant="outline">{s.porcentajeParticipacion}%</Badge>
                          </div>
                        )}
                        <PepFlag isPep={s.isPep} hasVinculoPep={s.hasVinculoPep} />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* 4. Revisor Fiscal */}
            {(form.revisorFiscalPrincipal || form.revisorFiscalSuplente) && (
              <AccordionItem value="revisor" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium">Revisor Fiscal</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pb-2">
                    {([
                      { data: form.revisorFiscalPrincipal, label: 'Principal' },
                      { data: form.revisorFiscalSuplente, label: 'Suplente' },
                    ] as const).map(({ data, label }) => {
                      if (!data) return null
                      const d = data as Record<string, unknown>
                      return (
                        <div key={label} className="rounded-md border bg-muted/20 p-3 space-y-3">
                          <Badge variant="outline">{label}</Badge>
                          {d.nit && <Field label="NIT firma" value={String(d.nit)} />}
                          {d.sociedadDesignada && <Field label="Sociedad / Firma" value={String(d.sociedadDesignada)} />}
                          <PersonaRow
                            tipoDoc={String(d.tipoDocumento ?? '')}
                            numDoc={String(d.numeroIdentificacion ?? '')}
                            nombres={d.primerNombre ? String(d.primerNombre) : null}
                            apellidos={[d.primerApellido, d.segundoApellido].filter(Boolean).join(' ') || null}
                          />
                          {d.tarjetaProfesional && <Field label="Tarjeta profesional" value={String(d.tarjetaProfesional)} />}
                          <PepFlag isPep={Boolean(d.isPep)} hasVinculoPep={Boolean(d.hasVinculoPep)} />
                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* 5. Contador */}
            {form.contador && (
              <AccordionItem value="contador" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium">Contador</AccordionTrigger>
                <AccordionContent>
                  <div className="pb-2 space-y-3">
                    {(() => {
                      const d = form.contador as Record<string, unknown>
                      return (
                        <>
                          {d.nit && <Field label="NIT firma" value={String(d.nit)} />}
                          {d.sociedadDesignada && <Field label="Sociedad / Firma" value={String(d.sociedadDesignada)} />}
                          <PersonaRow
                            tipoDoc={String(d.tipoDocumento ?? '')}
                            numDoc={String(d.numeroIdentificacion ?? '')}
                            nombres={d.primerNombre ? String(d.primerNombre) : null}
                            apellidos={d.primerApellido ? String(d.primerApellido) : null}
                          />
                          {d.tarjetaProfesional && <Field label="Tarjeta profesional" value={String(d.tarjetaProfesional)} />}
                          <PepFlag isPep={Boolean(d.isPep)} hasVinculoPep={Boolean(d.hasVinculoPep)} />
                        </>
                      )
                    })()}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* 6. Información tributaria */}
            {form.responsabilidades.length > 0 && (
              <AccordionItem value="tributaria" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium">Información tributaria</AccordionTrigger>
                <AccordionContent>
                  <div className="pb-2 space-y-3">
                    <p className="text-xs text-muted-foreground">Responsabilidades extraídas del RUT (casilla 53)</p>
                    <div className="flex flex-wrap gap-2">
                      {form.responsabilidades.map((r) => (
                        <Badge
                          key={r.codigo}
                          variant="outline"
                          title={r.nombre}
                          className="cursor-help"
                        >
                          {r.codigo}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-1 mt-2">
                      {form.responsabilidades.map((r) => (
                        <div key={r.codigo} className="flex items-baseline gap-2 text-xs">
                          <span className="font-medium tabular-nums w-6">{r.codigo}</span>
                          <span className="text-muted-foreground">{r.nombre}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isFromDB ? 'Actualizar en base de datos' : 'Guardar en base de datos'}
            </Button>
            {!isFromDB && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setForm(null); setFile(null); setStatus('idle') }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!form && status !== 'extracting' && (
        <div className="text-center py-8 text-muted-foreground space-y-2">
          <Upload className="h-10 w-10 mx-auto opacity-30" />
          <p className="text-sm">Carga el archivo PDF del RUT para extraer la información automáticamente.</p>
          <p className="text-xs">Soporta PDFs digitales y escaneados.</p>
        </div>
      )}
    </div>
  )
}
