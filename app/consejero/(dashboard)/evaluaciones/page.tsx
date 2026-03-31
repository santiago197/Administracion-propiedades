import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function EvaluacionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Evaluaciones</h1>
        <p className="text-muted-foreground">
          Evalúa las propuestas según los criterios definidos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mis Evaluaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground text-sm">
              Panel de evaluación por criterios
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
