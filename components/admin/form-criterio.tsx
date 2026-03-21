'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { Criterio, TipoCriterio } from '@/lib/types/index'

const TIPOS_CRITERIO: TipoCriterio[] = ['numerico', 'booleano', 'escala']

interface FormCriterioProps {
  procesoId: string
  onSuccess: (criterio: Criterio) => void
  loading?: boolean
}

export function FormCriterio({ procesoId, onSuccess, loading = false }: FormCriterioProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    peso: 20,
    tipo: 'numerico' as TipoCriterio,
    valor_minimo: 1,
    valor_maximo: 5,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'peso' || name === 'valor_minimo' || name === 'valor_maximo' 
        ? parseInt(value, 10)
        : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/criterios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          proceso_id: procesoId,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al crear criterio')
      }

      const data = await response.json()
      setFormData({
        nombre: '',
        descripcion: '',
        peso: 20,
        tipo: 'numerico',
        valor_minimo: 1,
        valor_maximo: 5,
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
              <FieldLabel htmlFor="nombre">Nombre del Criterio</FieldLabel>
              <Input
                id="nombre"
                name="nombre"
                placeholder="Ej: Experiencia en administración"
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
              <FieldLabel htmlFor="descripcion">Descripción</FieldLabel>
              <textarea
                id="descripcion"
                name="descripcion"
                placeholder="Describe qué se evaluará en este criterio"
                value={formData.descripcion}
                onChange={handleChange}
                disabled={loading || isSubmitting}
                className="flex min-h-[100px] w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
              />
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="tipo">Tipo de Evaluación</FieldLabel>
              <select
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
                disabled={loading || isSubmitting}
                className="flex h-10 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
              >
                {TIPOS_CRITERIO.map((tipo) => (
                  <option key={tipo} value={tipo} className="bg-card">
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="valor_minimo">Valor Mínimo</FieldLabel>
                <Input
                  id="valor_minimo"
                  name="valor_minimo"
                  type="number"
                  value={formData.valor_minimo}
                  onChange={handleChange}
                  disabled={loading || isSubmitting}
                  className="border-border/50"
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="valor_maximo">Valor Máximo</FieldLabel>
                <Input
                  id="valor_maximo"
                  name="valor_maximo"
                  type="number"
                  value={formData.valor_maximo}
                  onChange={handleChange}
                  disabled={loading || isSubmitting}
                  className="border-border/50"
                />
              </Field>
            </FieldGroup>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="peso">Peso (%)</FieldLabel>
              <Input
                id="peso"
                name="peso"
                type="number"
                min="1"
                max="100"
                value={formData.peso}
                onChange={handleChange}
                required
                disabled={loading || isSubmitting}
                className="border-border/50"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Los pesos de todos los criterios deben sumar 100%
              </p>
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
            'Agregar Criterio'
          )}
        </Button>
      </form>
    </Card>
  )
}
