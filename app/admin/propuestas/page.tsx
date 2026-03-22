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
import { proposals } from '@/lib/mock/admin-data'

const semaforoClase: Record<string, string> = {
  verde: 'bg-emerald-500/10 text-emerald-700',
  amarillo: 'bg-amber-500/10 text-amber-700',
  rojo: 'bg-destructive/10 text-destructive',
}

export default function PropuestasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Candidatos</p>
          <h1 className="text-2xl font-semibold tracking-tight">Propuestas</h1>
        </div>
        <Button>Agregar propuesta</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabla de propuestas</CardTitle>
          <CardDescription>Tipo de persona y estado visual con semáforo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Propuesta</TableHead>
                <TableHead>Tipo de persona</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Semáforo</TableHead>
                <TableHead>Contacto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((p) => (
                <TableRow key={p.razonSocial}>
                  <TableCell className="font-medium">{p.razonSocial}</TableCell>
                  <TableCell className="capitalize">{p.tipo}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={semaforoClase[p.semaforo] ?? ''} variant="outline">
                      {p.semaforo.charAt(0).toUpperCase() + p.semaforo.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.contacto}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
