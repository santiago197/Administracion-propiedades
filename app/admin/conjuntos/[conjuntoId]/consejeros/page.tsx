'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { FormConsejero } from '@/components/admin/form-consejero'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Copy, AlertCircle } from 'lucide-react'
import type { Consejero } from '@/lib/types'

export default function GestionConsejeros() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string

  const [consejeros, setConsejeros] = useState<Consejero[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    const fetchConsejeros = async () => {
      try {
        const response = await fetch(`/api/consejeros?conjunto_id=${conjuntoId}`)
        const data = await response.json()
        setConsejeros(data || [])
      } catch (error) {
        console.error('[v0] Error fetching consejeros:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConsejeros()
  }, [conjuntoId])

  const handleConsejeroAdded = (consejero: Consejero) => {
    setConsejeros((prev) => [...prev, consejero])
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const totalConsejeros = consejeros.length
  const requiredConsejeros = 3
  const isComplete = totalConsejeros >= requiredConsejeros

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}/configuracion`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>

        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestión de Consejeros</h1>
              <p className="mt-2 text-muted-foreground">
                Registra los miembros del consejo administrativo (mínimo 3)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Consejeros registrados</p>
              <p className={`text-2xl font-bold ${isComplete ? 'text-primary' : 'text-muted-foreground'}`}>
                {totalConsejeros}/{requiredConsejeros}
              </p>
            </div>
          </div>
        </div>

        {!isComplete && (
          <Card className="mb-8 border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Mínimo de consejeros requerido
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Se necesitan al menos {requiredConsejeros} consejeros registrados para continuar. Actualmente tienes {totalConsejeros}.
              </p>
            </div>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Agregar Nuevo Consejero</h2>
              <FormConsejero
                conjuntoId={conjuntoId}
                onSuccess={handleConsejeroAdded}
                loading={loading}
              />
            </div>
          </div>

          <div>
            <div className="sticky top-[100px]">
              <h2 className="text-lg font-semibold text-foreground mb-4">Resumen</h2>
              <Card className="border border-border/50 bg-card/50 p-4 space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Consejeros</p>
                  <p className="text-2xl font-bold text-foreground">{totalConsejeros}</p>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <p className="text-muted-foreground mb-2">Estado</p>
                  <div className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    isComplete
                      ? 'bg-primary/20 text-primary'
                      : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-200'
                  }`}>
                    {isComplete ? '✓ Completo' : 'Pendiente'}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {consejeros.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Consejeros Registrados</h2>
            <div className="space-y-3">
              {consejeros.map((consejero) => (
                <Card
                  key={consejero.id}
                  className="border border-border/50 bg-card/50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {consejero.nombre_completo}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {consejero.cargo.charAt(0).toUpperCase() + consejero.cargo.slice(1)}
                        {consejero.torre && ` • Torre ${consejero.torre}`}
                        {consejero.apartamento && ` • Apto ${consejero.apartamento}`}
                      </p>
                      {consejero.email && (
                        <p className="text-xs text-muted-foreground mt-1">{consejero.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded border border-border/50">
                        {consejero.codigo_acceso}
                      </code>
                      <button
                        onClick={() => copyToClipboard(consejero.codigo_acceso)}
                        className="p-2 hover:bg-muted rounded transition-colors"
                        title="Copiar código"
                      >
                        <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>
                  {copiedCode === consejero.codigo_acceso && (
                    <p className="text-xs text-primary mt-2">Código copiado al portapapeles</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="mt-12 text-center">
            <Card className="border border-primary/20 bg-primary/5 p-8">
              <p className="text-foreground font-semibold mb-4">
                ¡Excelente! Has completado la gestión de consejeros
              </p>
              <p className="text-muted-foreground mb-6">
                Ahora continúa con la definición de criterios de evaluación
              </p>
              <Link href={`/admin/conjuntos/${conjuntoId}/criterios`}>
                <Button>Ir a Criterios</Button>
              </Link>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
