import { NextResponse, type NextRequest } from 'next/server'
import { updateTipoDocumento, deleteTipoDocumento } from '@/lib/supabase/queries'
import { getCurrentUser } from '@/lib/supabase/auth-utils'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { user, error } = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: error ?? 'No autorizado' }, { status: 401 })

  const { id } = await params
  try {
    const body = await request.json()
    const { data, error: dbError } = await updateTipoDocumento(id, body)
    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err) {
    console.error('[tipos-documento/[id]] PATCH error:', err)
    return NextResponse.json({ error: 'Error al actualizar tipo de documento' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { user, error } = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: error ?? 'No autorizado' }, { status: 401 })

  const { id } = await params
  try {
    const { error: dbError } = await deleteTipoDocumento(id)
    if (dbError) throw dbError
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[tipos-documento/[id]] DELETE error:', err)
    return NextResponse.json({ error: 'Error al eliminar tipo de documento' }, { status: 500 })
  }
}
