-- ============================================================
-- MIGRACIÓN 011: Asignación de permisos por usuario
-- ============================================================

-- 1. TABLA: usuarios_permisos
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, permiso_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_permisos_usuario ON usuarios_permisos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_permisos_permiso ON usuarios_permisos(permiso_id);

-- 2. RLS
-- ============================================================
ALTER TABLE usuarios_permisos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_permisos_select" ON usuarios_permisos;
DROP POLICY IF EXISTS "usuarios_permisos_insert" ON usuarios_permisos;
DROP POLICY IF EXISTS "usuarios_permisos_delete" ON usuarios_permisos;

-- Superadmin puede ver todo. Admin solo usuarios de su conjunto.
CREATE POLICY "usuarios_permisos_select" ON usuarios_permisos
  FOR SELECT USING (
    public.auth_rol() = 'superadmin'
    OR (
      public.auth_rol() = 'admin'
      AND EXISTS (
        SELECT 1 FROM usuarios u
        WHERE u.id = usuarios_permisos.usuario_id
          AND u.conjunto_id = public.auth_conjunto_id()
      )
    )
  );

-- Admin puede asignar permisos a usuarios de su conjunto (no superadmin).
CREATE POLICY "usuarios_permisos_insert" ON usuarios_permisos
  FOR INSERT WITH CHECK (
    public.auth_rol() = 'superadmin'
    OR (
      public.auth_rol() = 'admin'
      AND EXISTS (
        SELECT 1 FROM usuarios u
        WHERE u.id = usuarios_permisos.usuario_id
          AND u.conjunto_id = public.auth_conjunto_id()
          AND u.rol != 'superadmin'
      )
    )
  );

CREATE POLICY "usuarios_permisos_delete" ON usuarios_permisos
  FOR DELETE USING (
    public.auth_rol() = 'superadmin'
    OR (
      public.auth_rol() = 'admin'
      AND EXISTS (
        SELECT 1 FROM usuarios u
        WHERE u.id = usuarios_permisos.usuario_id
          AND u.conjunto_id = public.auth_conjunto_id()
          AND u.rol != 'superadmin'
      )
    )
  );

DO $$
BEGIN
  RAISE NOTICE '[011] Tabla usuarios_permisos creada y políticas aplicadas.';
END $$;
