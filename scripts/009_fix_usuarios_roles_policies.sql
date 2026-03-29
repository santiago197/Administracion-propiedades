-- ============================================================
-- MIGRACIÓN 009: CORREGIR RECURSIÓN EN POLÍTICAS DE usuarios,
--                roles Y roles_permisos
-- ============================================================
--
-- PROBLEMA: 007_usuarios_policies.sql y 006_roles_permisos.sql
-- definen políticas con el patrón:
--
--   EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() ...)
--
-- Cuando Postgres evalúa una política ON usuarios que contiene
-- ese subquery, vuelve a evaluar las políticas de usuarios,
-- generando recursión infinita (código 42P17).
--
-- SOLUCIÓN: Reemplazar todos los subqueries sobre `usuarios`
-- con llamadas a auth_user_role() y auth_user_conjunto(),
-- que son SECURITY DEFINER y ejecutan sin RLS.
-- ============================================================

-- ============================================================
-- PARTE 1: TABLA usuarios
-- Eliminar las políticas recursivas de 007_usuarios_policies.sql
-- ============================================================

DROP POLICY IF EXISTS "usuarios_select_admin_conjunto"  ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_admin_conjunto"  ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_superadmin"      ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete_superadmin"      ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete_admin_conjunto"  ON usuarios;

-- Admin ve usuarios de su mismo conjunto
CREATE POLICY "usuarios_select_admin_conjunto" ON usuarios
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND auth_user_conjunto() = usuarios.conjunto_id
    AND usuarios.conjunto_id IS NOT NULL
  );

-- Admin actualiza usuarios de su conjunto (no puede escalar a superadmin)
CREATE POLICY "usuarios_update_admin_conjunto" ON usuarios
  FOR UPDATE USING (
    auth_user_role() = 'admin'
    AND auth_user_conjunto() = usuarios.conjunto_id
    AND usuarios.conjunto_id IS NOT NULL
  )
  WITH CHECK (
    rol != 'superadmin'
    AND auth_user_role() = 'admin'
    AND auth_user_conjunto() = usuarios.conjunto_id
  );

-- Superadmin actualiza cualquier usuario
CREATE POLICY "usuarios_update_superadmin" ON usuarios
  FOR UPDATE USING (auth_user_role() = 'superadmin');

-- Superadmin elimina usuarios
CREATE POLICY "usuarios_delete_superadmin" ON usuarios
  FOR DELETE USING (auth_user_role() = 'superadmin');

-- Admin elimina usuarios de su conjunto (no a sí mismo ni superadmins)
CREATE POLICY "usuarios_delete_admin_conjunto" ON usuarios
  FOR DELETE USING (
    usuarios.id != auth.uid()
    AND usuarios.rol != 'superadmin'
    AND auth_user_role() = 'admin'
    AND auth_user_conjunto() = usuarios.conjunto_id
    AND usuarios.conjunto_id IS NOT NULL
  );

DO $$
BEGIN
  RAISE NOTICE '[009] Políticas de usuarios corregidas (sin recursión).';
END $$;

-- ============================================================
-- PARTE 2: TABLA roles
-- Reemplazar EXISTS (SELECT 1 FROM usuarios ...) con funciones helper
-- ============================================================

DROP POLICY IF EXISTS "roles_select"  ON roles;
DROP POLICY IF EXISTS "roles_insert"  ON roles;
DROP POLICY IF EXISTS "roles_update"  ON roles;
DROP POLICY IF EXISTS "roles_delete"  ON roles;

-- Cualquier usuario autenticado ve los roles de sistema o de su conjunto
CREATE POLICY "roles_select" ON roles
  FOR SELECT USING (
    es_sistema = true
    OR conjunto_id IS NULL
    OR auth_user_role() = 'superadmin'
    OR auth_user_conjunto() = roles.conjunto_id
  );

CREATE POLICY "roles_insert" ON roles
  FOR INSERT WITH CHECK (
    auth_user_role() = 'superadmin'
    OR (auth_user_role() = 'admin' AND auth_user_conjunto() = roles.conjunto_id)
  );

CREATE POLICY "roles_update" ON roles
  FOR UPDATE USING (
    es_sistema = false
    AND (
      auth_user_role() = 'superadmin'
      OR (auth_user_role() = 'admin' AND auth_user_conjunto() = roles.conjunto_id)
    )
  );

CREATE POLICY "roles_delete" ON roles
  FOR DELETE USING (
    es_sistema = false
    AND (
      auth_user_role() = 'superadmin'
      OR (auth_user_role() = 'admin' AND auth_user_conjunto() = roles.conjunto_id)
    )
  );

DO $$
BEGIN
  RAISE NOTICE '[009] Políticas de roles corregidas.';
END $$;

-- ============================================================
-- PARTE 3: TABLA roles_permisos
-- ============================================================

DROP POLICY IF EXISTS "roles_permisos_select" ON roles_permisos;
DROP POLICY IF EXISTS "roles_permisos_insert" ON roles_permisos;
DROP POLICY IF EXISTS "roles_permisos_delete" ON roles_permisos;

CREATE POLICY "roles_permisos_select" ON roles_permisos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = roles_permisos.rol_id
        AND (
          r.es_sistema = true
          OR r.conjunto_id IS NULL
          OR auth_user_role() = 'superadmin'
          OR auth_user_conjunto() = r.conjunto_id
        )
    )
  );

CREATE POLICY "roles_permisos_insert" ON roles_permisos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = roles_permisos.rol_id
        AND r.es_sistema = false
        AND (
          auth_user_role() = 'superadmin'
          OR (auth_user_role() = 'admin' AND auth_user_conjunto() = r.conjunto_id)
        )
    )
  );

CREATE POLICY "roles_permisos_delete" ON roles_permisos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = roles_permisos.rol_id
        AND r.es_sistema = false
        AND (
          auth_user_role() = 'superadmin'
          OR (auth_user_role() = 'admin' AND auth_user_conjunto() = r.conjunto_id)
        )
    )
  );

DO $$
BEGIN
  RAISE NOTICE '[009] Políticas de roles_permisos corregidas.';
END $$;

-- ============================================================
-- FIN
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '[009] Migración completada. Error 42P17 (infinite recursion) resuelto.';
END $$;
