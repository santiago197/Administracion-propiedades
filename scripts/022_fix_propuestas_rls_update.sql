-- ============================================================
-- 022_fix_propuestas_rls_update.sql
-- Corregir la política UPDATE para propuestas
-- El AND EXISTS debe estar al final aplicando a TODOS los roles
-- ============================================================

-- Reescribir la política RLS para UPDATE en propuestas con lógica correcta
DROP POLICY IF EXISTS "propuestas_update" ON propuestas;

CREATE POLICY "propuestas_update" ON propuestas
  FOR UPDATE USING (
    (
      auth_user_role() IN ('superadmin', 'admin')
      OR (
        auth_user_role() = 'evaluador'
        AND created_by = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = propuestas.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

COMMENT ON POLICY "propuestas_update" ON propuestas IS 
  'Admin/superadmin pueden editar cualquier propuesta. Evaluador solo la suya (created_by). Ambos deben estar en el mismo conjunto.';
