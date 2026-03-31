import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const { data: proceso, error } = await supabase
      .from('procesos')
      .select('id, nombre, estado, fecha_inicio, fecha_fin, conjunto:conjuntos(nombre)')
      .eq('id', id)
      .single()

    if (error || !proceso) {
      return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
    }

    const { count: total_candidatos } = await supabase
      .from('propuestas')
      .select('*', { count: 'exact', head: true })
      .eq('proceso_id', id)

    return NextResponse.json({
      conjunto: proceso.conjunto?.nombre ?? 'Conjunto',
      nombre: proceso.nombre,
      estado: proceso.estado,
      fecha_inicio: proceso.fecha_inicio,
      fecha_estimado_fin: proceso.fecha_fin ?? proceso.fecha_inicio,
      total_candidatos: total_candidatos ?? 0,
      evaluaciones_completadas: 0,
      votacion_completada: 0,
      comunicados: [],
    })
  } catch (err) {
    console.error('[procesos/publico] GET error:', err)
    return NextResponse.json({ error: 'Error al obtener proceso' }, { status: 500 })
  }
}
