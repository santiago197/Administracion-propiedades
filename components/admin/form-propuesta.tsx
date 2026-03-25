'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { Propuesta, TipoPersona } from '@/lib/types/index'
import { useRutAutocompletado } from './RegistroAutomaticoProveedores/hooks/useRutAutocompletado'

// ---------------------------------------------------------------------------
// Tipos internos del formulario
// Usamos strings para todos los campos para que los inputs HTML sean simples.
// La conversión numérica ocurre solo al enviar.
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

// ---------------------------------------------------------------------------
// Validación de campos requeridos en el cliente
// Retorna un objeto con los errores por campo, o null si todo está bien.
// ---------------------------------------------------------------------------
function validateForm(data: FormFields): Partial<Record<keyof FormFields, string>> | null {
  const errors: Partial<Record<keyof FormFields, string>> = {}

  if (!data.razon_social.trim()) {
    errors.razon_social =
      data.tipo_persona === 'juridica'
        ? 'La razón social es requerida'
        : 'El nombre completo es requerido'
  }

  if (!data.nit_cedula.trim()) {
    errors.nit_cedula =
      data.tipo_persona === 'juridica' ? 'El NIT es requerido' : 'La cédula es requerida'
  }

  if (!data.email.trim()) {
    errors.email = 'El email de contacto es requerido'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Ingresa un email válido'
  }

  return Object.keys(errors).length > 0 ? errors : null
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export function FormPropuesta({ procesoId, onSuccess }: FormPropuestaProps) {
  const [formData, setFormData] = useState<FormFields>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormFields, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [rutAutocompletado, setRutAutocompletado] = useState(false)

  const rutInputRef = useRef<HTMLInputElement>(null)
  const { extraerRut, extrayendo, progreso, error: errorRut, datos: datosRut, limpiar } = useRutAutocompletado()

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name as keyof FormFields]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleRutFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const datos = await extraerRut(file)
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
    setRutAutocompletado(true)
  }

  const handleDescartarRut = () => {
    limpiar()
    setRutAutocompletado(false)
    setFormData(EMPTY_FORM)
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
      const res = await fetch('/api/propuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proceso_id: procesoId,
          tipo_persona: formData.tipo_persona,
          razon_social: formData.razon_social.trim(),
          nit_cedula: formData.nit_cedula.trim(),
          representante_legal: formData.representante_legal.trim() || null,
          anios_experiencia: formData.anios_experiencia
            ? parseInt(formData.anios_experiencia, 10)
            : 0,
          unidades_administradas: formData.unidades_administradas
            ? parseInt(formData.unidades_administradas, 10)
            : 0,
          telefono: formData.telefono.trim() || null,
          email: formData.email.trim().toLowerCase(),
          direccion: formData.direccion.trim() || null,
          valor_honorarios: formData.valor_honorarios
            ? parseFloat(formData.valor_honorarios)
            : null,
          observaciones: formData.observaciones.trim() || null,
        }),
      })

      const responseData = await res.json()

      if (!res.ok) {
        const serverMessage = responseData?.error ?? `Error del servidor (${res.status})`
        throw new Error(serverMessage)
      }

      setFormData(EMPTY_FORM)
      limpiar()
      setRutAutocompletado(false)
      onSuccess(responseData as Propuesta)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error desconocido al crear la propuesta'
      setSubmitError(message)
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

        {/* ── Sección RUT ── */}
        <div className="rounded-md border border-border/50 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Autocompletar desde RUT</p>
            {rutAutocompletado && (
              <button
                type="button"
                onClick={handleDescartarRut}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Descartar
              </button>
            )}
          </div>

          {!rutAutocompletado ? (
            <>
              <Input
                ref={rutInputRef}
                type="file"
                accept=".pdf"
                disabled={extrayendo}
                onChange={handleRutFileChange}
                className="border-border/50 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Sube el PDF del RUT para completar automáticamente los campos del formulario.
              </p>
            </>
          ) : null}

          {extrayendo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4 shrink-0" />
              <span>{progreso || 'Procesando...'}</span>
            </div>
          )}

          {errorRut && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
              {errorRut}
            </div>
          )}

          {rutAutocompletado && datosRut && (
            <div className="space-y-2">
              <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs text-emerald-700">
                Campos completados desde RUT · NIT extraído: <span className="font-medium">{datosRut.nitCompleto}</span>
              </div>

              {datosRut.hayAlertaPep && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-700">
                  Alerta PEP: se detectaron personas expuestas políticamente en representantes o socios. Verifique en validación legal.
                </div>
              )}
            </div>
          )}
        </div>

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

        {/* Razón social / Nombre */}
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
              Email
              <span className="text-destructive ml-1">*</span>
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

        <Button type="submit" disabled={isSubmitting} className="w-full">
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
