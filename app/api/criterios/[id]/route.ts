import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
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

    if (body.proceso_id) {
      if (body.valor_minimo !== undefined && body.valor_maximo !== undefined && body.valor_minimo > body.valor_maximo) {
        return NextResponse.json(
          { error: 'valor_minimo no puede ser mayor que valor_maximo' },
          { status: 400 }
        )
      }
      const supabase = await createServerClient()
      const { data: updated, error } = await supabase
        .from('criterios')
        .update({
          peso: body.peso,
          valor_minimo: body.valor_minimo,
          valor_maximo: body.valor_maximo,
          orden: body.orden,
          activo: body.activo,
        })
        .eq('id', id)
        .select(
          'id, proceso_id, criterio_evaluacion_id, peso, valor_minimo, valor_maximo, orden, activo, criterios_evaluacion:criterio_evaluacion_id (nombre, descripcion, tipo)'
        )
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const catalogo = updated.criterios_evaluacion
      return NextResponse.json({
        id: updated.id,
        proceso_id: updated.proceso_id,
        criterio_evaluacion_id: updated.criterio_evaluacion_id,
        nombre: catalogo?.nombre ?? 'Criterio',
        descripcion: catalogo?.descripcion ?? null,
        tipo: catalogo?.tipo ?? 'escala',
        peso: updated.peso,
        valor_minimo: updated.valor_minimo,
        valor_maximo: updated.valor_maximo,
        orden: updated.orden ?? 0,
        activo: updated.activo ?? true,
      })
    }

    const criterio = await updateCriterio(id, {
      ...(body.nombre !== undefined && { nombre: body.nombre }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
      ...(body.tipo !== undefined && { tipo: body.tipo }),
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
    const { searchParams } = new URL(request.url)
    const procesoId = searchParams.get('proceso_id')

    if (procesoId) {
      const supabase = await createServerClient()
      const { error } = await supabase.from('criterios').delete().eq('id', id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    await deleteCriterio(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting criterio:', error)
    const message = error instanceof Error ? error.message : 'Error al eliminar criterio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
