import { NextResponse, type NextRequest } from 'next/server'
import { getRol, updateRol, deleteRol } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  try {
    const rol = await getRol(id)
    if (!rol) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
    }
    return NextResponse.json(rol)
  } catch (error) {
    console.error('[roles/:id] GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener rol', detail: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  let body: { nombre?: string; descripcion?: string; activo?: boolean; permisos_ids?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  try {
    const rol = await updateRol(id, {
      nombre: body.nombre?.trim(),
      descripcion: body.descripcion?.trim(),
      activo: body.activo,
      permisos_ids: body.permisos_ids,
    })

    if (!rol) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
    }

    return NextResponse.json(rol)
  } catch (error) {
    console.error('[roles/:id] PATCH error:', error)
    const message = (error as Error).message
    if (message.includes('sistema')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message.includes('duplicate') || message.includes('unique')) {
      return NextResponse.json({ error: 'Ya existe un rol con ese nombre' }, { status: 409 })
    }
    return NextResponse.json(
      { error: 'Error al actualizar rol', detail: message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  try {
    await deleteRol(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[roles/:id] DELETE error:', error)
    const message = (error as Error).message
    if (message.includes('sistema')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Error al eliminar rol', detail: message },
      { status: 500 }
    )
  }
}
