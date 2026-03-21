import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized) return authError
  try {
    const { proceso_id, consejero_id, propuesta_id, criterio_id, valor } =
      await request.json()

    const supabase = await createClient()

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
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized) return authError

  try {
    const { searchParams } = new URL(request.url)
    const procesoId = searchParams.get('proceso_id')
    const propuestaId = searchParams.get('propuesta_id')

    const supabase = await createClient()

    let query = supabase
      .from('evaluaciones')
      .select('*')

    if (procesoId) {
      query = query.eq('proceso_id', procesoId)
    }

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
