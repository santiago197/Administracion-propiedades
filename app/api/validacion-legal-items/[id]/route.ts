import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { deleteValidacionLegalItem, updateValidacionLegalItem } from '@/lib/supabase/queries'
import type { AplicaAItemChecklist, CriticidadItem } from '@/lib/types/index'

type RouteContext = { params: Promise<{ id: string }> }

function toCriticidad(value: unknown): CriticidadItem | null {
  if (value === undefined) return null
  if (value === 'critico' || value === 'importante' || value === 'condicionante' || value === 'informativo') {
    return value
  }
  return null
}

function toAplicaA(value: unknown): AplicaAItemChecklist | null {
  if (value === undefined) return null
  if (value === 'ambos' || value === 'juridica' || value === 'natural') return value
  return null
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params
  try {
    const body = await request.json()
    const categoria = toCriticidad(body.categoria)
    const aplica_a = toAplicaA(body.aplica_a)

    if (body.categoria !== undefined && !categoria) {
      return NextResponse.json({ error: 'categoria inválida' }, { status: 400 })
    }
    if (body.aplica_a !== undefined && !aplica_a) {
      return NextResponse.json({ error: 'aplica_a inválido' }, { status: 400 })
    }

    const payload: Record<string, unknown> = {}
    if (body.codigo !== undefined) payload.codigo = String(body.codigo).trim()
    if (body.seccion !== undefined) payload.seccion = String(body.seccion).trim()
    if (body.nombre !== undefined) payload.nombre = String(body.nombre).trim()
    if (body.descripcion !== undefined) payload.descripcion = String(body.descripcion).trim()
    if (body.activo !== undefined) payload.activo = Boolean(body.activo)
    if (body.obligatorio !== undefined) payload.obligatorio = Boolean(body.obligatorio)
    if (body.orden !== undefined) payload.orden = Number(body.orden)
    if (categoria) payload.categoria = categoria
    if (aplica_a) payload.aplica_a = aplica_a

    const { data, error } = await updateValidacionLegalItem(id, payload)
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[validacion-legal-items/[id]] PATCH error:', err)
    return NextResponse.json({ error: 'Error al actualizar item de validación legal' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params
  try {
    const { error } = await deleteValidacionLegalItem(id)
    if (error) throw error
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[validacion-legal-items/[id]] DELETE error:', err)
    return NextResponse.json({ error: 'Error al eliminar item de validación legal' }, { status: 500 })
  }
}

