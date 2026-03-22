import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { validacionesLegales } from '@/lib/mock/admin-data'

const estadoClase: Record<string, string> = {
  apto: 'bg-emerald-500/10 text-emerald-700',
  pendiente: 'bg-amber-500/10 text-amber-700',
  no_apto: 'bg-destructive/10 text-destructive',
}

export default function ValidacionLegalAdmin() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Control legal</p>
        <h1 className="text-2xl font-semibold tracking-tight">Validación Legal</h1>
        <p className="text-sm text-muted-foreground">
          SARLAFT, antecedentes, pólizas y paz y salvo. Bloqueo de avance si es No Apto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado por propuesta</CardTitle>
          <CardDescription>Debe quedar visible quién habilitó o rechazó cada candidato.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Propuesta</TableHead>
                <TableHead>SARLAFT</TableHead>
                <TableHead>Antecedentes</TableHead>
                <TableHead>Pólizas</TableHead>
                <TableHead>Paz y salvo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validacionesLegales.map((item) => (
                <TableRow key={item.propuesta}>
                  <TableCell className="font-semibold">{item.propuesta}</TableCell>
                  <TableCell>{item.sarlaft}</TableCell>
                  <TableCell>{item.antecedentes}</TableCell>
                  <TableCell>{item.polizas}</TableCell>
                  <TableCell>{item.pazSalvo}</TableCell>
                  <TableCell>
                    <Badge className={estadoClase[item.estado] ?? ''} variant="outline">
                      {item.estado === 'apto' ? 'Apto legal' : item.estado === 'no_apto' ? 'No apto (bloquea)' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Transparencia: registre quién validó, fecha y observaciones. Si es No Apto, la propuesta no continúa a Evaluación ni Votación.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
