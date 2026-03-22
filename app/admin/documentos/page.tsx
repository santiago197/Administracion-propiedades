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
import { documentosPorPropuesta, documents } from '@/lib/mock/admin-data'

const estadoClase: Record<string, string> = {
  completo: 'bg-emerald-500/10 text-emerald-700',
  pendiente: 'bg-amber-500/10 text-amber-700',
  incompleto: 'bg-amber-500/10 text-amber-700',
  vencido: 'bg-destructive/10 text-destructive',
}

export default function DocumentosPage() {
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
        <Button variant="outline">Subir documento</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado por propuesta</CardTitle>
          <CardDescription>Completo / incompleto / vencido</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {documentosPorPropuesta.map((item) => (
            <div key={item.propuesta} className="rounded-lg border bg-muted/40 p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.propuesta}</p>
                  <p className="text-xs text-muted-foreground">{item.docs.length} documentos</p>
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
                  <div key={`${item.propuesta}-${doc.tipo}`} className="flex items-center justify-between rounded-md border px-2 py-1">
                    <span>{doc.tipo}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={estadoClase[doc.estado] ?? ''} variant="outline">
                        {doc.estado}
                      </Badge>
                      <span className="text-muted-foreground">{doc.fecha}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
