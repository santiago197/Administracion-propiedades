import { NextResponse, type NextRequest } from 'next/server'
import { procesarValidacionLegal, getPropuestaConjunto } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { propuesta_id, cumple, observaciones } = await request.json()

    if (!propuesta_id) {
      return NextResponse.json({ error: 'propuesta_id es requerido' }, { status: 400 })
    }

    const { data: pertenece, error: accesoError } = await getPropuestaConjunto(propuesta_id, conjuntoId!)
    if (accesoError || !pertenece) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
    }

    const { success, estado } = await procesarValidacionLegal(propuesta_id, cumple, observaciones)

    return NextResponse.json({ success, estado }, { status: 200 })
  } catch (error) {
    console.error('[v0] Error processing legal validation:', error)
    return NextResponse.json({ error: 'Error al procesar validación' }, { status: 500 })
  }
}
