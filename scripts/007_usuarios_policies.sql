-- =====================================================
-- Migración 007: Políticas adicionales para usuarios
-- Permite a admins ver/editar usuarios de su conjunto
-- =====================================================

-- Política para que admin pueda ver usuarios de su mismo conjunto
CREATE POLICY "usuarios_select_admin_conjunto" ON usuarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() 
      AND u.rol = 'admin' 
      AND u.conjunto_id = usuarios.conjunto_id
      AND u.conjunto_id IS NOT NULL
    )
  );

-- Política para que admin pueda actualizar usuarios de su conjunto (excepto el propio rol a superadmin)
CREATE POLICY "usuarios_update_admin_conjunto" ON usuarios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() 
      AND u.rol = 'admin' 
      AND u.conjunto_id = usuarios.conjunto_id
      AND u.conjunto_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- No puede cambiar a superadmin
    rol != 'superadmin'
    AND EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() 
      AND u.rol = 'admin' 
      AND u.conjunto_id = usuarios.conjunto_id
    )
  );

-- Superadmin puede actualizar cualquier usuario
CREATE POLICY "usuarios_update_superadmin" ON usuarios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'superadmin'
    )
  );

-- Superadmin puede eliminar usuarios
CREATE POLICY "usuarios_delete_superadmin" ON usuarios
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'superadmin'
    )
  );

-- Admin puede eliminar usuarios de su conjunto (excepto a sí mismo y superadmins)
CREATE POLICY "usuarios_delete_admin_conjunto" ON usuarios
  FOR DELETE USING (
    usuarios.id != auth.uid()
    AND usuarios.rol != 'superadmin'
    AND EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() 
      AND u.rol = 'admin' 
      AND u.conjunto_id = usuarios.conjunto_id
      AND u.conjunto_id IS NOT NULL
    )
  );
