import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { evaluacionCriterios, proposals } from '@/lib/mock/admin-data'

export default function EvaluacionTecnica() {
  const promedio = evaluacionCriterios.reduce((acc, c) => acc + c.puntaje * (c.peso / 100), 0)
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Evaluación por criterios</p>
        <h1 className="text-2xl font-semibold tracking-tight">Evaluación Técnica</h1>
        <p className="text-sm text-muted-foreground">
          Legal, Técnico, Financiero, Referencias y Propuesta económica con ponderaciones.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Criterios</CardTitle>
            <CardDescription>Puntaje por criterio y comentarios.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criterio</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Puntaje</TableHead>
                  <TableHead>Comentario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluacionCriterios.map((c) => (
                  <TableRow key={c.categoria}>
                    <TableCell className="font-semibold">{c.categoria}</TableCell>
                    <TableCell>{c.peso}%</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.puntaje.toFixed(1)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.comentario}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Promedio ponderado</p>
                <Progress value={(promedio / 5) * 100} className="w-full" />
              </div>
              <p className="text-2xl font-bold text-primary">{promedio.toFixed(2)}/5</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Solo se habilita Ranking cuando todos los consejeros hayan evaluado todos los criterios.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen por propuesta</CardTitle>
            <CardDescription>Quién evaluó y qué puntaje obtuvo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {proposals.map((p) => (
              <div key={p.razonSocial} className="rounded-lg border bg-muted/40 p-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{p.razonSocial}</span>
                  <Badge variant="outline">{p.puntaje.toFixed(1)}/5</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clasificación: {p.clasificacion}. Paso: {p.paso}.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
