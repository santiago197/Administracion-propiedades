import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setConsejeroSessionCookie } from '@/lib/consejero-session'
import { logAuthEvent } from '@/lib/supabase/audit'
// import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  // if (!rateLimit(`validate-code:${ip}`, 10, 10 * 60 * 1000)) {
  //   return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 })
  // }

  let codigo_acceso: string | undefined

  try {
    const body = await request.json()
    codigo_acceso = body.codigo_acceso

    if (!codigo_acceso) {
      return NextResponse.json(
        { error: 'Código de acceso requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: rows, error } = await supabase
      .rpc('validate_consejero_code', { p_codigo: codigo_acceso })

    const row = rows?.[0] ?? null

    if (error || !row) {
      await logAuthEvent({
        request,
        accion: 'LOGIN_FAILED',
        entidadId: null,
        datosNuevos: { codigo_acceso: String(codigo_acceso).toUpperCase() },
      })
      return NextResponse.json(
        { error: 'Código de acceso inválido' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      consejero_id: row.consejero_id,
      conjunto_id: row.conjunto_id,
      proceso_id: row.proceso_id ?? null,
      tiene_proceso_activo: Boolean(row.proceso_id),
      perfil_url: '/consejero/perfil',
    })

    setConsejeroSessionCookie(response, {
      consejeroId: row.consejero_id,
      conjuntoId: row.conjunto_id,
      procesoId: row.proceso_id ?? null,
      issuedAt: Date.now(),
    })

    await logAuthEvent({
      request,
      accion: 'LOGIN_SUCCESS',
      entidadId: row.consejero_id,
      consejeroId: row.consejero_id,
      conjuntoId: row.conjunto_id,
    })

    return response
  } catch (error) {
    console.error('[v0] Validation error:', error)
    await logAuthEvent({
      request,
      accion: 'LOGIN_FAILED',
      entidadId: null,
      datosNuevos: { codigo_acceso: String(codigo_acceso ?? '').toUpperCase() },
    })
    return NextResponse.json({ error: 'Error en la validación' }, { status: 500 })
  }
}
