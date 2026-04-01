'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useActiveProceso } from '@/hooks/use-active-proceso'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, Globe, Eye, Copy, CheckCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Proceso {
  id: string
  nombre: string
  estado: string
  es_publica: boolean
}

export default function ConsultaPublicaPage() {
  const { toast } = useToast()
  const { conjunto, procesos: activeProcesos, loading: activeLoading, error: activeError } = useActiveProceso()
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (activeLoading) return

    if (activeError || !conjunto) {
      toast({
        title: 'Error',
        description: activeError || 'No se pudo obtener el conjunto',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // Usa los procesos del hook
    setProcesos(activeProcesos || [])
    setLoading(false)
  }, [activeLoading, activeError, conjunto, activeProcesos, toast])

  const togglePublic = async (procesId: string, currentValue: boolean) => {
    try {
      setUpdating(procesId)
      const res = await fetch(`/api/procesos/${procesId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ es_publica: !currentValue }),
      })

      if (!res.ok) throw new Error('Error al actualizar')

      setProcesos((prev) =>
        prev.map((p) => (p.id === procesId ? { ...p, es_publica: !currentValue } : p))
      )

      toast({
        title: 'Éxito',
        description: `Proceso ${!currentValue ? 'activado' : 'desactivado'} para consulta pública`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el proceso',
        variant: 'destructive',
      })
    } finally {
      setUpdating(null)
    }
  }

  const copyToClipboard = (procesId: string) => {
    const url = `${window.location.origin}/consulta/${procesId}`
    navigator.clipboard.writeText(url)
    setCopiedUrl(procesId)
    setTimeout(() => setCopiedUrl(null), 2000)
    toast({
      title: 'Copiado',
      description: 'URL de consulta pública copiada al portapapeles',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consulta Pública de Procesos</h1>
        <p className="text-muted-foreground mt-2">
          Habilita o deshabilita la visibilidad pública de tus procesos de selección
        </p>
      </div>

      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          Los procesos habilitados serán accesibles públicamente en URLs como{' '}
          <code className="bg-muted px-2 py-1 rounded text-sm">/consulta/[proceso-id]</code>. No
          requieren autenticación.
        </AlertDescription>
      </Alert>

      {procesos.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No hay procesos disponibles
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {procesos.map((proceso) => (
            <Card key={proceso.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {proceso.nombre}
                      {proceso.es_publica && (
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" /> Público
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Estado: <span className="font-medium text-foreground">{proceso.estado}</span>
                    </CardDescription>
                  </div>
                  <Switch
                    checked={proceso.es_publica}
                    onCheckedChange={() => togglePublic(proceso.id, proceso.es_publica)}
                    disabled={updating === proceso.id}
                  />
                </div>
              </CardHeader>

              {proceso.es_publica && (
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Eye className="h-4 w-4 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">URL de consulta pública:</p>
                        <code className="text-xs bg-background px-2 py-1 rounded block mt-1 break-all">
                          {`${window.location.origin}/consulta/${proceso.id}`}
                        </code>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(proceso.id)}
                        className="shrink-0"
                      >
                        {copiedUrl === proceso.id ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> ¿Cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-blue-900">
          <p>
            Cuando habilitas un proceso para consulta pública, los ciudadanos pueden acceder a:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Nombre y estado del proceso</li>
            <li>Fechas clave (inicio y estimado de cierre)</li>
            <li>Cantidad de candidatos en evaluación</li>
            <li>Progreso de evaluación y votación</li>
          </ul>
          <p className="mt-3">
            <strong>Nota:</strong> Los datos de candidatos específicos y evaluaciones individuales
            permanecen confidenciales.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
