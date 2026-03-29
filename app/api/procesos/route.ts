import { NextResponse, type NextRequest } from 'next/server'
import { createProceso, getProcesos } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import type { Proceso } from '@/lib/types'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const conjunto_id = searchParams.get('conjunto_id')

    if (!conjunto_id) {
      return NextResponse.json(
        { error: 'conjunto_id es requerido' },
        { status: 400 }
      )
    }

    if (conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Acceso denegado al conjunto' }, { status: 403 })
    }

    const { data, error } = await getProcesos(conjunto_id)
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching procesos:', error)
    return NextResponse.json({ error: 'Error al obtener procesos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()

    if (!body?.conjunto_id || body.conjunto_id !== conjuntoId) {
      return NextResponse.json(
        { error: 'conjunto_id inválido o faltante' },
        { status: 403 }
      )
    }

    const pesoEvaluacion = Number(body.peso_evaluacion ?? 0)
    const pesoVotacion = Number(body.peso_votacion ?? 0)
    if (Math.round(pesoEvaluacion + pesoVotacion) !== 100) {
      return NextResponse.json(
        { error: 'La suma de pesos de evaluación y votación debe ser 100%' },
        { status: 400 }
      )
    }

    if (!body.nombre) {
      return NextResponse.json({ error: 'El nombre del proceso es requerido' }, { status: 400 })
    }

    const payload = {
      conjunto_id: conjuntoId,
      nombre: String(body.nombre),
      descripcion: body.descripcion ?? null,
      fecha_inicio: body.fecha_inicio ?? new Date().toISOString(),
      fecha_fin: body.fecha_fin ?? null,
      peso_evaluacion: pesoEvaluacion,
      peso_votacion: pesoVotacion,
      estado: body.estado ?? 'configuracion',
    } satisfies Omit<Proceso, 'id' | 'created_at' | 'updated_at'>

    const { data, error } = await createProceso(payload)
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating proceso:', error)
    return NextResponse.json({ error: 'Error al crear proceso' }, { status: 500 })
  }
}
