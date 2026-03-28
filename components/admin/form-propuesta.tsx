'use client'

import { useRef, useState } from 'react'
import { ScanSearch, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { Propuesta, TipoPersona } from '@/lib/types/index'
import {
  useRutAutocompletado,
  type DatosRutExtraidos,
} from './RegistroAutomaticoProveedores/hooks/useRutAutocompletado'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------
interface FormFields {
  tipo_persona: TipoPersona
  razon_social: string
  nit_cedula: string
  representante_legal: string
  anios_experiencia: string
  unidades_administradas: string
  telefono: string
  email: string
  direccion: string
  valor_honorarios: string
  observaciones: string
}

const EMPTY_FORM: FormFields = {
  tipo_persona: 'juridica',
  razon_social: '',
  nit_cedula: '',
  representante_legal: '',
  anios_experiencia: '',
  unidades_administradas: '',
  telefono: '',
  email: '',
  direccion: '',
  valor_honorarios: '',
  observaciones: '',
}

interface FormPropuestaProps {
  procesoId: string
  onSuccess: (propuesta: Propuesta) => void
}

function validateForm(data: FormFields): Partial<Record<keyof FormFields, string>> | null {
  const errors: Partial<Record<keyof FormFields, string>> = {}

  if (!data.razon_social.trim()) {
    errors.razon_social =
      data.tipo_persona === 'juridica' ? 'La razón social es requerida' : 'El nombre completo es requerido'
  }
  if (!data.nit_cedula.trim()) {
    errors.nit_cedula = data.tipo_persona === 'juridica' ? 'El NIT es requerido' : 'La cédula es requerida'
  }
  if (!data.email.trim()) {
    errors.email = 'El email de contacto es requerido'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Ingresa un email válido'
  }

  return Object.keys(errors).length > 0 ? errors : null
}

// ---------------------------------------------------------------------------
// Sub-componente: sección de revisión de datos del RUT (solo lectura + PEP)
// ---------------------------------------------------------------------------
export function SeccionRevisionRut({ datos }: { datos: DatosRutExtraidos }) {
  return (
    <div className="space-y-4 rounded-md border border-border/50 bg-muted/20 p-4">
      <p className="text-sm font-medium text-foreground">Datos extraídos del RUT</p>

      {/* Alerta PEP */}
      {datos.hayAlertaPep && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          Alerta PEP detectada: uno o más representantes o socios están marcados como Personas
          Expuestas Políticamente. Esta información quedará registrada para validación legal.
        </div>
      )}

      {/* Representantes legales */}
      {datos.representantes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Representantes Legales
          </p>
          <div className="space-y-1">
            {datos.representantes.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md border border-border/40 bg-background px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{r.nombre}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{r.tipoRepresentacion}</span>
                </div>
                {(r.isPep || r.hasVinculoPep) && (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs">
                    PEP
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Socios */}
      {datos.socios.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Socios / Beneficiarios
          </p>
          <div className="space-y-1">
            {datos.socios.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md border border-border/40 bg-background px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{s.nombre || '—'}</span>
                  {s.porcentaje && (
                    <span className="ml-2 text-xs text-muted-foreground">{s.porcentaje}%</span>
                  )}
                </div>
                {(s.isPep || s.hasVinculoPep) && (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs">
                    PEP
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function FormPropuesta({ procesoId, onSuccess }: FormPropuestaProps) {
  const [formData, setFormData] = useState<FormFields>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormFields, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const rutInputRef = useRef<HTMLInputElement>(null)
  const [archivoRut, setArchivoRut] = useState<File | null>(null)
  const { extraerRut, extrayendo, progreso, error: errorRut, datos: datosRut, limpiar } =
    useRutAutocompletado()

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name as keyof FormFields]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleRutFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setArchivoRut(file)
  }

  const handleExtraerRut = async () => {
    if (!archivoRut) return
    const datos = await extraerRut(archivoRut)
    if (!datos) return
    setFormData((prev) => ({
      ...prev,
      tipo_persona: datos.tipoPersona,
      razon_social: datos.razonSocial || prev.razon_social,
      nit_cedula: datos.nitCompleto || prev.nit_cedula,
      representante_legal: datos.representanteLegal || prev.representante_legal,
      email: datos.email || prev.email,
      telefono: datos.telefono || prev.telefono,
      direccion: datos.direccion || prev.direccion,
    }))
    setFieldErrors({})
  }

  const handleDescartarRut = () => {
    limpiar()
    setArchivoRut(null)
    setFormData(EMPTY_FORM)
    setFieldErrors({})
    if (rutInputRef.current) rutInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    const errors = validateForm(formData)
    if (errors) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      // 1. Crear propuesta
      const propuestaRes = await fetch('/api/propuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proceso_id: procesoId,
          tipo_persona: formData.tipo_persona,
          razon_social: formData.razon_social.trim(),
          nit_cedula: formData.nit_cedula.trim(),
          representante_legal: formData.representante_legal.trim() || null,
          anios_experiencia: formData.anios_experiencia ? parseInt(formData.anios_experiencia, 10) : 0,
          unidades_administradas: formData.unidades_administradas
            ? parseInt(formData.unidades_administradas, 10)
            : 0,
          telefono: formData.telefono.trim() || null,
          email: formData.email.trim().toLowerCase(),
          direccion: formData.direccion.trim() || null,
          valor_honorarios: formData.valor_honorarios ? parseFloat(formData.valor_honorarios) : null,
          observaciones: formData.observaciones.trim() || null,
        }),
      })

      const propuestaData = await propuestaRes.json()
      if (!propuestaRes.ok) {
        throw new Error(propuestaData?.error ?? `Error del servidor (${propuestaRes.status})`)
      }

      const propuesta = propuestaData as Propuesta

      // 2. Si se procesó un RUT, guardar los datos extendidos
      if (datosRut) {
        const nitRegistrado = formData.nit_cedula.trim()
        const nitCoincide = nitRegistrado
          .replace(/[^0-9]/g, '')
          .startsWith(datosRut.nit.replace(/[^0-9]/g, ''))

        await fetch('/api/propuestas/rut-datos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propuesta_id: propuesta.id,
            nit_extraido: datosRut.nit,
            dv_extraido: datosRut.dv,
            razon_social_extraida: datosRut.razonSocial,
            tipo_contribuyente: datosRut.tipoPersona === 'juridica' ? 'Persona jurídica' : 'Persona natural',
            representantes_legales: datosRut.representantes,
            socios: datosRut.socios,
            hay_alerta_pep: datosRut.hayAlertaPep,
            nit_coincide: nitCoincide,
          }),
        })
        // No bloqueamos el flujo si falla el guardado de metadatos
      }

      // 3. Limpiar y notificar
      setFormData(EMPTY_FORM)
      limpiar()
      if (rutInputRef.current) rutInputRef.current.value = ''
      onSuccess(propuesta)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error desconocido al crear la propuesta')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <Card className="border border-border/50 bg-card/50 p-6">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* ── Carga de RUT ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              RUT {datosRut ? '' : '(opcional)'}
            </p>
            {(archivoRut || datosRut) && (
              <button
                type="button"
                onClick={handleDescartarRut}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
                Descartar
              </button>
            )}
          </div>

          {/* Input oculto */}
          <input
            ref={rutInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleRutFileChange}
          />

          {/* Estado: sin archivo seleccionado */}
          {!archivoRut && !datosRut && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-border/70 text-muted-foreground hover:text-foreground hover:border-border"
                onClick={() => rutInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Adjuntar RUT (PDF)
              </Button>
              <p className="text-xs text-muted-foreground">
                Extrae razón social, NIT, representante legal y detecta alertas PEP automáticamente.
              </p>
            </div>
          )}

          {/* Estado: archivo seleccionado, pendiente de extracción */}
          {archivoRut && !datosRut && !extrayendo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm text-foreground truncate flex-1">{archivoRut.name}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-primary/40 text-primary hover:bg-primary/5"
                onClick={handleExtraerRut}
              >
                <ScanSearch className="h-4 w-4 mr-2" />
                Extraer información del RUT
              </Button>
            </div>
          )}

          {/* Estado: extrayendo */}
          {extrayendo && (
            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4 shrink-0" />
              <span>{progreso || 'Procesando RUT...'}</span>
            </div>
          )}

          {/* Estado: error */}
          {errorRut && !extrayendo && (
            <p className="text-xs text-destructive">{errorRut}</p>
          )}

          {/* Estado: extracción exitosa */}
          {datosRut && !extrayendo && (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">
              RUT procesado · NIT extraído: <span className="font-medium">{datosRut.nitCompleto}</span>
            </div>
          )}
        </div>

        {/* ── Revisión de datos del RUT (representantes, socios, PEP) ── */}
        {datosRut && <SeccionRevisionRut datos={datosRut} />}

        {/* ── Separador visual cuando viene del RUT ── */}
        {datosRut && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-4">
            Revisa y ajusta los campos antes de registrar la propuesta.
          </p>
        )}

        {/* Tipo de persona */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="tipo_persona">Tipo de Persona</FieldLabel>
            <select
              id="tipo_persona"
              name="tipo_persona"
              value={formData.tipo_persona}
              onChange={handleChange}
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
            >
              <option value="juridica" className="bg-card">Persona Jurídica</option>
              <option value="natural" className="bg-card">Persona Natural</option>
            </select>
          </Field>
        </FieldGroup>

        {/* Razón social */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="razon_social">
              {formData.tipo_persona === 'juridica' ? 'Razón Social' : 'Nombre Completo'}
              <span className="text-destructive ml-1">*</span>
            </FieldLabel>
            <Input
              id="razon_social"
              name="razon_social"
              placeholder={
                formData.tipo_persona === 'juridica'
                  ? 'Ej: Administradora ABC SAS'
                  : 'Ej: Juan García Pérez'
              }
              value={formData.razon_social}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`border-border/50 ${fieldErrors.razon_social ? 'border-destructive' : ''}`}
            />
            {fieldErrors.razon_social && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.razon_social}</p>
            )}
          </Field>
        </FieldGroup>

        {/* NIT / Cédula */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="nit_cedula">
              {formData.tipo_persona === 'juridica' ? 'NIT' : 'Cédula'}
              <span className="text-destructive ml-1">*</span>
            </FieldLabel>
            <Input
              id="nit_cedula"
              name="nit_cedula"
              placeholder="Ej: 900123456-1"
              value={formData.nit_cedula}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`border-border/50 ${fieldErrors.nit_cedula ? 'border-destructive' : ''}`}
            />
            {fieldErrors.nit_cedula && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.nit_cedula}</p>
            )}
          </Field>
        </FieldGroup>

        {/* Representante legal (solo jurídica) */}
        {formData.tipo_persona === 'juridica' && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="representante_legal">Representante Legal</FieldLabel>
              <Input
                id="representante_legal"
                name="representante_legal"
                placeholder="Ej: María García López"
                value={formData.representante_legal}
                onChange={handleChange}
                disabled={isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>
        )}

        {/* Experiencia y unidades */}
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="anios_experiencia">Años de Experiencia</FieldLabel>
              <Input
                id="anios_experiencia"
                name="anios_experiencia"
                type="number"
                min="0"
                max="99"
                placeholder="Ej: 5"
                value={formData.anios_experiencia}
                onChange={handleChange}
                disabled={isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="unidades_administradas">Unidades Administradas</FieldLabel>
              <Input
                id="unidades_administradas"
                name="unidades_administradas"
                type="number"
                min="0"
                placeholder="Ej: 120"
                value={formData.unidades_administradas}
                onChange={handleChange}
                disabled={isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>
        </div>

        {/* Email */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">
              Email <span className="text-destructive ml-1">*</span>
            </FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Ej: contacto@administradora.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`border-border/50 ${fieldErrors.email ? 'border-destructive' : ''}`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
            )}
          </Field>
        </FieldGroup>

        {/* Teléfono */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="telefono">Teléfono</FieldLabel>
            <Input
              id="telefono"
              name="telefono"
              placeholder="Ej: +57 312 345 6789"
              value={formData.telefono}
              onChange={handleChange}
              disabled={isSubmitting}
              className="border-border/50"
            />
          </Field>
        </FieldGroup>

        {/* Dirección */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="direccion">Dirección</FieldLabel>
            <Input
              id="direccion"
              name="direccion"
              placeholder="Ej: Carrera 5 No. 10-20"
              value={formData.direccion}
              onChange={handleChange}
              disabled={isSubmitting}
              className="border-border/50"
            />
          </Field>
        </FieldGroup>

        {/* Valor honorarios */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="valor_honorarios">Valor de Honorarios Mensuales</FieldLabel>
            <Input
              id="valor_honorarios"
              name="valor_honorarios"
              type="number"
              min="0"
              step="1000"
              placeholder="Ej: 2500000"
              value={formData.valor_honorarios}
              onChange={handleChange}
              disabled={isSubmitting}
              className="border-border/50"
            />
          </Field>
        </FieldGroup>

        {/* Observaciones */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="observaciones">Observaciones</FieldLabel>
            <textarea
              id="observaciones"
              name="observaciones"
              placeholder="Notas adicionales sobre la propuesta"
              value={formData.observaciones}
              onChange={handleChange}
              disabled={isSubmitting}
              rows={3}
              className="flex w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50 resize-none"
            />
          </Field>
        </FieldGroup>

        {submitError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
            {submitError}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting || extrayendo} className="w-full">
          {isSubmitting ? (
            <>
              <Spinner className="h-4 w-4 mr-2" />
              Registrando...
            </>
          ) : (
            'Registrar Propuesta'
          )}
        </Button>
      </form>
    </Card>
  )
}
