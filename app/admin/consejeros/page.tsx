'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { councilors } from '@/lib/mock/admin-data'

export default function ConsejerosPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Equipo de consejo</p>
          <h1 className="text-2xl font-semibold tracking-tight">Consejeros</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Agregar consejero</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo consejero</DialogTitle>
              <DialogDescription>Solo UI con datos mock, sin guardar aún.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Input placeholder="Nombre completo" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Cargo (Presidente, Vocal...)" />
                <Input placeholder="Correo" type="email" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Torre" />
                <Input placeholder="Apartamento" />
              </div>
              <Input placeholder="Teléfono" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setOpen(false)}>Guardar (mock)</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de consejeros</CardTitle>
          <CardDescription>Tabla con información básica y estado de actividad.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {councilors.map((c) => (
                <TableRow key={c.nombre}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>{c.cargo}</TableCell>
                  <TableCell>
                    Torre {c.torre} - Apto {c.apto}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.contacto}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={c.activo ? 'secondary' : 'outline'}>
                      {c.activo ? 'Activo' : 'Inactivo'}
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
