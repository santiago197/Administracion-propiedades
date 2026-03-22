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
  finalizado: 'bg-muted text-muted-foreground',
}

const etapas = ['Configuración', 'Documentación', 'Validación legal', 'Evaluación', 'Votación', 'Finalizado']

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
          <CardDescription>Timeline visible del flujo completo y bloqueos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proceso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Propuestas</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Timeline</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {etapas.map((etapa, index) => {
                        const activeIndex = etapas.findIndex((e) => e.toLowerCase().startsWith(p.estado))
                        const isActive = index <= activeIndex
                        const isCurrent = index === activeIndex
                        return (
                          <div key={etapa} className="flex items-center gap-1">
                            <div
                              className={`h-2.5 w-2.5 rounded-full ${
                                isActive
                                  ? 'bg-primary'
                                  : 'bg-muted-foreground/20'
                              } ${isCurrent ? 'ring-2 ring-primary/50' : ''}`}
                              title={etapa}
                            />
                            {index < etapas.length - 1 && (
                              <div className={`h-0.5 w-4 ${isActive ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">
            Un proceso no avanza a Evaluación si faltan documentos o la Validación legal está rechazada. La Votación se habilita solo cuando las evaluaciones están completas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
