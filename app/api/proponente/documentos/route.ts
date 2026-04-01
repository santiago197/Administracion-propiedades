/**
 * API pública: Proponente sube un documento usando su código de acceso
 * POST /api/proponente/documentos
 *
 * Body: { codigo, tipo_documento_id, nombre, archivo_url, archivo_pathname }
 *
 * Valida el código → crea el registro de documento → retorna estado actualizado.
 * No requiere sesión admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validarCodigoProponente, createDocumento, getDocumentosFaltantes } from '@/lib/supabase/queries'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codigo, tipo_documento_id, nombre, archivo_url, archivo_pathname } = body

    if (!codigo || !tipo_documento_id || !nombre || !archivo_url) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: codigo, tipo_documento_id, nombre, archivo_url' },
        { status: 400 }
      )
    }

    // 1. Validar código y obtener propuesta
    const { data: acceso, error: validarError } = await validarCodigoProponente(codigo)
    if (validarError || !acceso) {
      return NextResponse.json(
        { error: 'Código inválido o expirado' },
        { status: 403 }
      )
    }

    const propuesta_id = acceso.propuesta_id

    // 2. Crear registro de documento
    const { data: documento, error: docError } = await createDocumento({
      propuesta_id,
      tipo_documento_id,
      tipo: 'CARGADO_POR_PROPONENTE',
      nombre,
      archivo_url,
      archivo_pathname: archivo_pathname ?? null,
      es_obligatorio: true,
      estado: 'pendiente',
      fecha_vencimiento: null,
      observaciones: null,
    })

    if (docError) {
      console.error('[proponente/documentos POST]', docError)
      return NextResponse.json({ error: 'Error al registrar documento' }, { status: 500 })
    }

    // 3. Recalcular estado de documentos faltantes
    const { faltantes, cubiertos } = await getDocumentosFaltantes(propuesta_id)
    const totalObligatorios = faltantes.length + cubiertos.filter(t => t.es_obligatorio).length
    const completados = cubiertos.filter(t => t.es_obligatorio).length
    const porcentaje = totalObligatorios > 0
      ? Math.round((completados / totalObligatorios) * 100)
      : 100

    return NextResponse.json({
      documento,
      estadisticas: {
        total_obligatorios: totalObligatorios,
        completados,
        faltantes: faltantes.length,
        porcentaje,
        vencidos: 0,
      },
      tipos_faltantes: faltantes,
    }, { status: 201 })
  } catch (error) {
    console.error('[proponente/documentos POST] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
