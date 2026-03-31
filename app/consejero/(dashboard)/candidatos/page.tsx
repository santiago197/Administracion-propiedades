import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CandidatosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Candidatos</h1>
        <p className="text-muted-foreground">
          Lista de propuestas de administración recibidas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Propuestas Activas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground text-sm">
              Listado de candidatos
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
