'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Proceso, Propuesta } from '@/lib/types'

type DocumentoRow = {
  id: string
  propuesta_id: string
  nombre: string
  tipo: string
  estado: 'pendiente' | 'completo' | 'incompleto' | 'vencido' | 'cargado'
  fecha_vencimiento?: string | null
  archivo_url?: string | null
}

type EstadoResumen = 'completo' | 'incompleto' | 'vencido'

const estadoClase: Record<string, string> = {
  completo: 'bg-emerald-500/10 text-emerald-700',
  cargado: 'bg-emerald-500/10 text-emerald-700',
  pendiente: 'bg-amber-500/10 text-amber-700',
  incompleto: 'bg-amber-500/10 text-amber-700',
  vencido: 'bg-destructive/10 text-destructive',
}

function formatDate(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-CO')
}

export default function DocumentosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conjuntoId, setConjuntoId] = useState<string | null>(null)
  const [procesoId, setProcesoId] = useState<string | null>(null)
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [documentosByPropuesta, setDocumentosByPropuesta] = useState<Record<string, DocumentoRow[]>>({})

  const loadDocumentosByPropuestas = async (propuestasData: Propuesta[]) => {
    if (propuestasData.length === 0) {
      setDocumentosByPropuesta({})
      return
    }

    const results = await Promise.all(
      propuestasData.map(async (propuesta) => {
        const docsRes = await fetch(`/api/documentos?propuesta_id=${propuesta.id}`)
        if (!docsRes.ok) throw new Error(`No se pudieron obtener documentos de ${propuesta.razon_social}`)
        const docs = (await docsRes.json()) as DocumentoRow[]
        return [propuesta.id, docs] as const
      })
    )

    setDocumentosByPropuesta(Object.fromEntries(results))
  }

  const loadProcesoData = async (targetProcesoId: string) => {
    const propuestasRes = await fetch(`/api/propuestas?proceso_id=${targetProcesoId}`)
    if (!propuestasRes.ok) throw new Error('No se pudieron obtener las propuestas')
    const propuestasData = (await propuestasRes.json()) as Propuesta[]
    setPropuestas(propuestasData)
    await loadDocumentosByPropuestas(propuestasData)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const conjuntoRes = await fetch('/api/conjuntos')
        if (!conjuntoRes.ok) throw new Error('No se pudo obtener el conjunto')
        const conjunto = await conjuntoRes.json()
        if (!conjunto?.id) throw new Error('No hay conjunto asociado')
        setConjuntoId(conjunto.id)

        const procesosRes = await fetch(`/api/procesos?conjunto_id=${conjunto.id}`)
        if (!procesosRes.ok) throw new Error('No se pudieron obtener los procesos')
        const procesos = (await procesosRes.json()) as Proceso[]
        const procesoActivo =
          procesos.find((proceso) => proceso.estado === 'configuracion' || proceso.estado === 'evaluacion' || proceso.estado === 'votacion') ??
          procesos[0]

        if (!procesoActivo) {
          setPropuestas([])
          setDocumentosByPropuesta({})
          setProcesoId(null)
          return
        }

        setProcesoId(procesoActivo.id)
        await loadProcesoData(procesoActivo.id)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const resumenPorPropuesta = useMemo(() => {
    return propuestas.map((propuesta) => {
      const docs = documentosByPropuesta[propuesta.id] ?? []
      const total = docs.length
      const completos = docs.filter((doc) => doc.estado === 'completo' || doc.estado === 'cargado').length
      const hayVencido = docs.some((doc) => doc.estado === 'vencido')
      const estado: EstadoResumen = hayVencido ? 'vencido' : completos === total && total > 0 ? 'completo' : 'incompleto'
      const avance = total > 0 ? Math.round((completos / total) * 100) : 0
      return { propuesta, docs, estado, total, avance }
    })
  }, [propuestas, documentosByPropuesta])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Soportes por propuesta</p>
        <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Haz clic en una propuesta para ver y gestionar sus documentos.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Cargando soportes...</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8">
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          </CardContent>
        </Card>
      ) : !procesoId ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No hay procesos disponibles para consultar soportes.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Estado por propuesta</CardTitle>
            <CardDescription>Selecciona una propuesta para ver el detalle de documentos cargados y pendientes</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resumenPorPropuesta.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">No hay propuestas en el proceso actual.</p>
            ) : (
              resumenPorPropuesta.map((item) => (
                <button
                  key={item.propuesta.id}
                  type="button"
                  onClick={() => router.push(`/admin/propuestas/${item.propuesta.id}/documentos`)}
                  className="rounded-lg border bg-muted/40 p-4 space-y-3 text-left transition-colors hover:bg-muted/60 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-primary">
                        {item.propuesta.razon_social}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.total} documento{item.total !== 1 ? 's' : ''} cargado{item.total !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge className={estadoClase[item.estado] ?? ''} variant="outline">
                      {item.estado.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.avance} className="flex-1" />
                    <span className="text-xs font-semibold">{item.avance}%</span>
                  </div>
                  {item.docs.length > 0 && (
                    <div className="space-y-1 text-xs">
                      {item.docs.slice(0, 3).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-md border bg-background/50 px-2 py-1">
                          <span className="truncate">{doc.nombre || doc.tipo}</span>
                          <Badge className={`${estadoClase[doc.estado] ?? ''} ml-2 shrink-0`} variant="outline">
                            {doc.estado}
                          </Badge>
                        </div>
                      ))}
                      {item.docs.length > 3 && (
                        <p className="text-muted-foreground pl-2">+{item.docs.length - 3} más...</p>
                      )}
                    </div>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        Conjunto actual: {conjuntoId ?? 'N/A'}.
      </p>
    </div>
  )
}
