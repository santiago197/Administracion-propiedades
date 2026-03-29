import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UserProfile } from '@/components/admin/user-profile'

function UserProfileSkeleton() {
  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-6">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-px w-full mb-4" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Parámetros generales</p>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Mi perfil */}
        <Card className="md:col-span-2 xl:col-span-1 xl:row-span-2">
          <CardHeader>
            <CardTitle>Mi perfil</CardTitle>
            <CardDescription>Tu información de usuario autenticado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<UserProfileSkeleton />}>
              <UserProfile />
            </Suspense>
          </CardContent>
        </Card>

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
