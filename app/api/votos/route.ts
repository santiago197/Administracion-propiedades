import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { verificarEvaluacionCompleta } from '@/lib/supabase/queries'

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError
  try {
    const { proceso_id, consejero_id, propuesta_id } = await request.json()

    if (!proceso_id || !consejero_id || !propuesta_id) {
      return NextResponse.json(
        { error: 'proceso_id, consejero_id y propuesta_id son requeridos' },
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

    const { data: votoExistente } = await supabase
      .from('votos')
      .select('id')
      .eq('proceso_id', proceso_id)
      .eq('consejero_id', consejero_id)
      .maybeSingle()

    if (votoExistente) {
      return NextResponse.json({ error: 'El consejero ya registró un voto' }, { status: 409 })
    }

    const evaluacionCompleta = await verificarEvaluacionCompleta(consejero_id, proceso_id)
    if (!evaluacionCompleta) {
      return NextResponse.json(
        { error: 'El consejero debe evaluar todas las propuestas antes de votar' },
        { status: 400 }
      )
    }

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
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

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

    const { data: proceso, error: procError } = await supabase
      .from('procesos')
      .select('conjunto_id')
      .eq('id', procesoId)
      .single()

    if (procError || !proceso || proceso.conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Proceso no autorizado' }, { status: 403 })
    }

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
