import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function VotacionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Votación</h1>
        <p className="text-muted-foreground">
          Emite tu voto para seleccionar al administrador
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proceso de Votación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground text-sm">
              Sistema de votación
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
