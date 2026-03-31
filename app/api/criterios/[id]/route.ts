import { NextResponse, type NextRequest } from 'next/server'
import { getCriterio, updateCriterio, deleteCriterio } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { id } = await params
    const criterio = await getCriterio(id)

    if (!criterio) {
      return NextResponse.json({ error: 'Criterio no encontrado' }, { status: 404 })
    }

    return NextResponse.json(criterio)
  } catch (error) {
    console.error('[API] Error fetching criterio:', error)
    return NextResponse.json({ error: 'Error al obtener criterio' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { id } = await params
    const body = await request.json()

    if (body.peso !== undefined && (body.peso < 0 || body.peso > 100)) {
      return NextResponse.json(
        { error: 'El peso debe estar entre 0 y 100' },
        { status: 400 }
      )
    }

    const criterio = await updateCriterio(id, {
      ...(body.codigo !== undefined && { codigo: body.codigo }),
      ...(body.nombre !== undefined && { nombre: body.nombre }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
      ...(body.peso !== undefined && { peso: body.peso }),
      ...(body.activo !== undefined && { activo: body.activo }),
      ...(body.orden !== undefined && { orden: body.orden }),
    })

    return NextResponse.json(criterio)
  } catch (error) {
    console.error('[API] Error updating criterio:', error)
    const message = error instanceof Error ? error.message : 'Error al actualizar criterio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { id } = await params
    await deleteCriterio(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting criterio:', error)
    const message = error instanceof Error ? error.message : 'Error al eliminar criterio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
