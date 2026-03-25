import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { roles } from '@/lib/mock/admin-data'

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Permisos</p>
          <h1 className="text-2xl font-semibold tracking-tight">Roles y accesos</h1>
        </div>
        <Button>Nuevo rol</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles configurados</CardTitle>
          <CardDescription>Permisos visibles con checkboxes (solo UI).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((rol) => (
                <TableRow key={rol.nombre}>
                  <TableCell className="font-medium">{rol.nombre}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {rol.permisos.map((permiso) => (
                        <label
                          key={permiso}
                          className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                        >
                          <Checkbox checked disabled />
                          <span>{permiso}</span>
                        </label>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rol.activo ? 'secondary' : 'outline'}>
                      {rol.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
