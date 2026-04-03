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
      .select('id, nombre, estado, fecha_inicio, fecha_fin, es_publica, conjunto:conjuntos(nombre)')
      .eq('id', id)
      .single()

    if (error || !proceso) {
      return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
    }

    if (!proceso.es_publica) {
      return NextResponse.json({ error: 'Este proceso no es públicamente visible' }, { status: 403 })
    }

    // Candidatos activos (excluye retirados, descalificados y no aptos legales)
    const { data: propuestas } = await supabase
      .from('propuestas')
      .select('razon_social, tipo_persona, estado')
      .eq('proceso_id', proceso.id)
      .not('estado', 'in', '(retirada,descalificada,no_apto_legal)')
      .order('razon_social', { ascending: true })

    // Criterios configurados para este proceso
    const { data: criteriosRaw } = await supabase
      .from('criterios')
      .select('peso, orden, criterios_evaluacion:criterio_evaluacion_id(nombre, descripcion)')
      .eq('proceso_id', proceso.id)
      .eq('activo', true)
      .order('orden', { ascending: true })

    const criterios = (criteriosRaw ?? []).map((c) => ({
      nombre: (c.criterios_evaluacion as { nombre: string; descripcion: string | null } | null)?.nombre ?? 'Criterio',
      descripcion: (c.criterios_evaluacion as { nombre: string; descripcion: string | null } | null)?.descripcion ?? null,
      peso: c.peso,
    }))

    return NextResponse.json({
      conjunto: (proceso.conjunto as { nombre: string } | null)?.nombre ?? 'Conjunto',
      nombre: proceso.nombre,
      estado: proceso.estado,
      fecha_inicio: proceso.fecha_inicio,
      fecha_estimado_fin: proceso.fecha_fin ?? proceso.fecha_inicio,
      total_candidatos: propuestas?.length ?? 0,
      evaluaciones_completadas: 0,
      votacion_completada: 0,
      comunicados: [],
      candidatos: (propuestas ?? []).map((p) => ({
        razon_social: p.razon_social,
        tipo_persona: p.tipo_persona,
        estado: p.estado,
      })),
      criterios,
    })
  } catch (err) {
    console.error('[procesos/publico] GET error:', err)
    return NextResponse.json({ error: 'Error al obtener proceso' }, { status: 500 })
  }
}
