import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { getPropuestaConjunto, upsertPropuestaRutDatos, getPropuestaRutDatos } from '@/lib/supabase/queries'
import type { PropuestaRutDatos } from '@/lib/types'

export async function GET(request: NextRequest) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  const propuesta_id = new URL(request.url).searchParams.get('propuesta_id')
  if (!propuesta_id) {
    return NextResponse.json({ error: 'propuesta_id es requerido' }, { status: 400 })
  }

  const { data: propuesta, error: accesoError } = await getPropuestaConjunto(propuesta_id, conjuntoId!)
  if (accesoError || !propuesta) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
  }

  const { data, error } = await getPropuestaRutDatos(propuesta_id)
  if (error) {
    return NextResponse.json({ error: 'Error al obtener datos del RUT' }, { status: 500 })
  }

  return NextResponse.json(data ?? null)
}

export async function POST(request: NextRequest) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const body = await request.json()

    if (!body?.propuesta_id) {
      return NextResponse.json({ error: 'propuesta_id es requerido' }, { status: 400 })
    }

    const { data: propuesta, error: accesoError } = await getPropuestaConjunto(
      String(body.propuesta_id),
      conjuntoId!
    )
    if (accesoError || !propuesta) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
    }

    const payload: Omit<PropuestaRutDatos, 'id' | 'created_at' | 'updated_at'> = {
      propuesta_id:           String(body.propuesta_id),
      nit_extraido:           body.nit_extraido           ?? null,
      dv_extraido:            body.dv_extraido            ?? null,
      razon_social_extraida:  body.razon_social_extraida  ?? null,
      tipo_contribuyente:     body.tipo_contribuyente     ?? null,
      representantes_legales: body.representantes_legales ?? [],
      socios:                 body.socios                 ?? [],
      revisor_fiscal_principal: body.revisor_fiscal_principal ?? null,
      revisor_fiscal_suplente:  body.revisor_fiscal_suplente  ?? null,
      contador:               body.contador               ?? null,
      responsabilidades:      body.responsabilidades      ?? [],
      hay_alerta_pep:         Boolean(body.hay_alerta_pep),
      nit_coincide:           body.nit_coincide           ?? null,
    }

    const { data, error } = await upsertPropuestaRutDatos(payload)
    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[rut-datos] Error:', err)
    return NextResponse.json({ error: 'Error al guardar datos del RUT' }, { status: 500 })
  }
}
