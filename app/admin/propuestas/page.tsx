'use client'

import { useState, useEffect } from 'react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Propuesta, Proceso } from '@/lib/types'

export default function PropuestasPage() {
  const [open, setOpen] = useState(false)
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedProceso, setSelectedProceso] = useState<string>('')
  const [formData, setFormData] = useState({
    tipo_persona: 'juridica' as const,
    razon_social: '',
    nit_cedula: '',
    representante_legal: '',
    anios_experiencia: 0,
    unidades_administradas: 0,
    telefono: '',
    email: '',
    direccion: '',
    valor_honorarios: '',
    observaciones: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      // Obtener conjunto
      const conjuntoRes = await fetch('/api/conjuntos')
      if (!conjuntoRes.ok) throw new Error('Error al obtener conjunto')
      const conjunto = await conjuntoRes.json()

      // Obtener procesos
      const procesosRes = await fetch(`/api/procesos?conjunto_id=${conjunto.id}`)
      if (!procesosRes.ok) throw new Error('Error al obtener procesos')
      const procesosData = await procesosRes.json()
      setProcesos(procesosData)

      // Si hay procesos, seleccionar el primero y cargar sus propuestas
      if (procesosData.length > 0) {
        const primerProceso = procesosData[0].id
        setSelectedProceso(primerProceso)
        await loadPropuestas(primerProceso)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadPropuestas(procesoId: string) {
    try {
      const response = await fetch(`/api/propuestas?proceso_id=${procesoId}`)
      if (!response.ok) throw new Error('Error al obtener propuestas')
      const data = await response.json()
      setPropuestas(data)
    } catch (error) {
      console.error('Error loading propuestas:', error)
      setPropuestas([])
    }
  }

  async function handleProcesoChange(procesoId: string) {
    setSelectedProceso(procesoId)
    await loadPropuestas(procesoId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProceso) {
      alert('Selecciona un proceso primero')
      return
    }

    setSaving(true)

    try {
      const payload = {
        ...formData,
        proceso_id: selectedProceso,
        valor_honorarios: formData.valor_honorarios ? Number(formData.valor_honorarios) : null,
      }

      const response = await fetch('/api/propuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear propuesta')
      }

      // Refresh list
      await loadPropuestas(selectedProceso)
      
      // Reset form and close dialog
      setFormData({
        tipo_persona: 'juridica',
        razon_social: '',
        nit_cedula: '',
        representante_legal: '',
        anios_experiencia: 0,
        unidades_administradas: 0,
        telefono: '',
        email: '',
        direccion: '',
        valor_honorarios: '',
        observaciones: '',
      })
      setOpen(false)
    } catch (error) {
      console.error('Error creating propuesta:', error)
      alert(error instanceof Error ? error.message : 'Error al crear propuesta')
    } finally {
      setSaving(false)
    }
  }

  const detalle = propuestas[0]

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={procesos.length === 0}>Agregar propuesta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Nueva propuesta</DialogTitle>
                <DialogDescription>Registra un nuevo candidato para el proceso de selección.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_persona">Tipo de persona *</Label>
                    <Select value={formData.tipo_persona} onValueChange={(value: any) => setFormData({ ...formData, tipo_persona: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="juridica">Jurídica</SelectItem>
                        <SelectItem value="natural">Natural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nit_cedula">{formData.tipo_persona === 'juridica' ? 'NIT' : 'Cédula'} *</Label>
                    <Input
                      id="nit_cedula"
                      value={formData.nit_cedula}
                      onChange={(e) => setFormData({ ...formData, nit_cedula: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razon_social">{formData.tipo_persona === 'juridica' ? 'Razón social' : 'Nombre completo'} *</Label>
                  <Input
                    id="razon_social"
                    value={formData.razon_social}
                    onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                    required
                  />
                </div>
                {formData.tipo_persona === 'juridica' && (
                  <div className="space-y-2">
                    <Label htmlFor="representante_legal">Representante legal</Label>
                    <Input
                      id="representante_legal"
                      value={formData.representante_legal}
                      onChange={(e) => setFormData({ ...formData, representante_legal: e.target.value })}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="anios_experiencia">Años de experiencia</Label>
                    <Input
                      id="anios_experiencia"
                      type="number"
                      value={formData.anios_experiencia}
                      onChange={(e) => setFormData({ ...formData, anios_experiencia: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unidades_administradas">Unidades administradas</Label>
                    <Input
                      id="unidades_administradas"
                      type="number"
                      value={formData.unidades_administradas}
                      onChange={(e) => setFormData({ ...formData, unidades_administradas: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_honorarios">Valor honorarios mensuales</Label>
                  <Input
                    id="valor_honorarios"
                    type="number"
                    value={formData.valor_honorarios}
                    onChange={(e) => setFormData({ ...formData, valor_honorarios: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Input
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {procesos.length > 0 && (
        <div className="flex items-center gap-3">
          <Label>Proceso:</Label>
          <Select value={selectedProceso} onValueChange={handleProcesoChange}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {procesos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tabla de propuestas</CardTitle>
          <CardDescription>Estado, documentación, puntaje y clasificación automática.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando propuestas...
            </div>
          ) : !selectedProceso ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay procesos creados. Crea un proceso primero.
            </div>
          ) : propuestas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay propuestas registradas para este proceso.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa / persona</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead>Clasificación</TableHead>
                    <TableHead>Contacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propuestas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.razon_social}</TableCell>
                      <TableCell className="capitalize">{p.tipo_persona === 'juridica' ? 'Jurídica' : 'Natural'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.estado}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-sm">{p.puntaje_final.toFixed(1)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {p.clasificacion || 'Sin clasificar'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.email || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-2 text-xs text-muted-foreground">
                No avanza a Evaluación si la documentación es incompleta o la validación legal es No Apto.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {detalle && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle de propuesta</CardTitle>
            <CardDescription>Información, documentos, evaluación y historial auditable.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info" className="space-y-4">
              <TabsList>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="evaluacion">Evaluación</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Empresa / persona</p>
                    <p className="font-semibold">{detalle.razon_social}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Badge variant="secondary">{detalle.estado}</Badge>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Clasificación</p>
                    <Badge variant="outline" className="capitalize">
                      {detalle.clasificacion || 'Sin clasificar'}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Visibilidad: quién evaluó, con qué criterios y por qué obtuvo el puntaje actual.
                </p>
              </TabsContent>

              <TabsContent value="evaluacion" className="space-y-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Puntaje actual</p>
                  <p className="text-2xl font-bold">{detalle.puntaje_final.toFixed(2)}/5</p>
                  <p className="text-xs text-muted-foreground">
                    Incluye criterios Legal, Técnico, Financiero, Referencias y Propuesta económica.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="historial" className="space-y-3">
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div className="rounded-md border border-dashed px-3 py-2">
                    {new Date(detalle.created_at).toLocaleDateString('es-CO')} - Registro de propuesta.
                  </div>
                  <div className="rounded-md border border-dashed px-3 py-2">
                    Estado actual: {detalle.estado}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
