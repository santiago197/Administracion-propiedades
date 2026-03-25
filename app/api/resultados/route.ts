import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const procesoId = searchParams.get('proceso_id')
    const type = searchParams.get('type')

    if (!procesoId) {
      return NextResponse.json(
        { error: 'proceso_id es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    if (type === 'stats') {
      return await getStats(supabase, procesoId)
    }

    // Obtener propuestas del proceso
    const { data: propuestas, error: propError } = await supabase
      .from('propuestas')
      .select('id, razon_social, estado')
      .eq('proceso_id', procesoId)
      .eq('estado', 'activa')

    if (propError) {
      return NextResponse.json(
        { error: propError.message },
        { status: 400 }
      )
    }

    // Obtener criterios del proceso
    const { data: criterios, error: critError } = await supabase
      .from('criterios')
      .select('id, peso')
      .eq('proceso_id', procesoId)

    if (critError) {
      return NextResponse.json(
        { error: critError.message },
        { status: 400 }
      )
    }

    // Calcular resultados para cada propuesta
    const resultados = await Promise.all(
      propuestas!.map(async (propuesta) => {
        const [evalRes, votosRes] = await Promise.all([
          supabase
            .from('evaluaciones')
            .select('criterio_id, valor')
            .eq('proceso_id', procesoId)
            .eq('propuesta_id', propuesta.id),
          supabase
            .from('votos')
            .select('id')
            .eq('proceso_id', procesoId)
            .eq('propuesta_id', propuesta.id),
        ])

        const evaluaciones = evalRes.data || []
        const votos = votosRes.data || []

        // Calcular puntaje ponderado de evaluaciones
        let puntajeEvaluacion = 0
        if (evaluaciones.length > 0 && criterios && criterios.length > 0) {
          const sumaPesos = criterios.reduce((sum, c) => sum + (c.peso || 0), 0)
          const sumaEvaluaciones = criterios.reduce((sum, criterio) => {
            const evalCriterio = evaluaciones.filter(
              (e: any) => e.criterio_id === criterio.id
            )
            if (evalCriterio.length > 0) {
              const promedio =
                evalCriterio.reduce((s, e: any) => s + (e.valor || 0), 0) /
                evalCriterio.length
              return sum + (promedio * (criterio.peso || 0)) / 100
            }
            return sum
          }, 0)
          puntajeEvaluacion = sumaPesos > 0 ? sumaEvaluaciones : 0
        }

        // Obtener total de consejeros
        const { data: consejeros } = await supabase
          .from('consejeros')
          .select('id')
          .eq('conjunto_id', (await supabase
            .from('procesos')
            .select('conjunto_id')
            .eq('id', procesoId)
            .single()).data?.conjunto_id)

        const totalConsejeros = consejeros?.length || 1
        const porcentajeVotos =
          totalConsejeros > 0 ? (votos.length / totalConsejeros) * 5 : 0

        const puntajeNormalizado =
          puntajeEvaluacion * 0.7 + porcentajeVotos * 0.3

        return {
          propuesta_id: propuesta.id,
          razon_social: propuesta.razon_social,
          puntaje_evaluacion: puntajeEvaluacion,
          votos_recibidos: votos.length,
          puntaje_final: Math.min(5, puntajeNormalizado),
          estado_semaforo:
            puntajeNormalizado >= 4 ? 'verde' : puntajeNormalizado >= 3 ? 'amarillo' : 'rojo',
        }
      })
    )

    // Ordenar por puntaje final descendente
    resultados.sort((a, b) => b.puntaje_final - a.puntaje_final)

    // Añadir posición
    const resultadosConPosicion = resultados.map((resultado, index) => ({
      ...resultado,
      posicion: index + 1,
    }))

    return NextResponse.json(resultadosConPosicion)
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
  }
}

async function getStats(supabase: any, procesoId: string) {
  try {
    const [consRes, evalRes, votRes, propRes] = await Promise.all([
      supabase
        .from('consejeros')
        .select('id')
        .eq('conjunto_id',
          (
            await supabase
              .from('procesos')
              .select('conjunto_id')
              .eq('id', procesoId)
              .single()
          ).data?.conjunto_id
        ),
      supabase
        .from('evaluaciones')
        .select('id', { head: true, count: 'exact' })
        .eq('proceso_id', procesoId),
      supabase
        .from('votos')
        .select('id', { head: true, count: 'exact' })
        .eq('proceso_id', procesoId),
      supabase
        .from('propuestas')
        .select('id', { head: true, count: 'exact' })
        .eq('proceso_id', procesoId)
        .eq('estado', 'activa'),
    ])

    return NextResponse.json({
      total_consejeros: consRes.data?.length || 0,
      evaluaciones_completadas: evalRes.count || 0,
      votaciones_completadas: votRes.count || 0,
      propuestas_activas: propRes.count || 0,
    })
  } catch (error) {
    console.error('[v0] Stats error:', error)
    return NextResponse.json({ error: 'Error obteniendo estadísticas' }, { status: 500 })
  }
}
