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
import { votosConsejo } from '@/lib/mock/admin-data'

const estadoClase: Record<string, string> = {
  votó: 'bg-emerald-500/10 text-emerald-700',
  pendiente: 'bg-amber-500/10 text-amber-700',
}

export default function VotacionConsejoPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Participación del consejo</p>
        <h1 className="text-2xl font-semibold tracking-tight">Votación Consejo</h1>
        <p className="text-sm text-muted-foreground">
          Muestra quién votó, a favor de quién y justificación. Visible y auditable.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado de votos</CardTitle>
          <CardDescription>Valida quorum y pendientes antes de cerrar el proceso.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consejero</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Propuesta seleccionada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {votosConsejo.map((v) => (
                <TableRow key={v.consejero}>
                  <TableCell className="font-semibold">{v.consejero}</TableCell>
                  <TableCell>{v.rol}</TableCell>
                  <TableCell>{v.voto}</TableCell>
                  <TableCell>
                    <Badge className={estadoClase[v.estado] ?? ''} variant="outline">
                      {v.estado === 'votó' ? 'Votó' : 'No votó'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{v.motivo}</TableCell>
                  <TableCell>{v.fecha}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Registra quién falta por votar y justificación de cada voto. Requisito de trazabilidad Ley 675.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
