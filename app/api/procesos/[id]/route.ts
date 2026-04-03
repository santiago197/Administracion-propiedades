import { NextResponse, type NextRequest } from 'next/server'
import { getProcesoConjunto, updateProceso } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createClient } from '@/lib/supabase/server'
import type { Proceso } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  try {
    const { data: proceso, error } = await getProcesoConjunto(id, conjuntoId!)

    if (error || !proceso) {
      return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
    }

    const supabase = await createClient()
    const [{ count: total_propuestas }, { count: total_consejeros }] = await Promise.all([
      supabase
        .from('propuestas')
        .select('*', { count: 'exact', head: true })
        .eq('proceso_id', id),
      supabase
        .from('consejeros')
        .select('*', { count: 'exact', head: true })
        .eq('conjunto_id', proceso.conjunto_id)
        .eq('activo', true),
    ])

    return NextResponse.json({
      ...proceso,
      total_propuestas: total_propuestas ?? 0,
      total_consejeros: total_consejeros ?? 0,
    })
  } catch (err) {
    console.error('[procesos/id] GET error:', err)
    return NextResponse.json({ error: 'Error al obtener proceso' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  let body: Partial<
    Pick<Proceso, 'nombre' | 'descripcion' | 'fecha_inicio' | 'fecha_fin' | 'peso_evaluacion' | 'peso_votacion' | 'es_publica'>
  >

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  try {
    const { data: existing, error: fetchError } = await getProcesoConjunto(id, conjuntoId!)

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
    }

    // Permitir cambios de es_publica en cualquier estado
    // Permitir otros cambios solo en configuración
    const isOnlyChangingVisibility = 
      Object.keys(body).length === 1 && 'es_publica' in body

    if (!isOnlyChangingVisibility && existing.estado !== 'configuracion') {
      return NextResponse.json(
        { error: 'Solo se pueden editar procesos en estado de configuración' },
        { status: 409 }
      )
    }

    const pesoEval = body.peso_evaluacion ?? existing.peso_evaluacion
    const pesoVot = body.peso_votacion ?? existing.peso_votacion

    // Solo validar pesos si se están cambiando
    if (body.peso_evaluacion !== undefined || body.peso_votacion !== undefined) {
      if (Math.round(pesoEval + pesoVot) !== 100) {
        return NextResponse.json({ error: 'La suma de pesos debe ser 100%' }, { status: 400 })
      }
    }

    const allowed: Partial<Proceso> = {}
    if (body.nombre !== undefined) allowed.nombre = body.nombre
    if (body.descripcion !== undefined) allowed.descripcion = body.descripcion
    if (body.fecha_inicio !== undefined) allowed.fecha_inicio = body.fecha_inicio
    if (body.fecha_fin !== undefined) allowed.fecha_fin = body.fecha_fin
    if (body.peso_evaluacion !== undefined) allowed.peso_evaluacion = body.peso_evaluacion
    if (body.peso_votacion !== undefined) allowed.peso_votacion = body.peso_votacion
    if (body.es_publica !== undefined) allowed.es_publica = body.es_publica

    const { data, error } = await updateProceso(id, allowed)
    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error('[procesos/id] PUT error:', err)
    return NextResponse.json({ error: 'Error al actualizar proceso' }, { status: 500 })
  }
}
