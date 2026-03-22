import { NextResponse, type NextRequest } from 'next/server'
import { createConjunto, getConjuntos } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { data, error } = await getConjuntos()

  if (error) {
    console.error('[conjuntos] GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener conjuntos', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const { data, error } = await createConjunto(body as Parameters<typeof createConjunto>[0])

  if (error) {
    console.error('[conjuntos] POST error:', error)
    return NextResponse.json(
      { error: 'Error al crear conjunto', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}
