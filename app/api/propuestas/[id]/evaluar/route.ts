import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createServerClient } from '@supabase/ssr'

async function getSupabaseClient() {
  const cookieStore = await (await import('next/headers')).cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from('evaluaciones_admin')
    .select('id, puntaje_total, clasificacion, puntajes_criterio(criterio_codigo, puntaje)')
    .eq('propuesta_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Error al obtener evaluación' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json(null)
  }

  const detalles: Record<string, number> = {}
  for (const p of data.puntajes_criterio ?? []) {
    detalles[p.criterio_codigo] = p.puntaje
  }

  return NextResponse.json({
    puntaje_total: data.puntaje_total,
    clasificacion: data.clasificacion,
    detalles,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validar autenticación
  const { authorized, response: authError, user } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { id } = await params

    // Parseo seguro del body
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la solicitud inválido' },
        { status: 400 }
      )
    }

    const { puntaje_total, clasificacion, detalles } = body ?? {}

    if (typeof puntaje_total !== 'number' || !clasificacion) {
      return NextResponse.json(
        { error: 'Datos de evaluación incompletos' },
        { status: 400 }
      )
    }

    if (!detalles || typeof detalles !== 'object') {
      return NextResponse.json(
        { error: 'Detalles de evaluación inválidos' },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseClient()

    // 1. Buscar evaluación existente para este evaluador y propuesta
    const { data: evalExistente } = await supabase
      .from('evaluaciones_admin')
      .select('id')
      .eq('propuesta_id', id)
      .eq('evaluador_id', user.id)
      .maybeSingle()

    let evalId: string

    if (evalExistente) {
      // Actualizar evaluación existente
      const { error: updateError } = await supabase
        .from('evaluaciones_admin')
        .update({ puntaje_total, clasificacion })
        .eq('id', evalExistente.id)

      if (updateError) throw updateError

      // Eliminar puntajes anteriores
      const { error: deleteError } = await supabase
        .from('puntajes_criterio')
        .delete()
        .eq('evaluacion_id', evalExistente.id)

      if (deleteError) throw deleteError

      evalId = evalExistente.id
    } else {
      // Crear nueva evaluación
      const { data: evalAdmin, error: evalError } = await supabase
        .from('evaluaciones_admin')
        .insert({ propuesta_id: id, evaluador_id: user.id, puntaje_total, clasificacion })
        .select('id')
        .single()

      if (evalError) throw evalError
      evalId = evalAdmin.id
    }

    // 2. Insertar puntajes por criterio
    const puntajesParaInsertar = Object.entries(detalles).map(([key, value]) => ({
      evaluacion_id: evalId,
      criterio_codigo: key,
      puntaje:
        typeof value === 'number'
          ? value
          : Array.isArray(value)
            ? value.length
            : 0,
      valor_original: JSON.stringify(value),
    }))

    const { error: puntajesError } = await supabase
      .from('puntajes_criterio')
      .insert(puntajesParaInsertar)

    if (puntajesError) throw puntajesError

    // 3. Actualizar la propuesta con el nuevo puntaje y clasificación
    //    Si falla por RLS u otra razón, no bloqueamos el guardado de la evaluación.
    const { error: propError } = await supabase
      .from('propuestas')
      .update({
        puntaje_evaluacion: puntaje_total,
        clasificacion: clasificacion,
      })
      .eq('id', id)

    if (propError) {
      console.warn('[v0] Error updating propuesta after evaluación_admin:', propError)
    }

    // 3.1 Resolver estado actual y aplicar transiciones por máquina de estados
    const { data: propuestaActual, error: propuestaError } = await supabase
      .from('propuestas')
      .select('estado')
      .eq('id', id)
      .single()

    if (propuestaError) {
      console.warn('[evaluar] Error fetching propuesta estado:', propuestaError)
    } else {
      let estadoBase = propuestaActual?.estado ?? null
      if (estadoBase === 'habilitada') {
        const { error: estadoError } = await supabase.rpc('cambiar_estado_propuesta', {
          p_propuesta_id: id,
          p_estado_nuevo: 'en_evaluacion',
          p_usuario_id: user.id,
          p_observacion: 'Evaluación administrativa registrada',
          p_metadata: { origen: 'evaluacion_admin' },
        })
        if (estadoError) {
          console.warn('[evaluar] Error updating estado propuesta:', estadoError)
        } else {
          estadoBase = 'en_evaluacion'
        }
      }

      if (estadoBase === 'en_evaluacion') {
        const { error: clasificacionError } = await supabase.rpc('cambiar_estado_propuesta', {
          p_propuesta_id: id,
          p_estado_nuevo: clasificacion,
          p_usuario_id: user.id,
          p_observacion: 'Evaluación administrativa guardada',
          p_metadata: { origen: 'evaluacion_admin', puntaje_total },
        })
        if (clasificacionError) {
          console.warn('[evaluar] Error updating estado final:', clasificacionError)
        }
      }
    }

    // 4. Auditoría (best-effort)
    const { error: auditError } = await supabase.from('audit_log').insert({
      accion: 'EVALUACION_ADMIN',
      entidad: 'propuestas',
      entidad_id: id,
      datos_nuevos: { puntaje_total, clasificacion },
    })

    if (auditError) {
      console.warn('[v0] Error inserting audit_log for evaluación_admin:', auditError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[evaluar] Error saving evaluation:', msg)
    return NextResponse.json({ error: 'Error al guardar la evaluación', detail: msg }, { status: 500 })
  }
}
