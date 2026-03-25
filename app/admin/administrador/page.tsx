import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { administrator } from '@/lib/mock/admin-data'

const estadoContratoColor: Record<string, { label: string; className: string }> = {
  vigente: { label: 'Vigente', className: 'bg-emerald-500/10 text-emerald-700' },
  'por vencer': { label: 'Por vencer', className: 'bg-amber-500/10 text-amber-700' },
  vencido: { label: 'Vencido', className: 'bg-destructive/10 text-destructive' },
}

export default function AdministradorPage() {
  const estado = estadoContratoColor[administrator.contrato.estado] ?? estadoContratoColor.vigente

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Responsable operativo</p>
        <h1 className="text-2xl font-semibold tracking-tight">Administrador</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{administrator.nombre}</CardTitle>
          <CardDescription>Información de contacto y estado del contrato.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Contacto</p>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Encargado: </span>{administrator.contacto}</p>
              <p><span className="text-muted-foreground">Teléfono: </span>{administrator.telefono}</p>
              <p><span className="text-muted-foreground">Correo: </span>{administrator.email}</p>
            </div>
          </div>
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contrato</p>
                <p className="text-lg font-semibold">Administración</p>
              </div>
              <Badge className={estado.className} variant="outline">
                {estado.label}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Inicio</p>
                <p className="font-medium">{administrator.contrato.inicio}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Fin</p>
                <p className="font-medium">{administrator.contrato.fin}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Valor</p>
                <p className="font-medium">{administrator.contrato.valor}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Renovación</p>
                <p className="font-medium">Evaluar en Q4 2025</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
