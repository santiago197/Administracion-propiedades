import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConsejeroSessionFromRequest } from '@/lib/consejero-session'

interface VotarBody {
  proceso_id: string
  propuesta_id: string
}

/**
 * POST /api/evaluacion/votar
 *
 * Registra el voto de un consejero. Sin Supabase Auth.
 *
 * Validaciones:
 *   1. Consejero activo
 *   2. Proceso en estado 'evaluacion' y del mismo conjunto
 *   3. Propuesta pertenece al proceso
 *   4. Consejero no votó ya (409 si repite)
 *   5. Consejero evaluó todas las propuestas (400 si incompleto)
 */
export async function POST(request: NextRequest) {
  let body: VotarBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const { proceso_id, propuesta_id } = body

  if (!proceso_id || !propuesta_id) {
    return NextResponse.json(
      { error: 'proceso_id y propuesta_id son requeridos' },
      { status: 400 }
    )
  }

  const session = getConsejeroSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesión de consejero no válida o expirada' }, { status: 401 })
  }

  if (session.procesoId !== proceso_id) {
    return NextResponse.json({ error: 'La sesión no corresponde al proceso solicitado' }, { status: 403 })
  }

  try {
    const supabase = createAdminClient()

    // 1. Validar consejero activo
    const { data: consejero } = await supabase
      .from('consejeros')
      .select('conjunto_id')
      .eq('id', session.consejeroId)
      .eq('activo', true)
      .single()

    if (!consejero) {
      return NextResponse.json({ error: 'Consejero no válido o inactivo' }, { status: 403 })
    }

    // 2. Validar proceso
    const { data: proceso } = await supabase
      .from('procesos')
      .select('conjunto_id, estado')
      .eq('id', proceso_id)
      .single()

    if (!proceso || proceso.conjunto_id !== consejero.conjunto_id || proceso.conjunto_id !== session.conjuntoId) {
      return NextResponse.json({ error: 'Proceso no pertenece al conjunto del consejero' }, { status: 403 })
    }

    if (proceso.estado !== 'evaluacion' && proceso.estado !== 'votacion') {
      return NextResponse.json({ error: 'El proceso no está en etapa de evaluación o votación' }, { status: 409 })
    }

    // 3. Validar propuesta pertenece al proceso
    const { data: propuesta } = await supabase
      .from('propuestas')
      .select('proceso_id')
      .eq('id', propuesta_id)
      .single()

    if (!propuesta || propuesta.proceso_id !== proceso_id) {
      return NextResponse.json({ error: 'La propuesta no pertenece al proceso' }, { status: 400 })
    }

    // 4. Verificar voto previo
    const { data: votoExistente } = await supabase
      .from('votos')
      .select('id')
      .eq('proceso_id', proceso_id)
      .eq('consejero_id', session.consejeroId)
      .maybeSingle()

    if (votoExistente) {
      return NextResponse.json(
        { error: 'Ya registraste tu voto para este proceso' },
        { status: 409 }
      )
    }

    // 5. Verificar que el consejero evaluó todas las propuestas
    const [{ count: totalPropuestas }, { data: evaluacionesGuardadas }] = await Promise.all([
      supabase
        .from('propuestas')
        .select('*', { count: 'exact', head: true })
        .eq('proceso_id', proceso_id)
        .eq('estado', 'en_evaluacion'),
      supabase
        .from('evaluaciones')
        .select('propuesta_id')
        .eq('proceso_id', proceso_id)
        .eq('consejero_id', session.consejeroId),
    ])

    const propuestasEvaluadas = new Set(evaluacionesGuardadas?.map((e) => e.propuesta_id))

    if (propuestasEvaluadas.size < (totalPropuestas ?? 0)) {
      return NextResponse.json(
        { error: 'Debes evaluar todas las propuestas antes de votar' },
        { status: 400 }
      )
    }

    // 6. Registrar voto
    const { data, error } = await supabase
      .from('votos')
      .insert({ proceso_id, consejero_id: session.consejeroId, propuesta_id })
      .select()
      .single()

    if (error) {
      console.error('[evaluacion/votar] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 7. Recalcular resultados completos (puntaje_evaluacion + votos + puntaje_final)
    // Se ejecuta en segundo plano para no bloquear la respuesta al consejero
    supabase
      .rpc('recalcular_resultados', { p_proceso_id: proceso_id })
      .then(({ error: rpcError }) => {
        if (rpcError) console.warn('[evaluacion/votar] recalcular_resultados:', rpcError.message)
      })

    return NextResponse.json({ success: true, voto_id: data.id })
  } catch (err) {
    console.error('[evaluacion/votar] error:', err)
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
  }
}
