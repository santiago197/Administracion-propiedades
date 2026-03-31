import { NextResponse, type NextRequest } from 'next/server'
import { createCriterio, createCriterioProceso, getCriterios, getCriteriosProceso } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const soloActivos = searchParams.get('activos') === 'true'
    const procesoId = searchParams.get('proceso_id')

    if (procesoId) {
      try {
        const criterios = await getCriteriosProceso(procesoId)
        return NextResponse.json(criterios)
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === 'object' && error && 'message' in error
              ? String((error as { message?: unknown }).message)
              : ''
        const errorDetails =
          typeof error === 'object' && error && 'details' in error
            ? String((error as { details?: unknown }).details)
            : ''
        const errorCode =
          typeof error === 'object' && error && 'code' in error
            ? String((error as { code?: unknown }).code)
            : ''
        const lowerMessage = `${errorMessage} ${errorDetails}`.toLowerCase()
        const isRlsError =
          lowerMessage.includes('row-level security') || lowerMessage.includes('permission')
        const isSchemaMismatch =
          errorCode === 'PGRST200' ||
          lowerMessage.includes('criterio_evaluacion_id') ||
          lowerMessage.includes('criterios_evaluacion') ||
          lowerMessage.includes('column') ||
          lowerMessage.includes('does not exist')

        const adminClient = createAdminClient()

        if (isSchemaMismatch) {
          const { data, error: adminError } = await adminClient
            .from('criterios')
            .select('id, proceso_id, nombre, descripcion, tipo, peso, valor_minimo, valor_maximo, orden, activo')
            .eq('proceso_id', procesoId)
            .order('orden', { ascending: true })

          if (adminError) throw adminError
          return NextResponse.json(data ?? [])
        }

        if (!isRlsError) throw error

        const { data, error: adminError } = await adminClient
          .from('criterios')
          .select(
            'id, proceso_id, criterio_evaluacion_id, peso, valor_minimo, valor_maximo, orden, activo, criterios_evaluacion:criterio_evaluacion_id (id, nombre, descripcion, tipo, orden, activo)'
          )
          .eq('proceso_id', procesoId)
          .order('orden', { ascending: true })

        if (adminError) throw adminError
        return NextResponse.json(data ?? [])
      }
    }

    try {
      const criterios = await getCriterios(soloActivos)
      return NextResponse.json({ criterios })
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error && 'message' in error
            ? String((error as { message?: unknown }).message)
            : ''
      const errorDetails =
        typeof error === 'object' && error && 'details' in error
          ? String((error as { details?: unknown }).details)
          : ''
      const lowerMessage = `${errorMessage} ${errorDetails}`.toLowerCase()
      const isRlsError =
        lowerMessage.includes('row-level security') || lowerMessage.includes('permission')

      if (!isRlsError) throw error

      const adminClient = createAdminClient()
      let query = adminClient
        .from('criterios_evaluacion')
        .select('*')
        .order('orden', { ascending: true })

      if (soloActivos) {
        query = query.eq('activo', true)
      }

      const { data, error: adminError } = await query
      if (adminError) throw adminError

      return NextResponse.json({ criterios: data ?? [] })
    }
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
    if (body.proceso_id) {
      if (!body.criterio_evaluacion_id) {
        return NextResponse.json(
          { error: 'criterio_evaluacion_id es requerido' },
          { status: 400 }
        )
      }
      if (body.peso === undefined || body.valor_minimo === undefined || body.valor_maximo === undefined) {
        return NextResponse.json(
          { error: 'peso, valor_minimo y valor_maximo son requeridos' },
          { status: 400 }
        )
      }
      if (body.peso < 0 || body.peso > 100) {
        return NextResponse.json(
          { error: 'El peso debe estar entre 0 y 100' },
          { status: 400 }
        )
      }
      if (body.valor_minimo > body.valor_maximo) {
        return NextResponse.json(
          { error: 'valor_minimo no puede ser mayor que valor_maximo' },
          { status: 400 }
        )
      }

      const criterioProceso = await createCriterioProceso({
        proceso_id: body.proceso_id,
        criterio_evaluacion_id: body.criterio_evaluacion_id,
        peso: body.peso,
        valor_minimo: body.valor_minimo,
        valor_maximo: body.valor_maximo,
        orden: body.orden ?? 0,
        activo: body.activo ?? true,
      })

      return NextResponse.json(criterioProceso, { status: 201 })
    }

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
