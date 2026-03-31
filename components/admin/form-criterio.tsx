'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { Criterio, CriterioEvaluacion } from '@/lib/types/index'

interface FormCriterioProps {
  procesoId: string
  onSuccess: (criterio: Criterio) => void
  loading?: boolean
}

export function FormCriterio({ procesoId, onSuccess, loading = false }: FormCriterioProps) {
  const [catalogo, setCatalogo] = useState<CriterioEvaluacion[]>([])
  const [catalogoLoading, setCatalogoLoading] = useState(true)
  const [catalogoError, setCatalogoError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    criterio_evaluacion_id: '',
    peso: 20,
    valor_minimo: 1,
    valor_maximo: 5,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'peso' || name === 'valor_minimo' || name === 'valor_maximo'
        ? parseInt(value, 10)
        : value,
    }))
  }

  const selectedCriterio = catalogo.find((item) => item.id === formData.criterio_evaluacion_id)

  useEffect(() => {
    const fetchCatalogo = async () => {
      try {
        setCatalogoLoading(true)
        setCatalogoError(null)
        const res = await fetch('/api/criterios?activos=true')
        if (!res.ok) throw new Error('Error al cargar criterios base')
        const data = await res.json()
        setCatalogo(data.criterios ?? [])
      } catch (err) {
        setCatalogoError(err instanceof Error ? err.message : 'Error al cargar criterios base')
      } finally {
        setCatalogoLoading(false)
      }
    }

    fetchCatalogo()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.criterio_evaluacion_id) {
        setError('Selecciona un criterio del catálogo')
        setIsSubmitting(false)
        return
      }
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
        criterio_evaluacion_id: '',
        peso: 20,
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
              <FieldLabel htmlFor="criterio_evaluacion_id">Criterio del catálogo</FieldLabel>
              <select
                id="criterio_evaluacion_id"
                name="criterio_evaluacion_id"
                value={formData.criterio_evaluacion_id}
                onChange={handleChange}
                required
                disabled={loading || isSubmitting || catalogoLoading}
                className="flex h-10 w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
              >
                <option value="">
                  {catalogoLoading ? 'Cargando...' : 'Selecciona un criterio'}
                </option>
                {catalogo.map((criterio) => (
                  <option key={criterio.id} value={criterio.id} className="bg-card">
                    {criterio.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </FieldGroup>

          {catalogoError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              {catalogoError}
            </div>
          )}

          {selectedCriterio && (
            <div className="rounded-md border border-border/50 bg-muted/40 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{selectedCriterio.nombre}</p>
              {selectedCriterio.descripcion && <p className="mt-1">{selectedCriterio.descripcion}</p>}
              <p className="mt-2 text-xs">Tipo: {selectedCriterio.tipo}</p>
            </div>
          )}

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
