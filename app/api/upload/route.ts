import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'documentos'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Crear nombre con timestamp para evitar conflictos
    const timestamp = Date.now()
    const filename = `${folder}/${timestamp}-${file.name}`

    const blob = await put(filename, file, {
      access: 'private',
    })

    return NextResponse.json({
      pathname: blob.pathname,
      url: blob.url,
      filename: file.name,
    })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
