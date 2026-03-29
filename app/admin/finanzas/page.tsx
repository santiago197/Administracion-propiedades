import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { financialStatements, financialSummary } from '@/lib/mock/admin-data'

export default function FinanzasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Resumen financiero</p>
        <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {financialSummary.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{item.badge}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estados financieros (mock)</CardTitle>
          <CardDescription>Periodos recientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Ingresos</TableHead>
                <TableHead>Egresos</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Cumplimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialStatements.map((f) => (
                <TableRow key={f.periodo}>
                  <TableCell className="font-medium">{f.periodo}</TableCell>
                  <TableCell>{f.ingresos}</TableCell>
                  <TableCell>{f.egresos}</TableCell>
                  <TableCell>{f.resultado}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{f.cumplimiento}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
