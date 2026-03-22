'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Proceso, Propuesta } from '@/lib/types'

type DocumentoRow = {
  id: string
  propuesta_id: string
  nombre: string
  tipo: string
  estado: 'pendiente' | 'completo' | 'incompleto' | 'vencido'
  fecha_vencimiento?: string | null
  archivo_url?: string | null
}

type EstadoResumen = 'completo' | 'incompleto' | 'vencido'

const estadoClase: Record<string, string> = {
  completo: 'bg-emerald-500/10 text-emerald-700',
  pendiente: 'bg-amber-500/10 text-amber-700',
  incompleto: 'bg-amber-500/10 text-amber-700',
  vencido: 'bg-destructive/10 text-destructive',
}

function formatDate(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-CO')
}

export default function DocumentosPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conjuntoId, setConjuntoId] = useState<string | null>(null)
  const [procesoId, setProcesoId] = useState<string | null>(null)
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [documentosByPropuesta, setDocumentosByPropuesta] = useState<Record<string, DocumentoRow[]>>({})

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
        const propuestasRes = await fetch(`/api/propuestas?proceso_id=${procesoActivo.id}`)
        if (!propuestasRes.ok) throw new Error('No se pudieron obtener las propuestas')
        const propuestasData = (await propuestasRes.json()) as Propuesta[]
        setPropuestas(propuestasData)

        const results = await Promise.all(
          propuestasData.map(async (propuesta) => {
            const docsRes = await fetch(`/api/documentos?propuesta_id=${propuesta.id}`)
            if (!docsRes.ok) throw new Error(`No se pudieron obtener documentos de ${propuesta.razon_social}`)
            const docs = (await docsRes.json()) as DocumentoRow[]
            return [propuesta.id, docs] as const
          })
        )

        setDocumentosByPropuesta(Object.fromEntries(results))
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
      const completos = docs.filter((doc) => doc.estado === 'completo').length
      const hayVencido = docs.some((doc) => doc.estado === 'vencido')
      const estado: EstadoResumen = hayVencido ? 'vencido' : completos === total && total > 0 ? 'completo' : 'incompleto'
      const avance = total > 0 ? Math.round((completos / total) * 100) : 0
      return { propuesta, docs, estado, total, avance }
    })
  }, [propuestas, documentosByPropuesta])

  const documentosFlat = useMemo(() => {
    return resumenPorPropuesta.flatMap((item) =>
      item.docs.map((doc) => ({
        ...doc,
        propuesta: item.propuesta.razon_social,
      }))
    )
  }, [resumenPorPropuesta])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Soportes por propuesta</p>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Vista por propuesta con indicadores de completitud y vencimiento.
          </p>
        </div>
        <Button variant="outline" disabled>
          Subir documento
        </Button>
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
        <>
          <Card>
            <CardHeader>
              <CardTitle>Estado por propuesta</CardTitle>
              <CardDescription>Completo / incompleto / vencido</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {resumenPorPropuesta.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay propuestas en el proceso actual.</p>
              ) : (
                resumenPorPropuesta.map((item) => (
                  <div key={item.propuesta.id} className="rounded-lg border bg-muted/40 p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.propuesta.razon_social}</p>
                        <p className="text-xs text-muted-foreground">{item.total} documentos</p>
                      </div>
                      <Badge className={estadoClase[item.estado] ?? ''} variant="outline">
                        {item.estado.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={item.avance} className="flex-1" />
                      <span className="text-xs font-semibold">{item.avance}%</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {item.docs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-md border px-2 py-1">
                          <span>{doc.tipo}</span>
                          <div className="flex items-center gap-2">
                            <Badge className={estadoClase[doc.estado] ?? ''} variant="outline">
                              {doc.estado}
                            </Badge>
                            <span className="text-muted-foreground">{formatDate(doc.fecha_vencimiento)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Control documental</CardTitle>
              <CardDescription>Completo / pendiente / vencido</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Propuesta</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentosFlat.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No hay documentos registrados para este proceso.
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentosFlat.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.propuesta}</TableCell>
                        <TableCell>{doc.nombre}</TableCell>
                        <TableCell>
                          <Badge className={estadoClase[doc.estado] ?? ''} variant="outline">
                            {doc.estado.charAt(0).toUpperCase() + doc.estado.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(doc.fecha_vencimiento)}</TableCell>
                        <TableCell className="text-right">
                          {doc.archivo_url ? (
                            <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">
                                Ver
                              </Button>
                            </a>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              Sin archivo
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Conjunto actual: {conjuntoId ?? 'N/A'}.
      </p>
    </div>
  )
}
