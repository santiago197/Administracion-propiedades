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
    if (!body.codigo || !body.nombre || body.peso === undefined) {
      return NextResponse.json(
        { error: 'codigo, nombre y peso son requeridos' },
        { status: 400 }
      )
    }

    // Validar peso
    if (body.peso < 0 || body.peso > 100) {
      return NextResponse.json(
        { error: 'El peso debe estar entre 0 y 100' },
        { status: 400 }
      )
    }

    const criterio = await createCriterio({
      codigo: body.codigo,
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      peso: body.peso,
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
