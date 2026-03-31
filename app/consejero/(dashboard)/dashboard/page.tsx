import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, Users, Vote, CheckCircle } from 'lucide-react'

// Datos mock para las estadísticas
const stats = [
  {
    title: 'Candidatos',
    value: '5',
    description: 'Propuestas activas',
    icon: Users,
    color: 'text-blue-500',
  },
  {
    title: 'Evaluaciones',
    value: '3/5',
    description: 'Completadas',
    icon: ClipboardList,
    color: 'text-amber-500',
  },
  {
    title: 'Votación',
    value: 'Pendiente',
    description: 'Abre en 2 días',
    icon: Vote,
    color: 'text-purple-500',
  },
  {
    title: 'Estado',
    value: 'Activo',
    description: 'Proceso en curso',
    icon: CheckCircle,
    color: 'text-green-500',
  },
]

export default function ConsejeroDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen del proceso de selección de administrador
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contenedor principal vacío */}
      <Card>
        <CardHeader>
          <CardTitle>Proceso Actual</CardTitle>
          <CardDescription>
            Selección de Administrador 2024 - Conjunto Residencial Los Pinos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground text-sm">
              Contenido del proceso de selección
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
