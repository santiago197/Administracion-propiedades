import { NextResponse, type NextRequest } from 'next/server'
import { getTiposDocumento, createTipoDocumento } from '@/lib/supabase/queries'
import { getCurrentUser } from '@/lib/supabase/auth-utils'

export async function GET(request: NextRequest) {
  const { user, error } = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: error ?? 'No autorizado' }, { status: 401 })

  try {
    const { data, error: dbError } = await getTiposDocumento()
    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err) {
    console.error('[tipos-documento] GET error:', err)
    return NextResponse.json({ error: 'Error al obtener tipos de documento' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: error ?? 'No autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const { nombre, codigo, categoria, es_obligatorio, tipo_persona, dias_vigencia, activo } = body

    if (!nombre || !codigo || !categoria || !tipo_persona) {
      return NextResponse.json({ error: 'Faltan campos requeridos: nombre, codigo, categoria, tipo_persona' }, { status: 400 })
    }

    const { data, error: dbError } = await createTipoDocumento({
      nombre,
      codigo,
      categoria,
      es_obligatorio: es_obligatorio ?? true,
      tipo_persona,
      dias_vigencia: dias_vigencia ?? 365,
      activo: activo ?? true,
    })

    if (dbError) {
      console.error('[tipos-documento] POST db error:', dbError)
      return NextResponse.json(
        { error: 'Error al crear tipo de documento', detail: dbError.message },
        { status: 500 }
      )
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[tipos-documento] POST error:', err)
    return NextResponse.json({ error: 'Error al crear tipo de documento', detail: message }, { status: 500 })
  }
}
