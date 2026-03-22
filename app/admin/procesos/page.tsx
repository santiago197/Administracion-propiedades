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
import { selectionProcesses } from '@/lib/mock/admin-data'

const estadoClase: Record<string, string> = {
  configuración: 'bg-amber-500/10 text-amber-700',
  evaluación: 'bg-sky-500/10 text-sky-700',
  votación: 'bg-emerald-500/10 text-emerald-700',
}

export default function ProcesosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Gestión de procesos</p>
          <h1 className="text-2xl font-semibold tracking-tight">Procesos de Selección</h1>
        </div>
        <Button>Crear proceso</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Etapas configuradas, evaluación y votación.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proceso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Propuestas</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectionProcesses.map((p) => (
                <TableRow key={p.nombre}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>
                    <Badge className={estadoClase[p.estado] ?? ''} variant="outline">
                      {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.propuestas}</TableCell>
                  <TableCell>{p.fecha}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
