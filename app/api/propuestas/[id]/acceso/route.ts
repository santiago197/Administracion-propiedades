/**
 * API: Gestionar acceso de proponentes
 * POST /api/propuestas/[id]/acceso - Generar código
 * PATCH /api/propuestas/[id]/acceso - Actualizar configuración
 * GET /api/propuestas/[id]/acceso - Obtener estado
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { authorized, user } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const propuestaId = context.params.id

    // TODO: Obtener acceso actual de la BD
    // const { data: acceso } = await supabase
    //   .from('acceso_proponentes')
    //   .select('*')
    //   .eq('propuesta_id', propuestaId)
    //   .single()

    return NextResponse.json({
      propuestaId,
      codigo: null,
      estado: 'inactivo',
      fechaLimite: null,
      activo: false,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { authorized, user } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const propuestaId = context.params.id

    // Generar código único
    const codigo = generarCodigoUnico()
    const ahora = new Date()
    const fechaLimite = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 días

    // TODO: Guardar en BD
    // const { data: acceso, error } = await supabase
    //   .from('acceso_proponentes')
    //   .upsert({
    //     propuesta_id: propuestaId,
    //     codigo,
    //     activo: true,
    //     fecha_limite: fechaLimite,
    //     created_by: user?.id,
    //     created_at: ahora,
    //   })
    //   .select()
    //   .single()

    return NextResponse.json({
      propuestaId,
      codigo,
      estado: 'activo',
      fechaLimite: fechaLimite.toISOString(),
      activo: true,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { authorized, user } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const propuestaId = context.params.id
    const body = await request.json()

    // TODO: Actualizar en BD
    // const { data: acceso, error } = await supabase
    //   .from('acceso_proponentes')
    //   .update({
    //     activo: body.activo,
    //     fecha_limite: body.fechaLimite,
    //     updated_at: new Date(),
    //   })
    //   .eq('propuesta_id', propuestaId)
    //   .select()
    //   .single()

    return NextResponse.json({
      propuestaId,
      ...body,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { authorized, user } = await requireAuth(request)
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const propuestaId = context.params.id

    // TODO: Eliminar de BD
    // await supabase
    //   .from('acceso_proponentes')
    //   .delete()
    //   .eq('propuesta_id', propuestaId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────

function generarCodigoUnico(): string {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const codigoLetras = Array(3)
    .fill(0)
    .map(() => letras[Math.floor(Math.random() * letras.length)])
    .join('')
  const codigoNumeros = Math.floor(10000 + Math.random() * 90000).toString()
  return codigoLetras + codigoNumeros
}
