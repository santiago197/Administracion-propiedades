import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { dashboardCards, recentProcesses } from '@/lib/mock/admin-data'

const estadoColor: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  configuración: { label: 'Configuración', variant: 'secondary' },
  evaluación: { label: 'Evaluación', variant: 'default' },
  votación: { label: 'Votación', variant: 'outline' },
  finalizado: { label: 'Finalizado', variant: 'secondary' },
}

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Panel general</p>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardCards.map((card) => (
          <Card key={card.title} className="bg-card/70">
            <CardHeader className="pb-2">
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{card.helper}</span>
              <Badge variant="secondary">{card.trend}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Últimos procesos</CardTitle>
            <CardDescription>Seguimiento rápido de los procesos recientes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentProcesses.map((proceso) => (
              <div
                key={proceso.nombre}
                className="flex flex-col gap-2 rounded-lg border px-4 py-3 md:flex-row md:items-center md:gap-4"
              >
                <div className="flex-1">
                  <p className="font-medium">{proceso.nombre}</p>
                  <p className="text-xs text-muted-foreground">{proceso.fecha}</p>
                </div>
                <div className="flex items-center gap-3 md:w-64">
                  <Progress value={proceso.avance} className="flex-1" />
                  <span className="text-sm font-semibold">{proceso.avance}%</span>
                </div>
                <Badge variant={estadoColor[proceso.estado]?.variant ?? 'secondary'}>
                  {estadoColor[proceso.estado]?.label ?? proceso.estado}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Estado general</CardTitle>
            <CardDescription>Visión rápida del proceso actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
              <div>
                <p className="font-medium">Evaluación en curso</p>
                <p className="text-muted-foreground">83% de consejeros evaluaron todas las propuestas.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
              <div>
                <p className="font-medium">Documentos faltantes</p>
                <p className="text-muted-foreground">5 documentos pendientes por validar.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
              <div>
                <p className="font-medium">Votación programada</p>
                <p className="text-muted-foreground">Fecha tentativa: 18 de marzo de 2025.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
