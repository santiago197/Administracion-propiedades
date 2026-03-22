import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { propertyProfile } from '@/lib/mock/admin-data'

export default function PerfilConjuntoPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Datos del conjunto</p>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil del Conjunto</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Información general</CardTitle>
            <CardDescription>Actualiza la información visible para consejeros y proponentes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input defaultValue={propertyProfile.nombre} placeholder="Nombre del conjunto" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ciudad</label>
                <Input defaultValue={propertyProfile.ciudad} placeholder="Ciudad" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Dirección</label>
                <Input defaultValue={propertyProfile.direccion} placeholder="Dirección" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Año</label>
                <Input type="number" defaultValue={propertyProfile.anio} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex w-full justify-end gap-3">
              <Button variant="outline">Cancelar</Button>
              <Button>Guardar cambios</Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identidad visual</CardTitle>
            <CardDescription>Sube el logo y ajusta la presentación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
              <div className="h-12 w-12 rounded-lg bg-muted" />
              <div className="flex-1">
                <p className="font-medium">Logo del conjunto</p>
                <p className="text-sm text-muted-foreground">PNG o SVG, máximo 2MB.</p>
              </div>
              <Button variant="outline">Subir</Button>
            </div>
            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>El logo se mostrará en reportes, documentos y cabeceras.</p>
              <p>Usa fondo transparente para mejor contraste en modo claro/oscuro.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
