import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearConsejeroSessionCookie, getConsejeroSessionFromRequest } from '@/lib/consejero-session'

export async function GET(request: NextRequest) {
  const session = getConsejeroSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesión de consejero no válida o expirada' }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    const [{ data: consejero, error: consejeroError }, { data: proceso, error: procesoError }] = await Promise.all([
      supabase
        .from('consejeros')
        .select('id, conjunto_id, nombre_completo, cargo, torre, apartamento, email, telefono, activo')
        .eq('id', session.consejeroId)
        .eq('activo', true)
        .single(),
      session.procesoId
        ? supabase
            .from('procesos')
            .select('id, conjunto_id, nombre, estado')
            .eq('id', session.procesoId)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (consejeroError || !consejero) {
      const response = NextResponse.json({ error: 'Consejero no encontrado o inactivo' }, { status: 403 })
      clearConsejeroSessionCookie(response)
      return response
    }

    if (procesoError || (proceso && (proceso.conjunto_id !== consejero.conjunto_id || proceso.conjunto_id !== session.conjuntoId))) {
      const response = NextResponse.json({ error: 'Proceso no disponible para el consejero' }, { status: 403 })
      clearConsejeroSessionCookie(response)
      return response
    }

    if (!proceso) {
      return NextResponse.json({
        consejero,
        proceso: null,
        progreso: {
          propuestas_requeridas: 0,
          propuestas_evaluadas: 0,
          evaluacion_completa: false,
          ya_voto: false,
          fecha_voto: null,
        },
        mensaje: 'No hay un proceso de evaluación activo para este conjunto en este momento.',
      })
    }

    const [{ count: propuestasPendientes }, { data: evaluaciones }, { data: voto }] = await Promise.all([
      supabase
        .from('propuestas')
        .select('*', { count: 'exact', head: true })
        .eq('proceso_id', proceso.id)
        .eq('estado', 'en_evaluacion'),
      supabase
        .from('evaluaciones')
        .select('propuesta_id')
        .eq('proceso_id', proceso.id)
        .eq('consejero_id', consejero.id),
      supabase
        .from('votos')
        .select('id, created_at')
        .eq('proceso_id', proceso.id)
        .eq('consejero_id', consejero.id)
        .maybeSingle(),
    ])

    const propuestasEvaluadas = evaluaciones ? new Set(evaluaciones.map((row) => row.propuesta_id)).size : 0

    return NextResponse.json({
      consejero,
      proceso,
      progreso: {
        propuestas_requeridas: propuestasPendientes ?? 0,
        propuestas_evaluadas: propuestasEvaluadas,
        evaluacion_completa: propuestasEvaluadas >= (propuestasPendientes ?? 0),
        ya_voto: Boolean(voto),
        fecha_voto: voto?.created_at ?? null,
      },
    })
  } catch (error) {
    console.error('[consejero/perfil] error:', error)
    return NextResponse.json({ error: 'Error al consultar perfil de consejero' }, { status: 500 })
  }
}
