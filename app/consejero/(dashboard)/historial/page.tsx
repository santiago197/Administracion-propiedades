import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function HistorialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
        <p className="text-muted-foreground">
          Registro de procesos anteriores y actividad
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground text-sm">
              Historial de actividades
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
