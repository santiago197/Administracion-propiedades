'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Lock } from 'lucide-react'

export default function ConsejeroLogin() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!codigo.trim()) {
        setError('Por favor ingresa tu código de acceso')
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_acceso: codigo.toUpperCase() }),
      })

      if (!response.ok) {
        throw new Error('Código de acceso inválido')
      }

      const data = await response.json()
      sessionStorage.setItem('proceso_id', data.proceso_id)

      router.push(`/consejero/evaluacion/${data.proceso_id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('[v0] Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            SA
          </div>
          <span className="text-2xl font-bold text-foreground">SelecionAdm</span>
        </Link>

        <Card className="border border-border/50 bg-card/50 p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Evaluación de Propuestas</h1>
            <p className="text-muted-foreground">
              Ingresa tu código de acceso para comenzar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="codigo">Código de Acceso</FieldLabel>
                <Input
                  id="codigo"
                  type="text"
                  placeholder="Ej: ABC12345"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="border-border/50 text-center font-mono text-lg tracking-widest"
                  autoComplete="off"
                />
              </Field>
            </FieldGroup>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Validando...
                </>
              ) : (
                'Acceder'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Necesitas ayuda? Contacta al administrador del conjunto
            </p>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/">
            <Button variant="outline" className="w-full">
              Volver a Inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
