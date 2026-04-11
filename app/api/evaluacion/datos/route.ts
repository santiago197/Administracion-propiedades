import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConsejeroSessionFromRequest } from '@/lib/consejero-session'

/**
 * GET /api/evaluacion/datos?proceso_id=<uuid>
 *
 * Endpoint público para consejeros (sin Supabase Auth).
 * Retorna en un solo request todo lo necesario para la evaluación:
 *   - propuestas en estado 'en_evaluacion'
 *   - criterios activos ordenados por peso
 *   - evaluaciones ya guardadas del consejero
 *   - ya_voto: si el consejero ya registró su voto
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const proceso_id = searchParams.get('proceso_id')
  const session = getConsejeroSessionFromRequest(request)

  if (!proceso_id) {
    return NextResponse.json(
      { error: 'proceso_id es requerido' },
      { status: 400 }
    )
  }

  if (!session) {
    return NextResponse.json({ error: 'Sesión de consejero no válida o expirada' }, { status: 401 })
  }

  // Verificar que el proceso pertenece al conjunto de la sesión (más flexible que comparar procesoId exacto)
  // Esto resuelve sesiones creadas antes de que el proceso alcanzara estado 'evaluacion'

  try {
    const supabase = createAdminClient()

    // 1. Validar consejero activo
    const { data: consejero, error: cError } = await supabase
      .from('consejeros')
      .select('id, conjunto_id, nombre_completo, cargo, torre, apartamento, email, telefono')
      .eq('id', session.consejeroId)
      .eq('activo', true)
      .single()

    if (cError || !consejero) {
      return NextResponse.json({ error: 'Consejero no válido o inactivo' }, { status: 403 })
    }

    // 2. Validar proceso activo y del mismo conjunto
    const { data: proceso, error: pError } = await supabase
      .from('procesos')
      .select('id, conjunto_id, estado')
      .eq('id', proceso_id)
      .single()

    if (pError || !proceso) {
      return NextResponse.json({ error: 'Proceso no encontrado' }, { status: 404 })
    }

    if (proceso.conjunto_id !== consejero.conjunto_id) {
      return NextResponse.json({ error: 'El proceso no pertenece al conjunto del consejero' }, { status: 403 })
    }

    if (proceso.estado !== 'evaluacion' && proceso.estado !== 'votacion') {
      return NextResponse.json(
        { error: 'El proceso no está en etapa de evaluación o votación' },
        { status: 409 }
      )
    }

    // 3. Cargar todo en paralelo
    const [
      { data: propuestas },
      { data: criterios },
      { data: evaluaciones },
      { data: voto },
    ] = await Promise.all([
      supabase
        .from('propuestas')
        .select('id, razon_social, tipo_persona, nit_cedula, representante_legal, anios_experiencia, unidades_administradas, valor_honorarios, estado')
        .eq('proceso_id', proceso_id)
        .in('estado', ['en_evaluacion', 'apto', 'condicionado', 'destacado', 'no_apto', 'entrevistado', 'preseleccionado']),

      supabase
        .from('criterios')
        .select('id, peso, valor_minimo, valor_maximo, orden, activo, criterios_evaluacion:criterio_evaluacion_id (nombre, descripcion, tipo)')
        .eq('proceso_id', proceso_id)
        .eq('activo', true)
        .order('orden', { ascending: true }),

      supabase
        .from('evaluaciones')
        .select('propuesta_id, criterio_id, valor, comentario')
        .eq('proceso_id', proceso_id)
        .eq('consejero_id', session.consejeroId),

      supabase
        .from('votos')
        .select('id')
        .eq('proceso_id', proceso_id)
        .eq('consejero_id', session.consejeroId)
        .maybeSingle(),
    ])

    const criteriosFinal = (criterios ?? []).map((criterio) => ({
      id: criterio.id,
      nombre: criterio.criterios_evaluacion?.nombre ?? 'Criterio',
      descripcion: criterio.criterios_evaluacion?.descripcion ?? null,
      peso: criterio.peso,
      tipo: criterio.criterios_evaluacion?.tipo ?? 'escala',
      valor_minimo: criterio.valor_minimo,
      valor_maximo: criterio.valor_maximo,
      orden: criterio.orden ?? 0,
    }))

    if (criteriosFinal.length === 0) {
      return NextResponse.json(
        { error: 'No hay criterios configurados para este proceso' },
        { status: 409 }
      )
    }

    const propuestaIds = (propuestas ?? []).map((propuesta) => propuesta.id)
    const { data: documentos } = propuestaIds.length
      ? await supabase
          .from('documentos')
          .select('id, propuesta_id, tipo, nombre, estado, archivo_url')
          .in('propuesta_id', propuestaIds)
      : { data: [] }

    // Obtener observación de preselección desde el historial
    const idsPresel = (propuestas ?? []).filter((p) => p.estado === 'preseleccionado' || p.estado === 'entrevistado').map((p) => p.id)
    const observacionPreselMap: Record<string, string> = {}
    if (idsPresel.length > 0) {
      const { data: historial } = await supabase
        .from('historial_estados_propuesta')
        .select('propuesta_id, observacion, created_at')
        .in('propuesta_id', idsPresel)
        .in('estado_nuevo', ['preseleccionado', 'entrevistado'])
        .order('created_at', { ascending: false })
      for (const h of historial ?? []) {
        if (!observacionPreselMap[h.propuesta_id] && h.observacion) {
          observacionPreselMap[h.propuesta_id] = h.observacion
        }
      }
    }

    // Preseleccionados primero, luego entrevistados, luego alfabético
    const ORDEN_ESTADO: Record<string, number> = { preseleccionado: 0, entrevistado: 1 }
    const propuestasSorted = (propuestas ?? []).slice().sort((a, b) => {
      const aP = ORDEN_ESTADO[a.estado] ?? 2
      const bP = ORDEN_ESTADO[b.estado] ?? 2
      if (aP !== bP) return aP - bP
      return a.razon_social.localeCompare(b.razon_social, 'es')
    })

    return NextResponse.json({
      propuestas: propuestasSorted.map((p) => ({
        ...p,
        observacion_entrevista: observacionPreselMap[p.id] ?? null,
      })),
      criterios: criteriosFinal,
      evaluaciones: evaluaciones ?? [],
      documentos: documentos ?? [],
      consejero: consejero,
      ya_voto: voto !== null,
    })
  } catch (err) {
    console.error('[evaluacion/datos] error:', err)
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
  }
}
