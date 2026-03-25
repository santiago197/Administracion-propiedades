import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError
  try {
    const { proceso_id, consejero_id, propuesta_id, criterio_id, valor } = await request.json()

    if (!proceso_id || !consejero_id || !propuesta_id || !criterio_id) {
      return NextResponse.json(
        { error: 'proceso_id, consejero_id, propuesta_id y criterio_id son requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const [{ data: proceso }, { data: consejero }, { data: propuesta }] = await Promise.all([
      supabase.from('procesos').select('conjunto_id').eq('id', proceso_id).single(),
      supabase.from('consejeros').select('conjunto_id').eq('id', consejero_id).single(),
      supabase.from('propuestas').select('proceso_id').eq('id', propuesta_id).single(),
    ])

    if (!proceso || proceso.conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Proceso no autorizado' }, { status: 403 })
    }
    if (!consejero || consejero.conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Consejero no pertenece al conjunto' }, { status: 403 })
    }
    if (!propuesta || propuesta.proceso_id !== proceso_id) {
      return NextResponse.json({ error: 'Propuesta no pertenece al proceso' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('evaluaciones')
      .upsert(
        {
          proceso_id,
          consejero_id,
          propuesta_id,
          criterio_id,
          valor,
        },
        {
          onConflict: 'proceso_id,consejero_id,propuesta_id,criterio_id',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('[v0] Upsert error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const procesoId = searchParams.get('proceso_id')
    const propuestaId = searchParams.get('propuesta_id')

    if (!procesoId) {
      return NextResponse.json({ error: 'proceso_id es requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: proceso, error: procError } = await supabase
      .from('procesos')
      .select('conjunto_id')
      .eq('id', procesoId)
      .single()

    if (procError || !proceso || proceso.conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Proceso no autorizado' }, { status: 403 })
    }

    let query = supabase.from('evaluaciones').select('*').eq('proceso_id', procesoId)

    if (propuestaId) {
      query = query.eq('propuesta_id', propuestaId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
  }
}
