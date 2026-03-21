'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { Propuesta, TipoPersona } from '@/lib/types/index'

const TIPOS_PERSONA: TipoPersona[] = ['juridica', 'natural']

interface FormPropuestaProps {
  procesoId: string
  onSuccess: (propuesta: Propuesta) => void
  loading?: boolean
}

export function FormPropuesta({ procesoId, onSuccess, loading = false }: FormPropuestaProps) {
  const [formData, setFormData] = useState({
    tipo_persona: 'juridica' as TipoPersona,
    razon_social: '',
    nit_cedula: '',
    representante_legal: '',
    anios_experiencia: 0,
    unidades_administradas: 0,
    telefono: '',
    email: '',
    direccion: '',
    valor_honorarios: '',
    observaciones: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'anios_experiencia' || name === 'unidades_administradas'
        ? parseInt(value, 10) || 0
        : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/propuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          proceso_id: procesoId,
          valor_honorarios: formData.valor_honorarios ? parseFloat(formData.valor_honorarios) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al crear propuesta')
      }

      const data = await response.json()
      setFormData({
        tipo_persona: 'juridica',
        razon_social: '',
        nit_cedula: '',
        representante_legal: '',
        anios_experiencia: 0,
        unidades_administradas: 0,
        telefono: '',
        email: '',
        direccion: '',
        valor_honorarios: '',
        observaciones: '',
      })
      onSuccess(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('[v0] Form error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border border-border/50 bg-card/50 p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="tipo_persona">Tipo de Persona</FieldLabel>
              <select
                id="tipo_persona"
                name="tipo_persona"
                value={formData.tipo_persona}
                onChange={handleChange}
                required
                disabled={loading || isSubmitting}
                className="flex h-10 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
              >
                <option value="juridica" className="bg-card">Persona Jurídica</option>
                <option value="natural" className="bg-card">Persona Natural</option>
              </select>
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="razon_social">
                {formData.tipo_persona === 'juridica' ? 'Razón Social' : 'Nombre Completo'}
              </FieldLabel>
              <Input
                id="razon_social"
                name="razon_social"
                placeholder={formData.tipo_persona === 'juridica' 
                  ? 'Ej: Administradora ABC SAS'
                  : 'Ej: Juan García Pérez'}
                value={formData.razon_social}
                onChange={handleChange}
                required
                disabled={loading || isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nit_cedula">
                {formData.tipo_persona === 'juridica' ? 'NIT' : 'Cédula'}
              </FieldLabel>
              <Input
                id="nit_cedula"
                name="nit_cedula"
                placeholder="Ej: 1234567890"
                value={formData.nit_cedula}
                onChange={handleChange}
                required
                disabled={loading || isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>

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
                  disabled={loading || isSubmitting}
                  className="border-border/50"
                />
              </Field>
            </FieldGroup>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="anios_experiencia">Años de Experiencia</FieldLabel>
                <Input
                  id="anios_experiencia"
                  name="anios_experiencia"
                  type="number"
                  min="0"
                  value={formData.anios_experiencia}
                  onChange={handleChange}
                  disabled={loading || isSubmitting}
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
                  value={formData.unidades_administradas}
                  onChange={handleChange}
                  disabled={loading || isSubmitting}
                  className="border-border/50"
                />
              </Field>
            </FieldGroup>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Ej: contacto@administradora.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading || isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="telefono">Teléfono</FieldLabel>
              <Input
                id="telefono"
                name="telefono"
                placeholder="Ej: +57 312 345 6789"
                value={formData.telefono}
                onChange={handleChange}
                disabled={loading || isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="direccion">Dirección</FieldLabel>
              <Input
                id="direccion"
                name="direccion"
                placeholder="Ej: Carrera 5 No. 10-20"
                value={formData.direccion}
                onChange={handleChange}
                disabled={loading || isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="valor_honorarios">Valor de Honorarios Mensuales</FieldLabel>
              <Input
                id="valor_honorarios"
                name="valor_honorarios"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 2500000"
                value={formData.valor_honorarios}
                onChange={handleChange}
                disabled={loading || isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="observaciones">Observaciones</FieldLabel>
              <textarea
                id="observaciones"
                name="observaciones"
                placeholder="Notas adicionales sobre la propuesta"
                value={formData.observaciones}
                onChange={handleChange}
                disabled={loading || isSubmitting}
                className="flex min-h-[100px] w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
              />
            </Field>
          </FieldGroup>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || isSubmitting}
          className="w-full"
        >
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
