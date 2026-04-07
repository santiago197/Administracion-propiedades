/**
 * API: Validar código de acceso del proponente
 * GET /api/proponente/validar?codigo=ABC12345
 * 
 * Flujo:
 * 1. Valida código en tabla acceso_proponentes
 * 2. Verifica que esté activo y no expirado
 * 3. Obtiene documentos cargados vs faltantes
 * 4. Retorna estado completo de documentación
 */

import { NextRequest, NextResponse } from 'next/server'
import { validarCodigoProponente } from '@/lib/supabase/queries'

export async function GET(request: NextRequest) {
  try {
    const codigo = request.nextUrl.searchParams.get('codigo')

    if (!codigo) {
      return NextResponse.json(
        { error: 'Código no proporcionado' },
        { status: 400 }
      )
    }

    // Validar código y obtener propuesta + documentos
    const { data, error } = await validarCodigoProponente(codigo)

    if (error || !data) {
      return NextResponse.json(
        { error: 'Código inválido o expirado', detail: error?.message },
        { status: 403 }
      )
    }

    // Retornar datos en formato esperado por frontend
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('[proponente/validar] Error:', error)
    return NextResponse.json(
      { error: 'Error al validar código' },
      { status: 500 }
    )
  }
}
