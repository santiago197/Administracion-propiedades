import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { getPropuestaConjunto, getDocumentos, getDocumentosFaltantes } from '@/lib/supabase/queries'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  const { id } = await params

  try {
    // Verificar que la propuesta pertenece al conjunto
    const { data: propuesta, error: propError } = await getPropuestaConjunto(id, conjuntoId!)
    if (propError || !propuesta) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 })
    }

    // Obtener documentos existentes
    const { data: documentos, error: docsError } = await getDocumentos(id)
    if (docsError) {
      console.error('[documentos-status] Error obteniendo documentos:', docsError)
      return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
    }

    // Obtener tipos de documento faltantes y cubiertos
    const { faltantes, cubiertos, tipoPersona } = await getDocumentosFaltantes(id)

    // Calcular estadísticas
    const totalObligatorios = faltantes.length + cubiertos.filter(t => t.es_obligatorio).length
    const completados = cubiertos.filter(t => t.es_obligatorio).length
    const porcentajeCompletado = totalObligatorios > 0 
      ? Math.round((completados / totalObligatorios) * 100) 
      : 100

    // Verificar documentos vencidos
    const hoy = new Date()
    const documentosVencidos = (documentos ?? []).filter(d => {
      if (!d.fecha_vencimiento) return false
      return new Date(d.fecha_vencimiento) < hoy
    })

    return NextResponse.json({
      propuesta_id: id,
      razon_social: propuesta.razon_social,
      tipo_persona: tipoPersona,
      documentos: documentos ?? [],
      tipos_faltantes: faltantes,
      tipos_cubiertos: cubiertos,
      estadisticas: {
        total_obligatorios: totalObligatorios,
        completados,
        faltantes: faltantes.length,
        porcentaje: porcentajeCompletado,
        vencidos: documentosVencidos.length,
      }
    })
  } catch (error) {
    console.error('[documentos-status] Error:', error)
    return NextResponse.json({ error: 'Error al procesar solicitud' }, { status: 500 })
  }
}
