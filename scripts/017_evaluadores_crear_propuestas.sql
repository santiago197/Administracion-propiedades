-- ============================================================
-- 017_evaluadores_crear_propuestas.sql
-- Permitir que los evaluadores creen propuestas, registrando
-- el usuario que las creó en el campo created_by.
-- ============================================================

-- Asegurar que la columna created_by existe
ALTER TABLE propuestas 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- Actualizar la política RLS para INSERT en propuestas
-- para permitir: superadmin, admin, Y evaluador
DROP POLICY IF EXISTS "propuestas_insert" ON propuestas;

CREATE POLICY "propuestas_insert" ON propuestas
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('superadmin', 'admin', 'evaluador')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = propuestas.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

-- Función trigger para auto-asignar created_by
CREATE OR REPLACE FUNCTION public.set_propuestas_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para auto-asignar created_by si no se proporciona
DROP TRIGGER IF EXISTS set_propuestas_created_by ON propuestas;

CREATE TRIGGER set_propuestas_created_by
BEFORE INSERT ON propuestas
FOR EACH ROW
EXECUTE FUNCTION public.set_propuestas_created_by();

-- Comentario de auditoría
COMMENT ON POLICY "propuestas_insert" ON propuestas IS 
  'Permite crear propuestas a superadmin, admin y evaluador del mismo conjunto. created_by se asigna automáticamente.';
