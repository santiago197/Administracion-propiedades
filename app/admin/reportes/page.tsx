import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { auditoriaProceso, rankingFinal } from '@/lib/mock/admin-data'

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Exportable / Auditoría</p>
          <h1 className="text-2xl font-semibold tracking-tight">Informes y Auditoría</h1>
          <p className="text-sm text-muted-foreground">
            Resume criterios, puntajes, ranking final, votos y trazabilidad Ley 675.
          </p>
        </div>
        <Button variant="outline">Exportar (PDF)</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Proceso</CardTitle>
            <CardDescription>Resumen del proceso actual</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{auditoriaProceso.proceso}</p>
            <p className="text-sm text-muted-foreground">Decisión: {auditoriaProceso.decision}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Responsables: {auditoriaProceso.responsables.join(', ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking final</CardTitle>
            <CardDescription>Top 3 por puntaje final</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rankingFinal.map((r, idx) => (
              <div key={r.propuesta} className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-card flex items-center justify-center font-bold">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{r.propuesta}</p>
                    <p className="text-xs text-muted-foreground">Votos: {r.votos}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-base font-semibold">
                  {r.puntaje.toFixed(2)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decisión</CardTitle>
            <CardDescription>Fecha y cierre del acta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Fecha de decisión</span>
              <span className="font-semibold">{auditoriaProceso.fechaDecision}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">Criterios usados</span>
              <Badge variant="secondary">{auditoriaProceso.criterios.length} criterios</Badge>
            </div>
            <Button className="w-full" variant="secondary">
              Generar acta final
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trazabilidad</CardTitle>
          <CardDescription>Fechas, responsables y decisiones registradas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditoriaProceso.trazabilidad.map((item) => (
                <TableRow key={`${item.fecha}-${item.evento}`}>
                  <TableCell>{item.fecha}</TableCell>
                  <TableCell className="font-semibold">{item.evento}</TableCell>
                  <TableCell>{item.responsable}</TableCell>
                  <TableCell className="text-muted-foreground">{item.detalle}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Esta vista debe ser exportable (PDF) para auditoría y cumplimiento Ley 675.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
