import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// Datos mock del perfil
const perfil = {
  nombre: 'Carlos Rodríguez',
  cargo: 'Presidente del Consejo',
  apartamento: 'Torre 2 - Apto 501',
  email: 'carlos.rodriguez@email.com',
  telefono: '+57 300 123 4567',
}

export default function PerfilPage() {
  const initials = perfil.nombre
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Información personal y de contacto
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Consejero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar className="h-24 w-24 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-sm text-muted-foreground">Nombre completo</p>
                <p className="font-medium">{perfil.nombre}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Cargo</p>
                  <p className="font-medium">{perfil.cargo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                  <p className="font-medium">{perfil.apartamento}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{perfil.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{perfil.telefono}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
