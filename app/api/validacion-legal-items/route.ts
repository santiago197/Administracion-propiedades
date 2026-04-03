import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createValidacionLegalItem, getValidacionLegalItems } from '@/lib/supabase/queries'
import type { AplicaAItemChecklist, CriticidadItem } from '@/lib/types/index'

function toCriticidad(value: unknown): CriticidadItem | null {
  if (value === 'critico' || value === 'importante' || value === 'condicionante' || value === 'informativo') {
    return value
  }
  return null
}

function toAplicaA(value: unknown): AplicaAItemChecklist | null {
  if (value === 'ambos' || value === 'juridica' || value === 'natural') return value
  return null
}

export async function GET(request: NextRequest) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const soloActivos = searchParams.get('activos') === 'true'
    const { data, error } = await getValidacionLegalItems(soloActivos)
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[validacion-legal-items] GET error:', err)
    return NextResponse.json({ error: 'Error al obtener items de validación legal' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { authorized, response: authError } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()

    const codigo = String(body.codigo ?? '').trim()
    const seccion = String(body.seccion ?? '').trim()
    const nombre = String(body.nombre ?? '').trim()
    const descripcion = String(body.descripcion ?? '').trim()
    const categoria = toCriticidad(body.categoria)
    const aplica_a = toAplicaA(body.aplica_a ?? 'ambos')

    if (!codigo || !seccion || !nombre || !descripcion || !categoria || !aplica_a) {
      return NextResponse.json(
        { error: 'Campos requeridos: codigo, seccion, nombre, descripcion, categoria, aplica_a' },
        { status: 400 }
      )
    }

    const { data, error } = await createValidacionLegalItem({
      codigo,
      seccion,
      nombre,
      categoria,
      descripcion,
      aplica_a,
      activo: body.activo ?? true,
      obligatorio: body.obligatorio ?? true,
      orden: Number(body.orden ?? 1),
    })
    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[validacion-legal-items] POST error:', err)
    return NextResponse.json({ error: 'Error al crear item de validación legal' }, { status: 500 })
  }
}

