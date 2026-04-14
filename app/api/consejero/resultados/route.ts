import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConsejeroSessionFromRequest } from '@/lib/consejero-session'

/**
 * GET /api/consejero/resultados
 *
 * Retorna el ranking del proceso para el consejero autenticado.
 * - Propuestas ordenadas por puntaje_final
 * - propuesta_votada_id: a quién votó este consejero
 * - Conteo de votos por propuesta
 * - Participación: cuántos consejeros han votado vs total activos
 */
export async function GET(request: NextRequest) {
  const session = getConsejeroSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesión no válida o expirada' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // 1. Validar consejero
    const { data: consejero } = await supabase
      .from('consejeros')
      .select('id, conjunto_id, nombre_completo')
      .eq('id', session.consejeroId)
      .eq('activo', true)
      .single()

    if (!consejero) {
      return NextResponse.json({ error: 'Consejero no válido o inactivo' }, { status: 403 })
    }

    // 2. Obtener proceso (sesión o buscar activo/finalizado del conjunto)
    let procesoId: string | null = session.procesoId ?? null

    if (!procesoId) {
      const { data } = await supabase
        .from('procesos')
        .select('id')
        .eq('conjunto_id', consejero.conjunto_id)
        .in('estado', ['evaluacion', 'votacion', 'finalizado'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      procesoId = data?.id ?? null
    }

    if (!procesoId) {
      return NextResponse.json({ error: 'No hay proceso activo o finalizado' }, { status: 404 })
    }

    // 3. Cargar todo en paralelo
    const [
      { data: propuestas },
      { data: votoConsejero },
      { data: todosVotos },
      { count: totalConsejeroCount },
    ] = await Promise.all([
      supabase
        .from('propuestas')
        .select('id, razon_social, tipo_persona, nit_cedula, anios_experiencia, unidades_administradas, valor_honorarios, estado, puntaje_evaluacion, votos_recibidos, puntaje_final, clasificacion')
        .eq('proceso_id', procesoId)
        .in('estado', ['en_evaluacion', 'apto', 'condicionado', 'destacado', 'no_apto', 'entrevistado', 'preseleccionado', 'adjudicado'])
        .order('puntaje_final', { ascending: false, nullsFirst: false }),

      supabase
        .from('votos')
        .select('propuesta_id, created_at')
        .eq('proceso_id', procesoId)
        .eq('consejero_id', session.consejeroId)
        .maybeSingle(),

      supabase
        .from('votos')
        .select('propuesta_id')
        .eq('proceso_id', procesoId),

      supabase
        .from('consejeros')
        .select('*', { count: 'exact', head: true })
        .eq('conjunto_id', consejero.conjunto_id)
        .eq('activo', true),
    ])

    // Conteo de votos por propuesta
    const votosPorPropuesta: Record<string, number> = {}
    for (const v of todosVotos ?? []) {
      votosPorPropuesta[v.propuesta_id] = (votosPorPropuesta[v.propuesta_id] ?? 0) + 1
    }

    const ranking = (propuestas ?? []).map((p, idx) => ({
      posicion: idx + 1,
      propuesta_id: p.id,
      razon_social: p.razon_social,
      tipo_persona: p.tipo_persona,
      anios_experiencia: p.anios_experiencia,
      unidades_administradas: p.unidades_administradas,
      valor_honorarios: p.valor_honorarios,
      estado: p.estado,
      puntaje_evaluacion: Number(p.puntaje_evaluacion ?? 0),
      votos_recibidos: Number(p.votos_recibidos ?? 0),
      puntaje_final: Number(p.puntaje_final ?? 0),
      clasificacion: p.clasificacion ?? null,
      votos_contados: votosPorPropuesta[p.id] ?? 0,
    }))

    const totalVotos = (todosVotos ?? []).length
    const total = totalConsejeroCount ?? 0

    return NextResponse.json({
      ranking,
      propuesta_votada_id: votoConsejero?.propuesta_id ?? null,
      voto_fecha: votoConsejero?.created_at ?? null,
      participacion: {
        votos_emitidos: totalVotos,
        total_consejeros: total,
        porcentaje: total > 0 ? Math.round((totalVotos / total) * 100) : 0,
      },
    })
  } catch (err) {
    console.error('[consejero/resultados] error:', err)
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
  }
}
