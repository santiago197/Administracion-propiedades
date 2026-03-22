import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const reportes = [
  { titulo: 'Informe de evaluación', descripcion: 'Puntajes ponderados y ranking por propuesta.', formato: 'PDF' },
  { titulo: 'Resumen de votación', descripcion: 'Conteo de votos por consejero y propuesta.', formato: 'PDF / XLSX' },
  { titulo: 'Reporte financiero', descripcion: 'Estados financieros y flujo de caja anual.', formato: 'XLSX' },
]

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Exportaciones</p>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        </div>
        <Button variant="outline">Generar todo</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {reportes.map((r) => (
          <Card key={r.titulo}>
            <CardHeader>
              <CardTitle>{r.titulo}</CardTitle>
              <CardDescription>{r.descripcion}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant="secondary">{r.formato}</Badge>
              <Button size="sm">Generar</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
