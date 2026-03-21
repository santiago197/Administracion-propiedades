import { NextResponse, type NextRequest } from 'next/server'
import { createPropuesta, getPropuestas, contarPropuestasActivas } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized) return authError

  try {
    const { searchParams } = new URL(request.url)
    const proceso_id = searchParams.get('proceso_id')

    if (!proceso_id) {
      return NextResponse.json(
        { error: 'proceso_id es requerido' },
        { status: 400 }
      )
    }

    const { data, error } = await getPropuestas(proceso_id)
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching propuestas:', error)
    return NextResponse.json({ error: 'Error al obtener propuestas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized) return authError

  try {
    const body = await request.json()
    const { data, error } = await createPropuesta(body)
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating propuesta:', error)
    return NextResponse.json({ error: 'Error al crear propuesta' }, { status: 500 })
  }
}
