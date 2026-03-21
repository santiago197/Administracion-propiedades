import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { codigo_acceso } = await request.json()

    if (!codigo_acceso) {
      return NextResponse.json(
        { error: 'Código de acceso requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: consejero, error } = await supabase
      .from('consejeros')
      .select('id, conjunto_id')
      .eq('codigo_acceso', codigo_acceso.toUpperCase())
      .eq('activo', true)
      .single()

    if (error || !consejero) {
      return NextResponse.json(
        { error: 'Código de acceso inválido' },
        { status: 401 }
      )
    }

    // Obtener el proceso activo del conjunto
    const { data: proceso, error: procError } = await supabase
      .from('procesos')
      .select('id')
      .eq('conjunto_id', consejero.conjunto_id)
      .eq('estado', 'evaluacion')
      .single()

    if (procError || !proceso) {
      return NextResponse.json(
        { error: 'No hay un proceso de evaluación activo' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      consejero_id: consejero.id,
      proceso_id: proceso.id,
    })
  } catch (error) {
    console.error('[v0] Validation error:', error)
    return NextResponse.json({ error: 'Error en la validación' }, { status: 500 })
  }
}
