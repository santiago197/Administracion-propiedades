'use client'

import { useState, useRef, useEffect } from 'react'
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
import { useToast } from '@/components/ui/use-toast'
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'
import type { Conjunto } from '@/lib/types'

export default function PerfilConjuntoPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [conjunto, setConjunto] = useState<Conjunto | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchConjunto()
  }, [])

  async function fetchConjunto() {
    try {
      setLoading(true)
      const response = await fetch('/api/conjuntos')
      if (!response.ok) throw new Error('Error al obtener conjunto')
      const data = await response.json()
      setConjunto(data)
      if (data.logo_url) {
        setPreviewUrl(data.logo_url)
      }
    } catch (error) {
      console.error('Error fetching conjunto:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del conjunto',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de archivo no permitido',
        description: 'Por favor usa PNG, JPG o WEBP',
        variant: 'destructive',
      })
      return
    }

    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El tamaño máximo es 2MB',
        variant: 'destructive',
      })
      return
    }

    // Mostrar preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Subir archivo
    await uploadLogo(file)
  }

  async function uploadLogo(file: File) {
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        // Mostrar detalles si están disponibles
        const message = error.details 
          ? `${error.error}\n\nDetalles: ${error.details}`
          : error.error || 'Error al subir logo'
        throw new Error(message)
      }

      const result = await response.json()

      toast({
        title: 'Logo actualizado',
        description: 'El logo se ha actualizado exitosamente',
      })

      // Actualizar conjunto con nueva URL
      setConjunto((prev) => prev ? { ...prev, logo_url: result.url } : null)
      setPreviewUrl(result.url)
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al subir logo',
        variant: 'destructive',
      })
      // Restaurar preview anterior
      if (conjunto?.logo_url) {
        setPreviewUrl(conjunto.logo_url)
      } else {
        setPreviewUrl(null)
      }
    } finally {
      setUploading(false)
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!conjunto) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Error</p>
          <h1 className="text-2xl font-semibold tracking-tight">No se pudo cargar el conjunto</h1>
        </div>
      </div>
    )
  }

  const initials = conjunto.nombre
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

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
                <Input defaultValue={conjunto.nombre} placeholder="Nombre del conjunto" disabled />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ciudad</label>
                <Input defaultValue={conjunto.ciudad || ''} placeholder="Ciudad" disabled />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Dirección</label>
                <Input defaultValue={conjunto.direccion || ''} placeholder="Dirección" disabled />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Año</label>
                <Input type="number" defaultValue={conjunto.anio} disabled />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Funcionalidad de edición pendiente. Contacta al administrador para cambios.
            </p>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex w-full justify-end gap-3">
              <Button variant="outline" disabled>Cancelar</Button>
              <Button disabled>Guardar cambios</Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identidad visual</CardTitle>
            <CardDescription>Sube el logo y ajusta la presentación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-6">
              {/* Preview del logo */}
              <div className="relative h-32 w-32 rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Logo del conjunto"
                    fill
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-12 w-12" />
                    <span className="text-2xl font-bold">{initials}</span>
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="font-medium">Logo del conjunto</p>
                <p className="text-sm text-muted-foreground">PNG, JPG o WEBP, máximo 2MB</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                variant={previewUrl ? 'outline' : 'default'}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {previewUrl ? 'Cambiar logo' : 'Subir logo'}
                  </>
                )}
              </Button>
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
