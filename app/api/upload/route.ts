import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB para logos
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export async function POST(request: NextRequest) {
  // Validar autenticación
  const { authorized, response: authError, conjuntoId } = await requireAuth(request)
  if (!authorized && authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = (formData.get('type') as string) || 'documento' // 'logo' o 'documento'

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const supabase = await createClient()

    // Validaciones según tipo de archivo
    if (type === 'logo') {
      // Validar tipo de archivo para logos
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Tipo de archivo no permitido. Use PNG, JPG o WEBP' },
          { status: 400 }
        )
      }

      // Validar tamaño
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'El archivo excede el tamaño máximo de 2MB' },
          { status: 400 }
        )
      }

      // Obtener extensión del archivo
      const extension = file.name.split('.').pop() || 'png'
      const fileName = `conjuntos/${conjuntoId}/logo.${extension}`

      // Convertir File a ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      // Subir a Supabase Storage (upsert sobrescribe si ya existe)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('conjuntos-logos')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('Error uploading to storage:', uploadError)
        
        // Mensajes de error más específicos
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist')) {
          return NextResponse.json(
            { 
              error: 'El bucket "conjuntos-logos" no existe. Por favor configura Supabase Storage.',
              details: uploadError.message 
            },
            { status: 500 }
          )
        }
        
        if (uploadError.message?.includes('permission') || uploadError.message?.includes('policy')) {
          return NextResponse.json(
            { 
              error: 'Sin permisos para subir archivos. Verifica las políticas RLS del bucket.',
              details: uploadError.message 
            },
            { status: 403 }
          )
        }
        
        return NextResponse.json(
          { 
            error: 'Error al subir archivo al storage',
            details: uploadError.message 
          },
          { status: 500 }
        )
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('conjuntos-logos')
        .getPublicUrl(fileName)

      const publicUrl = publicUrlData.publicUrl

      // Actualizar BD con la URL del logo
      const { error: updateError } = await supabase
        .from('conjuntos')
        .update({ logo_url: publicUrl })
        .eq('id', conjuntoId)

      if (updateError) {
        console.error('Error updating conjunto:', updateError)
        return NextResponse.json(
          { error: 'Error al actualizar conjunto' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Logo actualizado exitosamente',
        url: publicUrl,
        filename: file.name,
      })
    } else {
      // Upload genérico de documentos
      const folder = (formData.get('folder') as string) || 'documentos'
      const timestamp = Date.now()
      const safeFileName = file.name.replace(/[^\w.\-]/g, '_')
      const fileName = `${folder}/${conjuntoId}/${timestamp}-${safeFileName}`

      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      let { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Error uploading document:', uploadError)

        const isRlsError =
          uploadError.message?.toLowerCase().includes('row-level security') ||
          uploadError.message?.toLowerCase().includes('policy')

        if (isRlsError) {
          try {
            const adminClient = createAdminClient()
            const adminUpload = await adminClient.storage
              .from('documentos')
              .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
              })
            uploadData = adminUpload.data
            uploadError = adminUpload.error
          } catch (adminError) {
            console.error('Error uploading with admin client:', adminError)
          }
        }

        if (uploadError && isRlsError) {
          return NextResponse.json(
            {
              error: 'Error al subir documento por política de Storage',
              details:
                'Configura SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor o ajusta RLS en storage.objects para el bucket "documentos".',
            },
            { status: 500 }
          )
        }
        
        if (uploadError && (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist'))) {
          return NextResponse.json(
            { 
              error: 'El bucket "documentos" no existe. Por favor configura Supabase Storage.',
              details: uploadError.message 
            },
            { status: 500 }
          )
        }
        
        return NextResponse.json(
          {
            error: 'Error al subir documento',
            details: uploadError.message,
          },
          { status: 500 }
        )
      }

      const { data: publicUrlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName)

      return NextResponse.json({
        pathname: uploadData.path,
        url: publicUrlData.publicUrl,
        filename: file.name,
      })
    }
  } catch (error) {
    console.error('[upload] Error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}
