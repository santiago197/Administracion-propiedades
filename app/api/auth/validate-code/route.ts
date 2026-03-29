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

  try {
    const { codigo_acceso } = await request.json()

    if (!codigo_acceso) {
      return NextResponse.json(
        { error: 'Código de acceso requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: consejero, error } = await supabase
      .from('consejeros')
      .select('id, conjunto_id')
      .eq('codigo_acceso', codigo_acceso.toUpperCase())
      .eq('activo', true)
      .single()

    if (error || !consejero) {
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

    // Obtener el proceso activo del conjunto (si existe)
    const { data: proceso } = await supabase
      .from('procesos')
      .select('id')
      .eq('conjunto_id', consejero.conjunto_id)
      .eq('estado', 'evaluacion')
      .maybeSingle()

    const response = NextResponse.json({
      consejero_id: consejero.id,
      conjunto_id: consejero.conjunto_id,
      proceso_id: proceso?.id ?? null,
      tiene_proceso_activo: Boolean(proceso?.id),
      perfil_url: '/consejero/perfil',
    })

    setConsejeroSessionCookie(response, {
      consejeroId: consejero.id,
      conjuntoId: consejero.conjunto_id,
      procesoId: proceso?.id ?? null,
      issuedAt: Date.now(),
    })

    await logAuthEvent({
      request,
      accion: 'LOGIN_SUCCESS',
      entidadId: consejero.id,
      consejeroId: consejero.id,
      conjuntoId: consejero.conjunto_id,
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
