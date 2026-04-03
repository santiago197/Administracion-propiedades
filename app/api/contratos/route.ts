import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'

import { requireAuth } from '@/lib/supabase/auth-utils'
import {
  getContratosConEstado,
  getContratosStats,
  createContrato,
  updateContrato,
  deleteContrato,
  getContrato,
} from '@/lib/supabase/queries'

// ─────────────────────────────────────────────────────────────────────
// GET: Obtener contratos con estadísticas
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authorized) return auth.response!

  try {
    const [contratosResult, statsResult] = await Promise.all([
      getContratosConEstado(auth.conjuntoId!),
      getContratosStats(auth.conjuntoId!),
    ])

    if (contratosResult.error) {
      console.error('[v0] Error al obtener contratos:', contratosResult.error)
      return NextResponse.json(
        { error: 'Error al obtener contratos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      contratos: contratosResult.data || [],
      stats: statsResult.data || { total: 0, vigentes: 0, proximos_a_vencer: 0, vencidos: 0 },
    })
  } catch (error) {
    console.error('[v0] Error en GET /api/contratos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────
// POST: Crear nuevo contrato
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authorized) return auth.response!

  try {
    const formData = await request.formData()

    // Extraer campos
    const nombre = formData.get('nombre') as string
    const responsable = formData.get('responsable') as string | null
    const descripcion = formData.get('descripcion') as string | null
    const fecha_inicio = formData.get('fecha_inicio') as string
    const fecha_fin = formData.get('fecha_fin') as string
    const dias_preaviso = parseInt(formData.get('dias_preaviso') as string) || 30
    const valorStr = formData.get('valor') as string | null
    const moneda = (formData.get('moneda') as string) || 'COP'
    const observaciones = formData.get('observaciones') as string | null
    const archivo = formData.get('archivo') as File | null

    // Validaciones
    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: 'El nombre del contrato es obligatorio' },
        { status: 400 }
      )
    }

    if (!fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'Las fechas de inicio y fin son obligatorias' },
        { status: 400 }
      )
    }

    if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      )
    }

    // Subir archivo si existe
    let archivo_principal_url: string | null = null
    let archivo_principal_pathname: string | null = null

    if (archivo && archivo.size > 0) {
      const blob = await put(`contratos/${auth.conjuntoId}/${Date.now()}-${archivo.name}`, archivo, {
        access: 'private',
      })
      archivo_principal_url = blob.url
      archivo_principal_pathname = blob.pathname
    }

    // Crear contrato
    const { data, error } = await createContrato({
      conjunto_id: auth.conjuntoId!,
      nombre: nombre.trim(),
      responsable: responsable?.trim() || undefined,
      descripcion: descripcion?.trim() || undefined,
      fecha_inicio,
      fecha_fin,
      dias_preaviso,
      valor: valorStr ? parseFloat(valorStr) : undefined,
      moneda,
      archivo_principal_url: archivo_principal_url || undefined,
      archivo_principal_pathname: archivo_principal_pathname || undefined,
      observaciones: observaciones?.trim() || undefined,
      activo: true,
    })

    if (error) {
      console.error('[v0] Error al crear contrato:', error)
      return NextResponse.json(
        { error: 'Error al crear el contrato' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Error en POST /api/contratos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────
// PUT: Actualizar contrato existente
// ─────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authorized) return auth.response!

  try {
    const formData = await request.formData()

    const id = formData.get('id') as string
    if (!id) {
      return NextResponse.json(
        { error: 'ID del contrato es obligatorio' },
        { status: 400 }
      )
    }

    // Verificar que el contrato pertenece al conjunto
    const { data: existingContrato, error: fetchError } = await getContrato(id)
    if (fetchError || !existingContrato) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      )
    }

    if (existingContrato.conjunto_id !== auth.conjuntoId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    // Extraer campos
    const nombre = formData.get('nombre') as string
    const responsable = formData.get('responsable') as string | null
    const descripcion = formData.get('descripcion') as string | null
    const fecha_inicio = formData.get('fecha_inicio') as string
    const fecha_fin = formData.get('fecha_fin') as string
    const dias_preaviso = parseInt(formData.get('dias_preaviso') as string) || 30
    const valorStr = formData.get('valor') as string | null
    const moneda = (formData.get('moneda') as string) || 'COP'
    const observaciones = formData.get('observaciones') as string | null
    const archivo = formData.get('archivo') as File | null

    // Validaciones
    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: 'El nombre del contrato es obligatorio' },
        { status: 400 }
      )
    }

    if (!fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'Las fechas de inicio y fin son obligatorias' },
        { status: 400 }
      )
    }

    if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      )
    }

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = {
      nombre: nombre.trim(),
      responsable: responsable?.trim() || null,
      descripcion: descripcion?.trim() || null,
      fecha_inicio,
      fecha_fin,
      dias_preaviso,
      valor: valorStr ? parseFloat(valorStr) : null,
      moneda,
      observaciones: observaciones?.trim() || null,
    }

    // Subir nuevo archivo si existe
    if (archivo && archivo.size > 0) {
      // Eliminar archivo anterior si existe
      if (existingContrato.archivo_principal_url) {
        try {
          await del(existingContrato.archivo_principal_url)
        } catch (deleteError) {
          console.error('[v0] Error al eliminar archivo anterior:', deleteError)
        }
      }

      const blob = await put(`contratos/${auth.conjuntoId}/${Date.now()}-${archivo.name}`, archivo, {
        access: 'private',
      })
      updateData.archivo_principal_url = blob.url
      updateData.archivo_principal_pathname = blob.pathname
    }

    // Actualizar contrato
    const { data, error } = await updateContrato(id, updateData)

    if (error) {
      console.error('[v0] Error al actualizar contrato:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el contrato' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] Error en PUT /api/contratos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────
// DELETE: Eliminar contrato (soft delete)
// ─────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authorized) return auth.response!

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID del contrato es obligatorio' },
        { status: 400 }
      )
    }

    // Verificar que el contrato pertenece al conjunto
    const { data: existingContrato, error: fetchError } = await getContrato(id)
    if (fetchError || !existingContrato) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      )
    }

    if (existingContrato.conjunto_id !== auth.conjuntoId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    // Soft delete
    const { error } = await deleteContrato(id)

    if (error) {
      console.error('[v0] Error al eliminar contrato:', error)
      return NextResponse.json(
        { error: 'Error al eliminar el contrato' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error en DELETE /api/contratos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
