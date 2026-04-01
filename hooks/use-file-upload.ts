'use client'

import { useState } from 'react'

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File, folder: string = 'documentos') => {
    setUploading(true)
    setError(null)

    try {
      // 1. Obtener URL pre-firmada
      const urlRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: file.name, tipo_mime: file.type, tamanio: file.size, carpeta: folder }),
      })
      if (!urlRes.ok) {
        const body = await urlRes.json()
        throw new Error(body.error || 'Error al obtener URL de subida')
      }
      const { signed_url, path, url } = await urlRes.json()

      // 2. Subir directamente a Storage (no pasa por Vercel)
      const storageRes = await fetch(signed_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!storageRes.ok) throw new Error('Error al subir archivo al storage')

      return { url, pathname: path }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      throw err
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, error }
}
