import { NextResponse, type NextRequest } from 'next/server'
import { createConsejero, getConsejeros, getConsejero, updateConsejero, getConjunto, generateUniqueCodigoAcceso } from '@/lib/supabase/queries'
import { requireAuth } from '@/lib/supabase/auth-utils'

const CARGOS_VALIDOS = [
  'presidente',
  'vicepresidente',
  'secretario',
  'tesorero',
  'vocal_principal',
  'consejero',
  'consejero_suplente',
] as const

const CARGOS_LEGACY = ['vocal', 'fiscal'] as const
type CargoValido = (typeof CARGOS_VALIDOS)[number]

function extractErrorDetail(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: string
      details?: string
      hint?: string
      code?: string
    }
    return (
      candidate.message ||
      candidate.details ||
      candidate.hint ||
      candidate.code ||
      JSON.stringify(error)
    )
  }
  return String(error)
}

export async function GET(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const conjunto_id = searchParams.get('conjunto_id')
    const id = searchParams.get('id')

    // Si se proporciona id, obtener un consejero específico
    if (id) {
      const { data: consejero, error } = await getConsejero(id)
      if (error) throw error
      if (!consejero) {
        return NextResponse.json({ error: 'Consejero no encontrado' }, { status: 404 })
      }
      if (consejero.conjunto_id !== conjuntoId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
      }
      return NextResponse.json(consejero)
    }

    // Listar consejeros del conjunto
    if (!conjunto_id) {
      return NextResponse.json(
        { error: 'conjunto_id es requerido' },
        { status: 400 }
      )
    }

    if (conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Acceso denegado al conjunto' }, { status: 403 })
    }

    const { data, error } = await getConsejeros(conjunto_id)
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[consejeros] Error fetching consejeros:', error)
    return NextResponse.json({ error: 'Error al obtener consejeros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()
    
    // Verificar si es una acción especial (regenerar código)
    if (body.action === 'regenerar_codigo' && body.consejero_id) {
      return await regenerarCodigo(body.consejero_id, conjuntoId!)
    }

    // Crear nuevo consejero
    const required = ['nombre_completo', 'cargo', 'apartamento']
    const missing = required.filter((key) => !body?.[key])
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Faltan campos requeridos: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    if (!CARGOS_VALIDOS.includes(body.cargo as CargoValido)) {
      return NextResponse.json(
        {
          error: 'Cargo inválido',
          detail: `Valores permitidos: ${CARGOS_VALIDOS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Obtener nombre del conjunto para generar código
    const { data: conjunto } = await getConjunto(conjuntoId!)
    const codigo = await generateUniqueCodigoAcceso(conjunto?.nombre)

    const { data, error } = await createConsejero({
      conjunto_id: conjuntoId!,
      nombre_completo: String(body.nombre_completo),
      cargo: body.cargo,
      torre: body.torre ?? null,
      apartamento: String(body.apartamento),
      email: body.email ?? null,
      telefono: body.telefono ?? null,
      codigo_acceso: codigo,
      activo: body.activo ?? true,
    })
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[consejeros] Error creating consejero:', error)
    const detail = extractErrorDetail(error)
    if (detail.includes('consejeros_cargo_check')) {
      return NextResponse.json(
        {
          error: 'Error al crear consejero',
          detail:
            'La base de datos aún tiene una restricción de cargo antigua. Ejecuta scripts/004_fix_rls.sql para actualizar consejeros_cargo_check y vuelve a intentar.',
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: 'Error al crear consejero', detail }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    // Verificar que el consejero existe y pertenece al conjunto
    const { data: consejero, error: getError } = await getConsejero(id)
    
    if (getError) throw getError
    if (!consejero) {
      return NextResponse.json({ error: 'Consejero no encontrado' }, { status: 404 })
    }

    if (consejero.conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Campos permitidos para actualización (NO incluye codigo_acceso)
    const allowedFields = [
      'nombre_completo',
      'cargo',
      'torre',
      'apartamento',
      'email',
      'telefono',
    ]

    const filteredUpdates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    // Validar campos requeridos
    if (filteredUpdates.nombre_completo !== undefined && !filteredUpdates.nombre_completo?.trim()) {
      return NextResponse.json({ error: 'nombre_completo no puede estar vacío' }, { status: 400 })
    }

    if (filteredUpdates.apartamento !== undefined && !filteredUpdates.apartamento?.trim()) {
      return NextResponse.json({ error: 'apartamento no puede estar vacío' }, { status: 400 })
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    if (
      filteredUpdates.cargo !== undefined &&
      !CARGOS_VALIDOS.includes(filteredUpdates.cargo as CargoValido) &&
      !CARGOS_LEGACY.includes(filteredUpdates.cargo as (typeof CARGOS_LEGACY)[number])
    ) {
      return NextResponse.json(
        {
          error: 'Cargo inválido',
          detail: `Valores permitidos: ${CARGOS_VALIDOS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Actualizar
    const { data, error } = await updateConsejero(id, filteredUpdates)
    
    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('[consejeros] PATCH error:', error)
    return NextResponse.json({ error: 'Error al actualizar consejero' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    // Verificar que el consejero existe y pertenece al conjunto
    const { data: consejero, error: getError } = await getConsejero(id)
    
    if (getError) throw getError
    if (!consejero) {
      return NextResponse.json({ error: 'Consejero no encontrado' }, { status: 404 })
    }

    if (consejero.conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Soft delete: marcar como inactivo
    const { data, error } = await updateConsejero(id, { activo: false })
    
    if (error) throw error

    return NextResponse.json({ 
      message: 'Consejero desactivado exitosamente',
      data 
    })
  } catch (error) {
    console.error('[consejeros] DELETE error:', error)
    return NextResponse.json({ error: 'Error al eliminar consejero' }, { status: 500 })
  }
}

// Función auxiliar para regenerar código
async function regenerarCodigo(consejeroId: string, conjuntoId: string) {
  try {
    // Verificar que el consejero existe y pertenece al conjunto
    const { data: consejero, error: getError } = await getConsejero(consejeroId)
    
    if (getError) throw getError
    if (!consejero) {
      return NextResponse.json({ error: 'Consejero no encontrado' }, { status: 404 })
    }

    if (consejero.conjunto_id !== conjuntoId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    if (!consejero.activo) {
      return NextResponse.json({ error: 'No se puede regenerar código para consejero inactivo' }, { status: 400 })
    }

    // Obtener nombre del conjunto para generar código
    const { data: conjunto } = await getConjunto(conjuntoId)
    const nuevoCodigo = await generateUniqueCodigoAcceso(conjunto?.nombre)

    // Actualizar código
    const { data, error } = await updateConsejero(consejeroId, { 
      codigo_acceso: nuevoCodigo 
    })
    
    if (error) throw error

    return NextResponse.json({ 
      message: 'Código regenerado exitosamente',
      codigo: nuevoCodigo,
      data 
    })
  } catch (error) {
    console.error('[consejeros] Error regenerando código:', error)
    return NextResponse.json({ error: 'Error al regenerar código' }, { status: 500 })
  }
}
