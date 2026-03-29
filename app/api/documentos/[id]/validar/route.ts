import { NextResponse, type NextRequest } from 'next/server'
import { validarDocumento } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validar autenticación
  const { authorized, response: authError, user } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { id } = await params
    const { estado, observaciones } = await request.json()

    if (!estado) {
      return NextResponse.json({ error: 'estado es requerido' }, { status: 400 })
    }

    const data = await validarDocumento(id, estado, observaciones, user.id)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error validating documento:', error)
    return NextResponse.json({ error: 'Error al validar documento' }, { status: 500 })
  }
}
