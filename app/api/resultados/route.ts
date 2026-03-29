import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getResultadosFinales, getProcesoConjunto, getMatrizEvaluacionAdmin } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const procesoId = searchParams.get('proceso_id')
    const type = searchParams.get('type')

    if (!procesoId) {
      return NextResponse.json({ error: 'proceso_id es requerido' }, { status: 400 })
    }

    const { data: proceso, error: procError } = await getProcesoConjunto(procesoId, conjuntoId!)
    if (procError || !proceso) {
      return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
    }

    if (type === 'stats') {
      const supabase = await createClient()
      return await getStats(supabase, procesoId)
    }

    if (type === 'matriz') {
      const matriz = await getMatrizEvaluacionAdmin(procesoId)
      return NextResponse.json(matriz)
    }

    const resultados = await getResultadosFinales(procesoId)
    return NextResponse.json(resultados)
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
