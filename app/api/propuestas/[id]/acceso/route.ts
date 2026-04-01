/**
 * API: Gestionar acceso de proponentes
 * POST /api/propuestas/[id]/acceso - Generar código
 * PATCH /api/propuestas/[id]/acceso - Actualizar configuración
 * GET /api/propuestas/[id]/acceso - Obtener estado
 * DELETE /api/propuestas/[id]/acceso - Revocar acceso
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import {
  obtenerAccesoProponente,
  generarCodigoAccesoProponente,
  actualizarAccesoProponente,
  revocarAccesoProponente,
} from '@/lib/supabase/queries'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id: propuestaId } = await context.params

    const { data, error } = await obtenerAccesoProponente(propuestaId)

    if (error) {
      console.error('[acceso GET]', error)
      return NextResponse.json({ error: 'Error al obtener acceso' }, { status: 500 })
    }

    return NextResponse.json(data || { propuestaId, codigo: null, activo: false })
  } catch (error) {
    console.error('[acceso GET] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, user } = await requireAuth(request)
    if (!authorized || !user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id: propuestaId } = await context.params

    const { data, error } = await generarCodigoAccesoProponente(
      propuestaId,
      user.id
    )

    if (error) {
      console.error('[acceso POST]', error)
      return NextResponse.json({ error: 'Error al generar código' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[acceso POST] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id: propuestaId } = await context.params
    const body = await request.json()

    const { data, error } = await actualizarAccesoProponente(
      propuestaId,
      body.activo ?? true,
      body.fechaLimite ? new Date(body.fechaLimite) : null
    )

    if (error) {
      console.error('[acceso PATCH]', error)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[acceso PATCH] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id: propuestaId } = await context.params

    const { error } = await revocarAccesoProponente(propuestaId)

    if (error) {
      console.error('[acceso DELETE]', error)
      return NextResponse.json({ error: 'Error al revocar acceso' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[acceso DELETE] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
