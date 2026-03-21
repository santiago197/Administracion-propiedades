import { NextResponse, type NextRequest } from 'next/server'
import { createProceso, getProcesos } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const conjunto_id = searchParams.get('conjunto_id')

    if (!conjunto_id) {
      return NextResponse.json(
        { error: 'conjunto_id es requerido' },
        { status: 400 }
      )
    }

    const { data, error } = await getProcesos(conjunto_id)
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching procesos:', error)
    return NextResponse.json({ error: 'Error al obtener procesos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()
    const { data, error } = await createProceso(body)
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating proceso:', error)
    return NextResponse.json({ error: 'Error al crear proceso' }, { status: 500 })
  }
}
