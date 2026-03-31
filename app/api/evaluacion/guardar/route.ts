import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConsejeroSessionFromRequest } from '@/lib/consejero-session'

interface ItemEvaluacion {
  criterio_id: string
  valor: number
  comentario?: string
}

interface GuardarBody {
  proceso_id: string
  propuesta_id: string
  items: ItemEvaluacion[]
}

/**
 * POST /api/evaluacion/guardar
 *
 * Guarda en batch todas las evaluaciones de una propuesta para un consejero.
 * Sin Supabase Auth — valida consejero por su id + conjunto.
 *
 * Body:
 *   proceso_id   — UUID del proceso
 *   propuesta_id — UUID de la propuesta evaluada
 *   items        — Array de { criterio_id, valor, comentario? }
 *
 * Respuesta:
 *   { guardadas: number, evaluacion_completa: boolean }
 */
export async function POST(request: NextRequest) {
  let body: GuardarBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const { proceso_id, propuesta_id, items } = body
  const session = getConsejeroSessionFromRequest(request)

  if (!proceso_id || !propuesta_id) {
    return NextResponse.json(
      { error: 'proceso_id y propuesta_id son requeridos' },
      { status: 400 }
    )
  }

  if (!session) {
    return NextResponse.json({ error: 'Sesión de consejero no válida o expirada' }, { status: 401 })
  }

  if (session.procesoId !== proceso_id) {
    return NextResponse.json({ error: 'La sesión no corresponde al proceso solicitado' }, { status: 403 })
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: 'items debe ser un array con al menos un elemento' },
      { status: 400 }
    )
  }

  for (const item of items) {
    if (!item.criterio_id || item.valor === undefined || item.valor === null) {
      return NextResponse.json(
        { error: 'Cada item debe tener criterio_id y valor' },
        { status: 400 }
      )
    }
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

    // 2. Validar proceso pertenece al conjunto y está en evaluación
    const { data: proceso } = await supabase
      .from('procesos')
      .select('conjunto_id, estado')
      .eq('id', proceso_id)
      .single()

    if (!proceso || proceso.conjunto_id !== consejero.conjunto_id || proceso.conjunto_id !== session.conjuntoId) {
      return NextResponse.json({ error: 'Proceso no pertenece al conjunto del consejero' }, { status: 403 })
    }

    if (proceso.estado !== 'evaluacion') {
      return NextResponse.json({ error: 'El proceso no está en etapa de evaluación' }, { status: 409 })
    }

    // 3. Validar propuesta pertenece al proceso y está en evaluación
    const { data: propuesta } = await supabase
      .from('propuestas')
      .select('proceso_id, estado')
      .eq('id', propuesta_id)
      .single()

    if (!propuesta || propuesta.proceso_id !== proceso_id || propuesta.estado !== 'en_evaluacion') {
      return NextResponse.json({ error: 'Propuesta no válida o no está en evaluación' }, { status: 403 })
    }

    // 4. Upsert en batch
    const registros = items.map((item) => ({
      proceso_id,
      consejero_id: session.consejeroId,
      propuesta_id,
      criterio_id: item.criterio_id,
      valor: item.valor,
      comentario: item.comentario ?? null,
    }))

    const { error: upsertError } = await supabase
      .from('evaluaciones')
      .upsert(registros, {
        onConflict: 'consejero_id,propuesta_id,criterio_id',
      })

    if (upsertError) {
      console.error('[evaluacion/guardar] upsert error:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // 5. Recalcular puntaje de la propuesta en segundo plano (no bloquea la respuesta)
    supabase
      .rpc('actualizar_puntaje_propuesta', { p_propuesta_id: propuesta_id })
      .then(({ error }) => {
        if (error) console.warn('[evaluacion/guardar] recálculo puntaje:', error.message)
      })

    // 6. Verificar si la evaluación está completa (todas las propuestas evaluadas)
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
    const evaluacionCompleta = propuestasEvaluadas.size >= (totalPropuestas ?? 0)

    return NextResponse.json({
      guardadas: registros.length,
      evaluacion_completa: evaluacionCompleta,
    })
  } catch (err) {
    console.error('[evaluacion/guardar] error:', err)
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
  }
}
