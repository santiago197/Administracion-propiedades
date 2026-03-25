'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ConsejeroPerfilResponse {
  consejero: {
    id: string
    nombre_completo: string
    cargo: string
    torre?: string | null
    apartamento: string
    email?: string | null
    telefono?: string | null
  }
  proceso: {
    id: string
    nombre: string
    estado: string
  } | null
  progreso: {
    propuestas_requeridas: number
    propuestas_evaluadas: number
    evaluacion_completa: boolean
    ya_voto: boolean
    fecha_voto: string | null
  }
  mensaje?: string
}

export default function PerfilConsejeroPage() {
  const router = useRouter()
  const [data, setData] = useState<ConsejeroPerfilResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        const res = await fetch('/api/consejero/perfil')
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error ?? 'No fue posible cargar el perfil')
        }
        const payload = (await res.json()) as ConsejeroPerfilResponse
        setData(payload)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchPerfil()
  }, [])

  const cerrarSesion = async () => {
    await fetch('/api/consejero/logout', { method: 'POST' })
    router.push('/consejero')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
          <Card className="h-28 animate-pulse bg-card/50" />
          <Card className="h-44 animate-pulse bg-card/50" />
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="p-8 text-center">
            <p className="text-foreground font-semibold mb-2">No se pudo cargar el perfil</p>
            <p className="text-muted-foreground text-sm">{error ?? 'Sesión no válida'}</p>
            <Link href="/consejero">
              <Button className="mt-6">Volver al ingreso</Button>
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  const { consejero, proceso, progreso } = data

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <Card className="border border-border/50 bg-card/50 p-6">
          <p className="text-sm text-muted-foreground">Perfil de consejero</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">{consejero.nombre_completo}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {consejero.cargo} · {consejero.torre ? `Torre ${consejero.torre} · ` : ''}Apto {consejero.apartamento}
          </p>
          <p className="text-sm text-muted-foreground">{consejero.email ?? 'Sin correo'} · {consejero.telefono ?? 'Sin teléfono'}</p>
        </Card>

        <Card className="border border-border/50 bg-card/50 p-6">
          <p className="text-sm text-muted-foreground">Proceso actual</p>
          {proceso ? (
            <>
              <p className="text-xl font-semibold text-foreground mt-1">{proceso.nombre}</p>
              <p className="text-sm text-muted-foreground mt-1">Estado: {proceso.estado}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              {data.mensaje ?? 'No hay un proceso activo en este momento.'}
            </p>
          )}

          <div className="mt-4 h-2 w-full rounded-full bg-border">
            <div
              className="h-2 rounded-full bg-primary"
              style={{
                width: `${progreso.propuestas_requeridas > 0 ? (progreso.propuestas_evaluadas / progreso.propuestas_requeridas) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {progreso.propuestas_evaluadas} de {progreso.propuestas_requeridas} propuestas evaluadas
          </p>
          <p className="text-sm text-muted-foreground">
            Voto: {progreso.ya_voto ? `registrado${progreso.fecha_voto ? ` (${new Date(progreso.fecha_voto).toLocaleDateString('es-CO')})` : ''}` : 'pendiente'}
          </p>
        </Card>

        {proceso && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href={`/consejero/evaluacion/${proceso.id}`}>
              <Button className="w-full">Ir a evaluación</Button>
            </Link>
            <Link href={`/consejero/votacion/${proceso.id}`}>
              <Button variant="outline" className="w-full">Ir a votación</Button>
            </Link>
          </div>
        )}

        <Button onClick={cerrarSesion} variant="ghost" className="w-full text-muted-foreground">
          Cerrar sesión de consejero
        </Button>
      </main>
    </div>
  )
}
