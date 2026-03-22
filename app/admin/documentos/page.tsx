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
import { documents } from '@/lib/mock/admin-data'

const estadoClase: Record<string, string> = {
  completo: 'bg-emerald-500/10 text-emerald-700',
  pendiente: 'bg-amber-500/10 text-amber-700',
  vencido: 'bg-destructive/10 text-destructive',
}

export default function DocumentosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Soportes por propuesta</p>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        </div>
        <Button variant="outline">Subir documento</Button>
      </div>

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
              {documents.map((d) => (
                <TableRow key={`${d.propuesta}-${d.nombre}`}>
                  <TableCell className="font-medium">{d.propuesta}</TableCell>
                  <TableCell>{d.nombre}</TableCell>
                  <TableCell>
                    <Badge className={estadoClase[d.estado] ?? ''} variant="outline">
                      {d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{d.fecha}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">
                      Subir
                    </Button>
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
