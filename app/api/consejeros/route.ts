import { NextResponse, type NextRequest } from 'next/server'
import { createConsejero, getConsejeros } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
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

    if (conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Acceso denegado al conjunto' }, { status: 403 })
    }

    const { data, error } = await getConsejeros(conjunto_id)
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching consejeros:', error)
    return NextResponse.json({ error: 'Error al obtener consejeros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()
    const required = ['nombre_completo', 'cargo', 'apartamento']
    const missing = required.filter((key) => !body?.[key])
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Faltan campos requeridos: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const codigo = Math.random().toString(36).slice(-6).toUpperCase()

    const { data, error } = await createConsejero({
      conjunto_id: conjuntoId!,
      nombre_completo: String(body.nombre_completo),
      cargo: body.cargo,
      torre: body.torre ?? null,
      apartamento: String(body.apartamento),
      email: body.email ?? null,
      telefono: body.telefono ?? null,
      codigo_acceso: codigo,
      activo: body.activo ?? true,
    })
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating consejero:', error)
    return NextResponse.json({ error: 'Error al crear consejero' }, { status: 500 })
  }
}
