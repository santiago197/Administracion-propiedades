import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized) return authError
  try {
    const { proceso_id, consejero_id, propuesta_id } = await request.json()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('votos')
      .insert({
        proceso_id,
        consejero_id,
        propuesta_id,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Insert error:', error)
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

    if (!procesoId) {
      return NextResponse.json(
        { error: 'proceso_id es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('votos')
      .select('*')
      .eq('proceso_id', procesoId)

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
