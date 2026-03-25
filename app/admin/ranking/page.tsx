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
import { rankingFinal } from '@/lib/mock/admin-data'

const semaforoClase: Record<string, string> = {
  verde: 'bg-emerald-500/10 text-emerald-700',
  amarillo: 'bg-amber-500/10 text-amber-700',
  rojo: 'bg-destructive/10 text-destructive',
}

export default function RankingPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Resultado ponderado</p>
        <h1 className="text-2xl font-semibold tracking-tight">Ranking</h1>
        <p className="text-sm text-muted-foreground">
          Clasificación automática: Destacado, Apto, Condicionado / No apto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabla ordenada por puntaje final</CardTitle>
          <CardDescription>Incluye votos recibidos y semáforo de riesgo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Propuesta</TableHead>
                <TableHead>Puntaje final</TableHead>
                <TableHead>Votos</TableHead>
                <TableHead>Clasificación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankingFinal.map((r, idx) => (
                <TableRow key={r.propuesta}>
                  <TableCell className="font-semibold">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{r.propuesta}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-base font-semibold">
                      {r.puntaje.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.votos}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={semaforoClase[r.semaforo] ?? ''} variant="outline">
                        {r.semaforo.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {r.clasificacion}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Transparencia: ¿por qué ganó? Por puntaje final ponderado y votos. ¿Quién votó? Ver pantalla de Votación.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
