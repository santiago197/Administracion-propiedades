import { Button } from '@/components/ui/button'
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
import { contracts } from '@/lib/mock/admin-data'

const estadoClase: Record<string, string> = {
  vigente: 'bg-emerald-500/10 text-emerald-700',
  'por vencer': 'bg-amber-500/10 text-amber-700',
  vencido: 'bg-destructive/10 text-destructive',
}

export default function ContratosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Acuerdos vigentes</p>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
        </div>
        <Button>Nuevo contrato</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Estado: vigente, por vencer, vencido</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.nombre}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>{c.responsable}</TableCell>
                  <TableCell>
                    <Badge className={estadoClase[c.estado] ?? ''} variant="outline">
                      {c.estado.charAt(0).toUpperCase() + c.estado.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.fin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
