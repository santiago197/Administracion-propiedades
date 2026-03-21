'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { Conjunto } from '@/lib/types'

interface FormConjuntoProps {
  onSuccess: (conjunto: Conjunto) => void
  loading?: boolean
}

export function FormConjunto({ onSuccess, loading = false }: FormConjuntoProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    ciudad: '',
    anio: new Date().getFullYear(),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'anio' ? parseInt(value, 10) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/conjuntos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Error al crear conjunto')
      }

      const data = await response.json()
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
              <FieldLabel htmlFor="nombre">Nombre del Conjunto</FieldLabel>
              <Input
                id="nombre"
                name="nombre"
                placeholder="Ej: Residencias Metropolitanas"
                value={formData.nombre}
                onChange={handleChange}
                required
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
                placeholder="Ej: Carrera 7 No. 45-50"
                value={formData.direccion}
                onChange={handleChange}
                required
                disabled={loading || isSubmitting}
                className="border-border/50"
              />
            </Field>
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ciudad">Ciudad</FieldLabel>
                <Input
                  id="ciudad"
                  name="ciudad"
                  placeholder="Ej: Bogotá"
                  value={formData.ciudad}
                  onChange={handleChange}
                  required
                  disabled={loading || isSubmitting}
                  className="border-border/50"
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="anio">Año de Fundación</FieldLabel>
                <Input
                  id="anio"
                  name="anio"
                  type="number"
                  value={formData.anio}
                  onChange={handleChange}
                  required
                  disabled={loading || isSubmitting}
                  className="border-border/50"
                />
              </Field>
            </FieldGroup>
          </div>
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
              Creando...
            </>
          ) : (
            'Crear Conjunto'
          )}
        </Button>
      </form>
    </Card>
  )
}
