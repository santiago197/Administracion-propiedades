'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Consejero, CargoCohnsejero } from '@/lib/types/index'

const CARGOS: Array<{ value: CargoCohnsejero; label: string }> = [
  { value: 'presidente', label: 'Presidente' },
  { value: 'vicepresidente', label: 'Vicepresidente' },
  { value: 'secretario', label: 'Secretario' },
  { value: 'tesorero', label: 'Tesorero' },
  { value: 'vocal_principal', label: 'Vocal principal' },
  { value: 'consejero', label: 'Consejero' },
  { value: 'consejero_suplente', label: 'Consejero suplente' },
]

interface FormConsejeroProps {
  conjuntoId: string
  onSuccess: (consejero: Consejero) => void
  loading?: boolean
}

export function FormConsejero({ conjuntoId, onSuccess, loading = false }: FormConsejeroProps) {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    cargo: 'consejero' as CargoCohnsejero,
    apartamento: '',
    torre: '',
    email: '',
    telefono: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCargoChange = (value: CargoCohnsejero) => {
    setFormData((prev) => ({
      ...prev,
      cargo: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/consejeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          conjunto_id: conjuntoId,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al crear consejero')
      }

      const data = await response.json()
      setFormData({
        nombre_completo: '',
        cargo: 'consejero',
        apartamento: '',
        torre: '',
        email: '',
        telefono: '',
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
              <FieldLabel htmlFor="nombre_completo">Nombre Completo</FieldLabel>
              <Input
                id="nombre_completo"
                name="nombre_completo"
                placeholder="Ej: Juan Pérez García"
                value={formData.nombre_completo}
                onChange={handleChange}
                required
                disabled={loading || isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cargo">Cargo</FieldLabel>
              <Select
                value={formData.cargo}
                onValueChange={handleCargoChange}
                disabled={loading || isSubmitting}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un cargo" />
                </SelectTrigger>
                <SelectContent>
                  {CARGOS.map((cargo) => (
                    <SelectItem key={cargo.value} value={cargo.value}>
                      {cargo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="torre">Torre (Opcional)</FieldLabel>
                <Input
                  id="torre"
                  name="torre"
                  placeholder="Ej: A"
                  value={formData.torre}
                  onChange={handleChange}
                  disabled={loading || isSubmitting}
                  className="border-border/50"
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="apartamento">Apartamento</FieldLabel>
                <Input
                  id="apartamento"
                  name="apartamento"
                  placeholder="Ej: 501"
                  value={formData.apartamento}
                  onChange={handleChange}
                  required
                  disabled={loading || isSubmitting}
                  className="border-border/50"
                />
              </Field>
            </FieldGroup>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email (Opcional)</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Ej: juan@ejemplo.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading || isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="telefono">Teléfono (Opcional)</FieldLabel>
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
              Agregando...
            </>
          ) : (
            'Agregar Consejero'
          )}
        </Button>
      </form>
    </Card>
  )
}
