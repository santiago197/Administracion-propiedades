import { NextResponse, type NextRequest } from 'next/server'
import { getProcesoConjunto, updateProceso } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createClient } from '@/lib/supabase/server'
import type { EstadoProceso } from '@/lib/types'

type Transicion = {
  desde: EstadoProceso
  hacia: EstadoProceso
}

const TRANSICIONES_VALIDAS: Transicion[] = [
  { desde: 'configuracion', hacia: 'evaluacion' },
  { desde: 'evaluacion', hacia: 'votacion' },
  { desde: 'votacion', hacia: 'finalizado' },
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response: authError, conjuntoId, user } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  let body: { estado: EstadoProceso }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const { estado: estadoNuevo } = body

  if (!estadoNuevo) {
    return NextResponse.json({ error: 'El campo estado es requerido' }, { status: 400 })
  }

  try {
    const { data: proceso, error: fetchError } = await getProcesoConjunto(id, conjuntoId!)

    if (fetchError || !proceso) {
      return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
    }

    const transicionValida = TRANSICIONES_VALIDAS.some(
      (t) => t.desde === proceso.estado && t.hacia === estadoNuevo
    )

    if (!transicionValida) {
      return NextResponse.json(
        {
          error: `Transición no permitida: ${proceso.estado} → ${estadoNuevo}`,
        },
        { status: 422 }
      )
    }

    const supabase = await createClient()

    // Validaciones previas según el estado destino
    if (estadoNuevo === 'evaluacion') {
      // Contar propuestas habilitadas O en_evaluacion (igual que stats)
      // Esto es importante porque si el usuario ya intentó iniciar evaluación,
      // algunas podrían estar en 'en_evaluacion' en lugar de 'habilitada'
      const { count: activas, error: countError } = await supabase
        .from('propuestas')
        .select('*', { count: 'exact', head: true })
        .eq('proceso_id', id)
        .or('estado.eq.habilitada,estado.eq.en_evaluacion')

      console.log('[cambiar-estado] Debug - propuestas activas query:', { activas, countError, proceso_id: id })

      if (countError) {
        throw new Error(`Error al contar propuestas activas: ${countError.message}`)
      }

      if (!activas || activas === 0) {
        // Debug: obtener todas las propuestas para ver qué hay
        const { data: todasPropuestas, error: debugError } = await supabase
          .from('propuestas')
          .select('id, estado, razon_social')
          .eq('proceso_id', id)
        
        console.log('[cambiar-estado] Debug - todas las propuestas:', { todasPropuestas, debugError })
        
        return NextResponse.json(
          { 
            error: 'Debe haber al menos una propuesta habilitada o en evaluación para iniciar la evaluación',
            debug: { propuestas: todasPropuestas?.map(p => ({ id: p.id, estado: p.estado, razon_social: p.razon_social })) }
          }, 
          { status: 400 }
        )
      }

      // Mover todas las propuestas 'habilitada' → 'en_evaluacion' vía RPC
      // (Las que ya estén en 'en_evaluacion' se ignorarán porque ya están donde deben estar)
      const { data: propuestasHabilitadas, error: fetchPropError } = await supabase
        .from('propuestas')
        .select('id')
        .eq('proceso_id', id)
        .eq('estado', 'habilitada')

      if (fetchPropError) {
        throw new Error(`No se pudo obtener propuestas habilitadas: ${fetchPropError.message}`)
      }

      const rpcErrors: string[] = []
      for (const propuesta of propuestasHabilitadas ?? []) {
        const { error: rpcError } = await supabase.rpc('cambiar_estado_propuesta', {
          p_propuesta_id: propuesta.id,
          p_estado_nuevo: 'en_evaluacion',
          p_usuario_id: user?.id ?? null,
          p_observacion: 'Proceso iniciado en etapa de evaluación',
          p_metadata: { origen: 'cambiar_estado_proceso', proceso_id: id },
        })
        if (rpcError) {
          rpcErrors.push(`Propuesta ${propuesta.id}: ${rpcError.message}`)
        }
      }

      if (rpcErrors.length > 0) {
        throw new Error(`Error al cambiar estado de propuestas: ${rpcErrors.join(' | ')}`)
      }
    }

    if (estadoNuevo === 'votacion') {
      const estadosEvaluacion = ['en_evaluacion', 'apto', 'condicionado', 'destacado', 'no_apto']
      const { data: enEvaluacion, count, error: queryError } = await supabase
        .from('propuestas')
        .select('id, clasificacion, estado', { count: 'exact' })
        .eq('proceso_id', id)
        .in('estado', estadosEvaluacion)

      console.log('[cambiar-estado] Debug - votacion query:', { count, estadosEvaluacion, enEvaluacion, queryError, proceso_id: id })

      if (queryError) {
        throw new Error(`Error al obtener propuestas para votación: ${queryError.message}`)
      }

      if (!count || count === 0) {
        // Debug: obtener todas las propuestas para ver qué estados tienen
        const { data: todasPropuestas } = await supabase
          .from('propuestas')
          .select('id, estado, clasificacion, razon_social')
          .eq('proceso_id', id)
        
        console.log('[cambiar-estado] Debug - todas las propuestas:', todasPropuestas)
        
        return NextResponse.json(
          { 
            error: 'No hay propuestas evaluadas para pasar a votación',
            debug: {
              estadosBuscados: estadosEvaluacion,
              propuestas: todasPropuestas?.map(p => ({ estado: p.estado, clasificacion: p.clasificacion, razon_social: p.razon_social }))
            }
          },
          { status: 400 }
        )
      }

      const sinEvaluar = (enEvaluacion ?? []).filter(
        (p) => p.estado === 'en_evaluacion' && !p.clasificacion
      )
      if (sinEvaluar.length > 0) {
        return NextResponse.json(
          { error: `Hay ${sinEvaluar.length} propuesta(s) sin evaluar. Evalúa todas antes de continuar.` },
          { status: 400 }
        )
      }

      // Mover propuestas aún en evaluación a su clasificación final
      for (const propuesta of enEvaluacion ?? []) {
        if (propuesta.estado !== 'en_evaluacion') continue
        const estadoPropuesta = propuesta.clasificacion as string
        await supabase.rpc('cambiar_estado_propuesta', {
          p_propuesta_id: propuesta.id,
          p_estado_nuevo: estadoPropuesta,
          p_usuario_id: user?.id ?? null,
          p_observacion: 'Evaluación finalizada — proceso pasa a votación',
          p_metadata: { origen: 'cambiar_estado_proceso', proceso_id: id },
        })
      }
    }

    const { data, error: updateError } = await updateProceso(id, { estado: estadoNuevo })
    if (updateError) throw updateError

    return NextResponse.json({ success: true, proceso: data })
  } catch (err) {
    console.error('[procesos/id/cambiar-estado] error:', err)
    return NextResponse.json({ error: 'Error al cambiar estado del proceso' }, { status: 500 })
  }
}
