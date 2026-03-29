-- =====================================================
-- MIGRACIÓN 007: Tabla tipos_documento + RLS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla si no existe
CREATE TABLE IF NOT EXISTS tipos_documento (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        VARCHAR(50)  UNIQUE NOT NULL,
  nombre        VARCHAR(255) NOT NULL,
  categoria     VARCHAR(20)  NOT NULL CHECK (categoria IN ('legal', 'financiero', 'tecnico', 'referencia')),
  es_obligatorio BOOLEAN     DEFAULT true,
  tipo_persona  VARCHAR(20)  NOT NULL DEFAULT 'ambos' CHECK (tipo_persona IN ('juridica', 'natural', 'ambos')),
  dias_vigencia INTEGER      DEFAULT 365,
  activo        BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE tipos_documento ENABLE ROW LEVEL SECURITY;

-- 3. Políticas (DROP IF EXISTS para poder re-ejecutar sin errores)
DROP POLICY IF EXISTS "tipos_documento_select" ON tipos_documento;
DROP POLICY IF EXISTS "tipos_documento_insert" ON tipos_documento;
DROP POLICY IF EXISTS "tipos_documento_update" ON tipos_documento;
DROP POLICY IF EXISTS "tipos_documento_delete" ON tipos_documento;

-- Cualquier usuario autenticado puede leer
CREATE POLICY "tipos_documento_select" ON tipos_documento
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo admin y superadmin pueden crear
CREATE POLICY "tipos_documento_insert" ON tipos_documento
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol IN ('superadmin', 'admin')
        AND activo = true
    )
  );

-- Solo admin y superadmin pueden actualizar
CREATE POLICY "tipos_documento_update" ON tipos_documento
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol IN ('superadmin', 'admin')
        AND activo = true
    )
  );

-- Solo superadmin puede eliminar
CREATE POLICY "tipos_documento_delete" ON tipos_documento
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol = 'superadmin'
        AND activo = true
    )
  );

-- 4. Trigger updated_at
DROP TRIGGER IF EXISTS update_tipos_documento_updated_at ON tipos_documento;
CREATE TRIGGER update_tipos_documento_updated_at
  BEFORE UPDATE ON tipos_documento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
