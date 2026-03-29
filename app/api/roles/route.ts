import { NextResponse, type NextRequest } from 'next/server'
import { getRoles, getPermisos, createRol } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'permisos') {
      const permisos = await getPermisos()
      return NextResponse.json(permisos)
    }

    const roles = await getRoles(conjuntoId)
    return NextResponse.json(roles)
  } catch (error) {
    console.error('[roles] GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener roles', detail: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  let body: { nombre: string; descripcion?: string; permisos_ids?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  if (!body.nombre || typeof body.nombre !== 'string' || body.nombre.trim() === '') {
    return NextResponse.json({ error: 'El nombre del rol es requerido' }, { status: 400 })
  }

  try {
    const rol = await createRol({
      nombre: body.nombre.trim(),
      descripcion: body.descripcion?.trim(),
      conjunto_id: conjuntoId!,
      permisos_ids: body.permisos_ids,
    })

    return NextResponse.json(rol, { status: 201 })
  } catch (error) {
    console.error('[roles] POST error:', error)
    const message = (error as Error).message
    if (message.includes('duplicate') || message.includes('unique')) {
      return NextResponse.json(
        { error: 'Ya existe un rol con ese nombre' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Error al crear rol', detail: message },
      { status: 500 }
    )
  }
}
