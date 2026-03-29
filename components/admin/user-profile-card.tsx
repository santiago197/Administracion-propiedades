'use client'

import { User, Mail, Shield, Building2, Hash, Calendar } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { UsuarioConConjunto } from '@/lib/types'
import { LABEL_ROL_USUARIO } from '@/lib/types'

interface UserProfileCardProps {
  user: UsuarioConConjunto
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email?.slice(0, 2).toUpperCase() ?? 'U'
}

function getRolVariant(rol: string): 'default' | 'secondary' | 'outline' {
  switch (rol) {
    case 'superadmin':
      return 'default'
    case 'admin':
      return 'secondary'
    default:
      return 'outline'
  }
}

/**
 * Client Component que renderiza la UI del perfil de usuario.
 * Recibe los datos ya obtenidos del servidor.
 */
export function UserProfileCard({ user }: UserProfileCardProps) {
  const initials = getInitials(user.nombre, user.email)
  const rolLabel = LABEL_ROL_USUARIO[user.rol] ?? user.rol
  const conjuntoNombre = user.conjunto?.nombre ?? 'Sin conjunto asignado'
  const fechaCreacion = new Date(user.created_at).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 text-lg">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl truncate">
              {user.nombre || 'Usuario'}
            </CardTitle>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-4">
        {/* Rol */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Rol</span>
          </div>
          <Badge variant={getRolVariant(user.rol)}>{rolLabel}</Badge>
        </div>

        {/* Conjunto */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>Conjunto</span>
          </div>
          <span className="text-sm font-medium truncate max-w-[180px]">
            {conjuntoNombre}
          </span>
        </div>

        {/* ID */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="h-4 w-4" />
            <span>ID</span>
          </div>
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {user.id.slice(0, 8)}...
          </code>
        </div>

        {/* Fecha de registro */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Miembro desde</span>
          </div>
          <span className="text-sm">{fechaCreacion}</span>
        </div>

        {/* Estado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Estado</span>
          </div>
          <Badge variant={user.activo ? 'secondary' : 'destructive'}>
            {user.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
