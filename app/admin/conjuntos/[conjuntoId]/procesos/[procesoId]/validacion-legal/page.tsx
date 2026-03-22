'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Loader,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Info,
  ExternalLink
} from 'lucide-react'
import type { Propuesta, Proceso } from '@/lib/types/index'

export default function ValidacionLegalPage() {
  const params = useParams()
  const router = useRouter()
  const conjuntoId = params.conjuntoId as string
  const procesoId = params.procesoId as string

  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [proceso, setProceso] = useState<Proceso | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propRes, procRes] = await Promise.all([
          fetch(`/api/propuestas?proceso_id=${procesoId}`),
          fetch(`/api/procesos?conjunto_id=${conjuntoId}`)
        ])

        if (propRes.ok) {
          const data = await propRes.json()
          // Solo mostrar las que están en estado 'habilitada' (documentación completa)
          setPropuestas(data.filter((p: Propuesta) => p.estado === 'habilitada' || p.estado === 'no_apto_legal' || p.estado === 'en_evaluacion'))
        }

        if (procRes.ok) {
          const procesos = await procRes.json()
          setProceso(procesos.find((p: Proceso) => p.id === procesoId) || null)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Error al cargar los datos.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [procesoId, conjuntoId])

  const handleValidacion = async (propuestaId: string, cumple: boolean) => {
    const observaciones = prompt(cumple ? 'Observaciones legales (opcional):' : 'Indique el motivo del rechazo legal (obligatorio):')

    if (!cumple && !observaciones) {
      alert('Debe indicar un motivo de rechazo.')
      return
    }

    setProcessingId(propuestaId)
    try {
      const response = await fetch(`/api/propuestas/validar-legal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propuesta_id: propuestaId,
          cumple,
          observaciones: observaciones || ''
        })
      })

      if (response.ok) {
        // Actualizar lista local
        setPropuestas(prev => prev.map(p =>
          p.id === propuestaId
            ? { ...p, estado: cumple ? 'en_evaluacion' : 'no_apto_legal', cumple_requisitos_legales: cumple, observaciones_legales: observaciones || '' }
            : p
        ))
      } else {
        const data = await response.json()
        alert(data.error || 'Error al procesar validación')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error de conexión')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}`}>
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al Proceso
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Validación Legal de Candidatos</h1>
          <p className="mt-2 text-muted-foreground">
            Verificación de SARLAFT, antecedentes, pólizas y paz y salvos.
          </p>
        </div>

        {propuestas.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay candidatos pendientes de validación legal.</p>
            <p className="text-xs text-muted-foreground mt-2">Solo aparecen candidatos con documentación completa.</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {propuestas.map((p) => (
              <Card key={p.id} className="p-6 border border-border/50 bg-card/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-foreground">{p.razon_social}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.estado === 'en_evaluacion' ? 'bg-green-500/10 text-green-500' :
                        p.estado === 'no_apto_legal' ? 'bg-red-500/10 text-red-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {p.estado.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {p.tipo_persona === 'juridica' ? 'NIT' : 'CC'}: {p.nit_cedula} • {p.email}
                    </p>

                    {p.observaciones_legales && (
                      <div className="p-3 bg-muted rounded-md text-sm mb-4">
                        <p className="font-semibold text-xs mb-1">OBSERVACIONES LEGALES:</p>
                        {p.observaciones_legales}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}/propuestas/${p.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Ver Documentos
                      </Button>
                    </Link>

                    {p.estado === 'habilitada' && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          disabled={processingId === p.id}
                          onClick={() => handleValidacion(p.id, false)}
                        >
                          <ShieldAlert className="h-4 w-4" />
                          Rechazo Legal
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-2 bg-green-600 hover:bg-green-700"
                          disabled={processingId === p.id}
                          onClick={() => handleValidacion(p.id, true)}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Habilitar Legal
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
