import { NextResponse } from 'next/server'
import { createConjunto, getConjuntos } from '@/lib/supabase/queries'

export async function GET() {
  try {
    const { data, error } = await getConjuntos()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error fetching conjuntos:', error)
    return NextResponse.json({ error: 'Error al obtener conjuntos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
