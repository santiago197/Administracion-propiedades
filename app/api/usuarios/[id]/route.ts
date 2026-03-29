import { NextResponse, type NextRequest } from 'next/server'
import { getUsuario, updateUsuario, deleteUsuario } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import type { RolUsuario } from '@/lib/types/index'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  try {
    const usuario = await getUsuario(id)
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    return NextResponse.json(usuario)
  } catch (error) {
    console.error('[usuarios/:id] GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuario', detail: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  let body: {
    nombre?: string
    rol?: RolUsuario
    activo?: boolean
    conjunto_id?: string | null
    permisos_ids?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  // Validar rol si se proporciona
  const validRoles: RolUsuario[] = ['superadmin', 'admin', 'evaluador', 'consejero']
  if (body.rol && !validRoles.includes(body.rol)) {
    return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })
  }
  if (body.permisos_ids !== undefined && !Array.isArray(body.permisos_ids)) {
    return NextResponse.json({ error: 'permisos_ids inválido' }, { status: 400 })
  }

  try {
    const usuario = await updateUsuario(id, {
      nombre: body.nombre?.trim(),
      rol: body.rol,
      activo: body.activo,
      conjunto_id: body.conjunto_id,
      permisos_ids: body.permisos_ids,
    })

    return NextResponse.json(usuario)
  } catch (error) {
    console.error('[usuarios/:id] PATCH error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar usuario', detail: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  try {
    await deleteUsuario(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[usuarios/:id] DELETE error:', error)
    const message = (error as Error).message
    if (message.includes('propio')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Error al eliminar usuario', detail: message },
      { status: 500 }
    )
  }
}
