'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }

      window.location.href = '/admin'
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
      console.error('[v0] Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6 sm:p-8 border-border/50">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-foreground text-center">SelecionAdm</h1>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Sistema de Selección de Administradores
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Correo Electrónico
            </label>
            <Input
              id="email"
              type="email"
              placeholder="admin@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-input/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-input/50 border-border/50"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 mt-6"
          >
            {loading && <Loader className="h-4 w-4 animate-spin" />}
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            ¿Necesitas una cuenta?{' '}
            <span className="text-foreground font-medium">
              Contacta al administrador del sistema
            </span>
          </p>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-card/50 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground">
            <strong>Demo:</strong> Usa credenciales proporcionadas por el administrador del sistema.
          </p>
        </div>
      </Card>
    </div>
  )
}
