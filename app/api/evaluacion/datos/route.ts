import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConsejeroSessionFromRequest } from '@/lib/consejero-session'

function normalizeCriterioNombre(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

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
      { data: criteriosProceso },
      { data: criteriosConfigurados },
      { data: evaluaciones },
      { data: voto },
    ] = await Promise.all([
      supabase
        .from('propuestas')
        .select('id, razon_social, tipo_persona, nit_cedula, representante_legal, anios_experiencia, unidades_administradas, valor_honorarios')
        .eq('proceso_id', proceso_id)
        .in('estado', ['en_evaluacion', 'apto', 'condicionado', 'destacado', 'no_apto']),

      supabase
        .from('criterios')
        .select('id, nombre, descripcion, peso, tipo, valor_minimo, valor_maximo, orden')
        .eq('proceso_id', proceso_id)
        .eq('activo', true)
        .order('orden', { ascending: true }),

      supabase
        .from('criterios_evaluacion')
        .select('codigo, nombre, descripcion, peso, orden')
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

    const criteriosBase = criteriosProceso ?? []
    const criteriosConfig = criteriosConfigurados ?? []

    if (!criteriosBase.length) {
      return NextResponse.json(
        { error: 'No hay criterios configurados para este proceso' },
        { status: 409 }
      )
    }

    if (!criteriosConfig.length) {
      return NextResponse.json(
        { error: 'No hay criterios activos configurados en el sistema' },
        { status: 409 }
      )
    }

    const ordenadosBase = [...criteriosBase].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    const ordenadosConfig = [...criteriosConfig].sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
    )

    const baseByName = new Map(
      criteriosBase.map((criterio) => [
        normalizeCriterioNombre(criterio.nombre),
        criterio,
      ])
    )

    const criterios =
      criteriosBase.length === criteriosConfig.length &&
      ordenadosConfig.every((criterio) =>
        baseByName.has(normalizeCriterioNombre(criterio.nombre))
      )
        ? ordenadosConfig
            .map((criterioConfig, index) => {
              const normalizedConfig = normalizeCriterioNombre(criterioConfig.nombre)
              const matched = baseByName.get(normalizedConfig)

              if (!matched) return null

              return {
                ...matched,
                nombre: criterioConfig.nombre,
                descripcion: criterioConfig.descripcion,
                peso: criterioConfig.peso,
                orden: criterioConfig.orden ?? matched.orden ?? index + 1,
              }
            })
            .filter((criterio): criterio is NonNullable<typeof criterio> => criterio !== null)
        : criteriosBase.length === criteriosConfig.length
        ? ordenadosConfig.map((criterioConfig, index) => {
            const matched = ordenadosBase[index]
            return {
              ...matched,
              nombre: criterioConfig.nombre,
              descripcion: criterioConfig.descripcion,
              peso: criterioConfig.peso,
              orden: criterioConfig.orden ?? matched.orden ?? index + 1,
            }
          })
        : []

    if (!criterios.length) {
      return NextResponse.json(
        {
          error:
            'Los criterios activos no coinciden en cantidad con los del proceso. Contacta al administrador.',
        },
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

    return NextResponse.json({
      propuestas: propuestas ?? [],
      criterios: criterios ?? [],
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
