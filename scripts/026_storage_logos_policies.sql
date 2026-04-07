-- ============================================================
-- 026_storage_logos_policies.sql
-- Políticas RLS para el bucket "conjuntos-logos" en Supabase Storage
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Crear el bucket si no existe (público para lectura)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conjuntos-logos',
  'conjuntos-logos',
  true,
  2097152,  -- 2 MB
  ARRAY['image/png','image/jpeg','image/jpg','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/jpg','image/webp'];

-- 2. Limpiar políticas anteriores del bucket para empezar limpio
DELETE FROM storage.policies
WHERE bucket_id = 'conjuntos-logos';

-- ── Lectura pública ────────────────────────────────────────────────────
CREATE POLICY "logos_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'conjuntos-logos');

-- ── Subida: admin/superadmin de su propio conjunto ─────────────────────
-- El path esperado es: conjuntos/{conjunto_id}/logo.{ext}
CREATE POLICY "logos_admin_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'conjuntos-logos'
  AND (
    -- superadmin puede subir logos para cualquier conjunto
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol = 'superadmin'
    )
    OR
    -- admin/evaluador: solo para su propio conjunto_id
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.activo = true
        AND u.conjunto_id IS NOT NULL
        AND name LIKE 'conjuntos/' || u.conjunto_id::text || '/%'
    )
  )
);

-- ── Actualización (upsert = UPDATE + INSERT): misma regla ──────────────
CREATE POLICY "logos_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'conjuntos-logos'
  AND (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND activo = true AND rol = 'superadmin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.activo = true
        AND u.conjunto_id IS NOT NULL
        AND name LIKE 'conjuntos/' || u.conjunto_id::text || '/%'
    )
  )
);

-- ── Eliminación: admin/superadmin ─────────────────────────────────────
CREATE POLICY "logos_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'conjuntos-logos'
  AND (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND activo = true AND rol = 'superadmin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.activo = true
        AND u.conjunto_id IS NOT NULL
        AND name LIKE 'conjuntos/' || u.conjunto_id::text || '/%'
    )
  )
);

DO $$
BEGIN
  RAISE NOTICE '[026] Políticas RLS del bucket conjuntos-logos configuradas correctamente';
END $$;
