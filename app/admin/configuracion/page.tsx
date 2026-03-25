import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Parámetros generales</p>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Roles y accesos</CardTitle>
            <CardDescription>Define permisos visuales para cada rol.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between">
            <div className="text-sm text-muted-foreground">Permisos con checkboxes visibles.</div>
            <Button asChild>
              <Link href="/admin/configuracion/roles">Ir a roles</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tipos de documentos</CardTitle>
            <CardDescription>Tabla editable con switches y estados.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between">
            <div className="text-sm text-muted-foreground">Extensiones, tamaño y obligatorio.</div>
            <Button variant="outline" asChild>
              <Link href="/admin/configuracion/documentos">Ver tipos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
