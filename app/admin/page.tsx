import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { dashboardCards, processAlerts, processStepper, recentProcesses } from '@/lib/mock/admin-data'
import { cn } from '@/lib/utils'

const estadoColor: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  configuración: { label: 'Configuración', variant: 'secondary' },
  evaluación: { label: 'Evaluación', variant: 'default' },
  votación: { label: 'Votación', variant: 'outline' },
  finalizado: { label: 'Finalizado', variant: 'secondary' },
}

const severityStyles: Record<string, string> = {
  warn: 'border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100',
  error: 'border-destructive/50 bg-destructive/10 text-destructive',
  info: 'border-sky-300/60 bg-sky-50 text-sky-900 dark:bg-sky-900/20 dark:text-sky-100',
}

const stepStyles: Record<string, string> = {
  completado: 'border-emerald-200/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100',
  en_progreso: 'border-primary/50 bg-primary/10 text-primary',
  pendiente: 'border-muted bg-card text-muted-foreground',
  bloqueado: 'border-destructive/50 bg-destructive/10 text-destructive',
}

export default function AdminDashboard() {
  const procesoActivo = recentProcesses[0]
  const avanceGlobal = Math.round(
    (processStepper.filter((s) => s.status === 'completado').length / processStepper.length) * 100,
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Panel general</p>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Flujo completo y trazable para selección de administrador (Ley 675).
        </p>
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

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle>Proceso activo: {procesoActivo?.nombre ?? '—'}</CardTitle>
            <CardDescription>Estado: {estadoColor[procesoActivo?.estado ?? '']?.label ?? procesoActivo?.estado}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Avance global</p>
                <div className="flex items-center gap-3">
                  <Progress value={procesoActivo?.avance ?? 0} className="flex-1" />
                  <span className="text-sm font-semibold">{procesoActivo?.avance ?? 0}%</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-right text-xs text-muted-foreground">
                <span>Evaluación y votación</span>
                <Badge variant={estadoColor[procesoActivo?.estado ?? '']?.variant ?? 'secondary'}>
                  {estadoColor[procesoActivo?.estado ?? '']?.label ?? procesoActivo?.estado}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Alertas clave</h3>
                {processAlerts.map((alerta) => (
                  <div
                    key={alerta.title}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm shadow-sm',
                      severityStyles[alerta.severity],
                    )}
                  >
                    <p className="font-semibold">{alerta.title}</p>
                    <p className="text-xs opacity-80">{alerta.description}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Estatus Ley 675 (bloqueos)</h3>
                <div className="rounded-lg border bg-card/70 p-3 text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-medium">Documentación completa</p>
                      <p className="text-xs text-muted-foreground">Obligatorio antes de validar legal.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                    <div>
                      <p className="font-medium">Validación legal aprobada</p>
                      <p className="text-xs text-muted-foreground">Bloquea evaluación si no está apto.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                    <div>
                      <p className="font-medium">Evaluaciones completas</p>
                      <p className="text-xs text-muted-foreground">Requerido para calcular ranking y abrir votación.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-destructive" />
                    <div>
                      <p className="font-medium">Acta final</p>
                      <p className="text-xs text-muted-foreground">Debe registrar responsables y fecha.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Flujo del proceso</CardTitle>
            <CardDescription>Stepper visible, no avanza si hay bloqueos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Completado</span>
              <Progress value={avanceGlobal} className="flex-1" />
              <span className="font-semibold text-foreground">{avanceGlobal}%</span>
            </div>
            <div className="space-y-2">
              {processStepper.map((step) => (
                <div
                  key={step.name}
                  className={cn(
                    'rounded-lg border px-3 py-2',
                    stepStyles[step.status],
                  )}
                >
                  <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                    <span>{step.name}</span>
                    <Badge variant="outline" className="uppercase text-[10px] tracking-wide">
                      {step.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs opacity-80">{step.helper}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Procesos y trazabilidad</CardTitle>
          <CardDescription>Qué propuestas participaron, documentos, evaluación y puntaje.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {recentProcesses.map((proceso) => (
            <div key={proceso.nombre} className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{proceso.nombre}</p>
                  <p className="text-xs text-muted-foreground">{proceso.fecha}</p>
                </div>
                <Badge variant={estadoColor[proceso.estado]?.variant ?? 'secondary'}>
                  {estadoColor[proceso.estado]?.label ?? proceso.estado}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={proceso.avance} className="flex-1" />
                <span className="text-sm font-semibold">{proceso.avance}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Incluye documentación, evaluación, ranking y votación.
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
