import { NextResponse, type NextRequest } from 'next/server'
import { createCriterio, getCriterios, getPesoTotalCriterios } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const soloActivos = searchParams.get('activos') === 'true'

    const criterios = await getCriterios(soloActivos)
    const pesoTotal = await getPesoTotalCriterios()

    return NextResponse.json({ criterios, pesoTotal })
  } catch (error) {
    console.error('[API] Error fetching criterios:', error)
    return NextResponse.json({ error: 'Error al obtener criterios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()

    // Validar campos requeridos
    if (!body.nombre) {
      return NextResponse.json(
        { error: 'nombre es requerido' },
        { status: 400 }
      )
    }

    const criterio = await createCriterio({
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      tipo: body.tipo ?? 'escala',
      activo: body.activo ?? true,
      orden: body.orden ?? 0,
    })

    return NextResponse.json(criterio, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating criterio:', error)
    const message = error instanceof Error ? error.message : 'Error al crear criterio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
