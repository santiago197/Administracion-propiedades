import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createServerClient } from '@supabase/ssr'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validar autenticación
  const { authorized, response: authError, user } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const { id } = await params
    const { puntaje_total, clasificacion, detalles } = await request.json()

    if (puntaje_total === undefined || !clasificacion) {
      return NextResponse.json({ error: 'Datos de evaluación incompletos' }, { status: 400 })
    }

    const cookieStore = await (await import('next/headers')).cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    // 1. Crear registro en evaluaciones_admin
    const { data: evalAdmin, error: evalError } = await supabase
      .from('evaluaciones_admin')
      .insert({
        propuesta_id: id,
        evaluador_id: user.id,
        puntaje_total,
        clasificacion,
      })
      .select()
      .single()

    if (evalError) throw evalError

    // 2. Crear registros en puntajes_criterio
    const puntajesParaInsertar = Object.entries(detalles).map(([key, value]) => ({
      evaluacion_id: evalAdmin.id,
      criterio_codigo: key,
      puntaje: typeof value === 'number' ? value : (Array.isArray(value) ? value.length : 0),
      valor_original: JSON.stringify(value)
    }))

    const { error: puntajesError } = await supabase
      .from('puntajes_criterio')
      .insert(puntajesParaInsertar)

    if (puntajesError) throw puntajesError

    // 3. Actualizar la propuesta con el nuevo puntaje y clasificación
    // Nota: Aquí sobrescribimos el puntaje_evaluacion de la propuesta
    const { error: propError } = await supabase
      .from('propuestas')
      .update({
        puntaje_evaluacion: puntaje_total,
        clasificacion: clasificacion
      })
      .eq('id', id)

    if (propError) throw propError

    // 4. Auditoría
    await supabase.from('audit_log').insert({
      accion: 'EVALUACION_ADMIN',
      entidad: 'propuestas',
      entidad_id: id,
      datos_nuevos: { puntaje_total, clasificacion }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error saving evaluation:', error)
    return NextResponse.json({ error: 'Error al guardar la evaluación' }, { status: 500 })
  }
}
