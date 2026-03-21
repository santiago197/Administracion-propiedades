import { NextResponse } from 'next/server'
import { createCriterio, getCriterios } from '@/lib/supabase/queries'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const proceso_id = searchParams.get('proceso_id')

    if (!proceso_id) {
      return NextResponse.json(
        { error: 'proceso_id es requerido' },
        { status: 400 }
      )
    }

    const { data, error } = await getCriterios(proceso_id)
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching criterios:', error)
    return NextResponse.json({ error: 'Error al obtener criterios' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { data, error } = await createCriterio(body)
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating criterio:', error)
    return NextResponse.json({ error: 'Error al crear criterio' }, { status: 500 })
  }
}
