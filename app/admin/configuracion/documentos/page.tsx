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
import { Switch } from '@/components/ui/switch'
import { documentTypes } from '@/lib/mock/admin-data'

export default function TiposDocumentosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Parámetros documentales</p>
          <h1 className="text-2xl font-semibold tracking-tight">Tipos de documentos</h1>
        </div>
        <Button>Nuevo tipo</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>Campos requeridos, extensiones y tamaño máximo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Requerido</TableHead>
                <TableHead>Extensiones</TableHead>
                <TableHead>Máximo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentTypes.map((doc) => (
                <TableRow key={doc.nombre}>
                  <TableCell className="font-medium">{doc.nombre}</TableCell>
                  <TableCell>{doc.categoria}</TableCell>
                  <TableCell>
                    <Switch checked={doc.requerido} readOnly />
                  </TableCell>
                  <TableCell>{doc.extensiones}</TableCell>
                  <TableCell>{doc.maximo}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost">
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost">
                        Eliminar
                      </Button>
                    </div>
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
