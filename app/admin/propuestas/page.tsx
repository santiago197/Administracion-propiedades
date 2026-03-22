import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { proposals } from '@/lib/mock/admin-data'

const semaforoClase: Record<string, string> = {
  verde: 'bg-emerald-500/10 text-emerald-700',
  amarillo: 'bg-amber-500/10 text-amber-700',
  rojo: 'bg-destructive/10 text-destructive',
}

export default function PropuestasPage() {
  const detalle = proposals[0]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Candidatos</p>
          <h1 className="text-2xl font-semibold tracking-tight">Propuestas</h1>
          <p className="text-sm text-muted-foreground">
            Tabla + detalle: documentos, evaluación, puntaje y trazabilidad.
          </p>
        </div>
        <Button>Agregar propuesta</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabla de propuestas</CardTitle>
          <CardDescription>Estado, documentación, puntaje y clasificación automática.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa / persona</TableHead>
                <TableHead>Tipo de persona</TableHead>
                <TableHead>Estado (badge)</TableHead>
                <TableHead>Documentación</TableHead>
                <TableHead>Puntaje</TableHead>
                <TableHead>Clasificación</TableHead>
                <TableHead>Contacto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((p) => (
                <TableRow key={p.razonSocial}>
                  <TableCell className="font-medium">{p.razonSocial}</TableCell>
                  <TableCell className="capitalize">{p.tipo}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={p.documentacion} className="w-24" />
                      <span className="text-xs font-semibold">{p.documentacion}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-sm">{p.puntaje.toFixed(1)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={semaforoClase[p.semaforo] ?? ''} variant="outline">
                        {p.semaforo.charAt(0).toUpperCase() + p.semaforo.slice(1)}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {p.clasificacion}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.contacto}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">
            No avanza a Evaluación si la documentación es incompleta o la validación legal es No Apto.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de propuesta</CardTitle>
          <CardDescription>Información, documentos, evaluación y historial auditable.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList>
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="evaluacion">Evaluación</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Empresa / persona</p>
                  <p className="font-semibold">{detalle?.razonSocial}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge variant="secondary">{detalle?.estado}</Badge>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Clasificación</p>
                  <Badge variant="outline" className="capitalize">
                    {detalle?.clasificacion}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Visibilidad: quién evaluó, con qué criterios y por qué obtuvo el puntaje actual.
              </p>
            </TabsContent>

            <TabsContent value="documentos" className="space-y-3">
              <div className="flex items-center gap-3">
                <Progress value={detalle?.documentacion} className="flex-1" />
                <span className="text-sm font-semibold">{detalle?.documentacion}% completo</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Bloqueo: no pasa a Validación legal si falta un documento requerido o está vencido.
              </p>
            </TabsContent>

            <TabsContent value="evaluacion" className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Puntaje actual</p>
                <p className="text-2xl font-bold">{detalle?.puntaje}/5</p>
                <p className="text-xs text-muted-foreground">
                  Incluye criterios Legal, Técnico, Financiero, Referencias y Propuesta económica.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="historial" className="space-y-3">
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="rounded-md border border-dashed px-3 py-2">
                  15/01/2025 - Registro de propuesta por Admin.
                </div>
                <div className="rounded-md border border-dashed px-3 py-2">
                  02/02/2025 - Documentación completa, habilitado para Validación legal.
                </div>
                <div className="rounded-md border border-dashed px-3 py-2">
                  05/03/2025 - Evaluación Consejo (promedio 4.7/5).
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
