import { NextResponse, type NextRequest } from 'next/server'
import { createConjunto, getConjuntos } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { data, error } = await getConjuntos()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching conjuntos:', error)
    return NextResponse.json({ error: 'Error al obtener conjuntos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()
    const { data, error } = await createConjunto(body)
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating conjunto:', error)
    return NextResponse.json({ error: 'Error al crear conjunto' }, { status: 500 })
  }
}
