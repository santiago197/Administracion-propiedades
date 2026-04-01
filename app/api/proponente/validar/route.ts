/**
 * API: Validar código de acceso del proponente
 * GET /api/proponente/validar?codigo=ABC12345
 * 
 * Devuelve:
 * - propuesta: datos de la propuesta
 * - estadoDocumentos: documentos faltantes y estado
 */

import { NextRequest, NextResponse } from 'next/server'

// TODO: Implementar con datos reales de Supabase
export async function GET(request: NextRequest) {
  try {
    const codigo = request.nextUrl.searchParams.get('codigo')

    if (!codigo) {
      return NextResponse.json(
        { error: 'Código no proporcionado' },
        { status: 400 }
      )
    }

    // TODO: Validar código en tabla `acceso_proponentes` o similar
    // const { data: acceso } = await supabase
    //   .from('acceso_proponentes')
    //   .select('propuesta_id, activo, fecha_limite')
    //   .eq('codigo', codigo)
    //   .single()

    // Datos de ejemplo
    const propuestaData = {
      id: 'prop-123',
      razon_social: 'Empresa XYZ SAS',
      numero_documento: '123456789',
      email: 'contact@empresa.com',
    }

    const estadoDocumentos = {
      total: 8,
      completados: 3,
      porcentaje: 37,
      faltantes: [
        {
          id: 'tipo-hoja-vida',
          nombre: 'Hoja de Vida',
          descripcion: 'Documento con experiencia y formación',
          esObligatorio: true,
        },
        {
          id: 'tipo-rut',
          nombre: 'RUT Actualizado',
          descripcion: 'Registro Único Tributario',
          esObligatorio: true,
        },
        {
          id: 'tipo-cedula',
          nombre: 'Cédula',
          descripcion: 'Documento de identidad',
          esObligatorio: true,
        },
        {
          id: 'tipo-certificados',
          nombre: 'Certificados de experiencia',
          descripcion: 'Comprobante de experiencia en PH',
          esObligatorio: true,
        },
        {
          id: 'tipo-referencias',
          nombre: 'Referencias',
          descripcion: 'Contactos de referencias profesionales',
          esObligatorio: false,
        },
      ],
      vencidos: 0,
    }

    return NextResponse.json(
      {
        propuesta: propuestaData,
        estadoDocumentos,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error validating proponent code:', error)
    return NextResponse.json(
      { error: 'Error al validar código' },
      { status: 500 }
    )
  }
}
