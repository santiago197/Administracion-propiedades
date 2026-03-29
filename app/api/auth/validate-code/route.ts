import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
<<<<<<< HEAD
=======
import { setConsejeroSessionCookie } from '@/lib/consejero-session'
// import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  // if (!rateLimit(`validate-code:${ip}`, 10, 10 * 60 * 1000)) {
  //   return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 })
  // }
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449

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
      return NextResponse.json(
        { error: 'Código de acceso inválido' },
        { status: 401 }
      )
    }

    // Obtener el proceso activo del conjunto
    const { data: proceso, error: procError } = await supabase
      .from('procesos')
      .select('id')
      .eq('conjunto_id', consejero.conjunto_id)
      .eq('estado', 'evaluacion')
      .single()

    if (procError || !proceso) {
      return NextResponse.json(
        { error: 'No hay un proceso de evaluación activo' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      consejero_id: consejero.id,
      proceso_id: proceso.id,
    })
<<<<<<< HEAD
=======

    setConsejeroSessionCookie(response, {
      consejeroId: consejero.id,
      conjuntoId: consejero.conjunto_id,
      procesoId: proceso?.id ?? null,
      issuedAt: Date.now(),
    })

    return response
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
  } catch (error) {
    console.error('[v0] Validation error:', error)
    return NextResponse.json({ error: 'Error en la validación' }, { status: 500 })
  }
}
