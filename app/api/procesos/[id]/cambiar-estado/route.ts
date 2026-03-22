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
      const { count: habilitadas } = await supabase
        .from('propuestas')
        .select('*', { count: 'exact', head: true })
        .eq('proceso_id', id)
        .eq('estado', 'habilitada')

      if (!habilitadas || habilitadas === 0) {
        return NextResponse.json(
          { error: 'Debe haber al menos una propuesta habilitada para iniciar la evaluación' },
          { status: 400 }
        )
      }

      // Mover todas las propuestas 'habilitada' → 'en_evaluacion' vía RPC
      const { data: propuestasHabilitadas } = await supabase
        .from('propuestas')
        .select('id')
        .eq('proceso_id', id)
        .eq('estado', 'habilitada')

      for (const propuesta of propuestasHabilitadas ?? []) {
        await supabase.rpc('cambiar_estado_propuesta', {
          p_propuesta_id: propuesta.id,
          p_estado_nuevo: 'en_evaluacion',
          p_usuario_id: user?.id ?? null,
          p_observacion: 'Proceso iniciado en etapa de evaluación',
          p_metadata: { origen: 'cambiar_estado_proceso', proceso_id: id },
        })
      }
    }

    if (estadoNuevo === 'votacion') {
      const { count: enEvaluacion } = await supabase
        .from('propuestas')
        .select('*', { count: 'exact', head: true })
        .eq('proceso_id', id)
        .eq('estado', 'en_evaluacion')

      if (!enEvaluacion || enEvaluacion === 0) {
        return NextResponse.json(
          { error: 'No hay propuestas en evaluación para pasar a votación' },
          { status: 400 }
        )
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
