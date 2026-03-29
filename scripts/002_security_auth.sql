-- =====================================================
-- Sistema de Autenticación y Seguridad
-- Migración 002: Perfiles de Usuario y Roles
-- =====================================================

-- 1. TABLA: PERFILES DE USUARIO
-- 1. TABLA: USUARIOS (Sistema Multi-tenant)
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  rol VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (rol IN ('superadmin', 'admin', 'evaluador', 'consejero')),
  conjunto_id UUID REFERENCES conjuntos(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_conjunto ON usuarios(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- Habilitar RLS en usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCIONES HELPER (SECURITY DEFINER)
-- Ejecutan SIN RLS para evitar recursión infinita en
-- políticas que necesitan consultar la tabla usuarios.
-- =====================================================
CREATE OR REPLACE FUNCTION public.auth_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(rol, '') FROM public.usuarios WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.auth_conjunto_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conjunto_id FROM public.usuarios WHERE id = auth.uid()
$$;

-- Políticas para usuarios
DROP POLICY IF EXISTS "usuarios_select_own" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON usuarios;
DROP POLICY IF EXISTS "usuarios_select_superadmin" ON usuarios;

CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "usuarios_update_own" ON usuarios
  FOR UPDATE USING (auth.uid() = id);

-- Superadmin puede ver todos los usuarios.
-- Usa auth_rol() (SECURITY DEFINER) para evitar recursión infinita.
CREATE POLICY "usuarios_select_superadmin" ON usuarios
  FOR SELECT USING (public.auth_rol() = 'superadmin');

-- Trigger para actualizar updated_at en usuarios
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. FUNCIÓN: Crear usuario automáticamente al registrarse
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol, activo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'rol', 'admin'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 3. ACTUALIZAR POLÍTICAS RLS EXISTENTES
-- =====================================================

-- Eliminar políticas permisivas existentes
DROP POLICY IF EXISTS "allow_all_conjuntos" ON conjuntos;
DROP POLICY IF EXISTS "allow_all_procesos" ON procesos;
DROP POLICY IF EXISTS "allow_all_consejeros" ON consejeros;
DROP POLICY IF EXISTS "allow_all_propuestas" ON propuestas;
DROP POLICY IF EXISTS "allow_all_documentos" ON documentos;
DROP POLICY IF EXISTS "allow_all_criterios" ON criterios;
DROP POLICY IF EXISTS "allow_all_evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "allow_all_votos" ON votos;
DROP POLICY IF EXISTS "allow_all_audit" ON audit_log;

-- =====================================================
-- POLÍTICAS PARA CONJUNTOS
-- =====================================================
DROP POLICY IF EXISTS "conjuntos_select_superadmin" ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_select_admin" ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_insert_superadmin" ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_insert_admin" ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_update" ON conjuntos;

CREATE POLICY "conjuntos_select_superadmin" ON conjuntos
  FOR SELECT USING (public.auth_rol() = 'superadmin');

CREATE POLICY "conjuntos_select_admin" ON conjuntos
  FOR SELECT USING (
    public.auth_rol() = 'admin'
    AND (public.auth_conjunto_id() = conjuntos.id OR public.auth_conjunto_id() IS NULL)
  );

CREATE POLICY "conjuntos_insert_superadmin" ON conjuntos
  FOR INSERT WITH CHECK (public.auth_rol() = 'superadmin');

CREATE POLICY "conjuntos_insert_admin" ON conjuntos
  FOR INSERT WITH CHECK (
    public.auth_rol() = 'admin' AND public.auth_conjunto_id() IS NULL
  );

CREATE POLICY "conjuntos_update" ON conjuntos
  FOR UPDATE USING (
    public.auth_rol() = 'superadmin'
    OR (public.auth_rol() = 'admin' AND public.auth_conjunto_id() = conjuntos.id)
  );

-- =====================================================
-- POLÍTICAS PARA PROCESOS
-- =====================================================
DROP POLICY IF EXISTS "procesos_select" ON procesos;
DROP POLICY IF EXISTS "procesos_insert" ON procesos;
DROP POLICY IF EXISTS "procesos_update" ON procesos;
DROP POLICY IF EXISTS "procesos_delete" ON procesos;

CREATE POLICY "procesos_select" ON procesos
  FOR SELECT USING (
    public.auth_rol() = 'superadmin'
    OR public.auth_conjunto_id() = procesos.conjunto_id
  );

CREATE POLICY "procesos_insert" ON procesos
  FOR INSERT WITH CHECK (
    public.auth_rol() = 'superadmin'
    OR (public.auth_rol() = 'admin' AND public.auth_conjunto_id() = procesos.conjunto_id)
  );

CREATE POLICY "procesos_update" ON procesos
  FOR UPDATE USING (
    public.auth_rol() = 'superadmin'
    OR (public.auth_rol() = 'admin' AND public.auth_conjunto_id() = procesos.conjunto_id)
  );

CREATE POLICY "procesos_delete" ON procesos
  FOR DELETE USING (
    public.auth_rol() = 'superadmin'
    OR (public.auth_rol() = 'admin' AND public.auth_conjunto_id() = procesos.conjunto_id)
  );

-- =====================================================
-- POLÍTICAS PARA CONSEJEROS
-- =====================================================
DROP POLICY IF EXISTS "consejeros_select" ON consejeros;
DROP POLICY IF EXISTS "consejeros_insert" ON consejeros;
DROP POLICY IF EXISTS "consejeros_update" ON consejeros;
DROP POLICY IF EXISTS "consejeros_delete" ON consejeros;

CREATE POLICY "consejeros_select" ON consejeros
  FOR SELECT USING (
    public.auth_rol() = 'superadmin'
    OR public.auth_conjunto_id() = consejeros.conjunto_id
  );

CREATE POLICY "consejeros_insert" ON consejeros
  FOR INSERT WITH CHECK (
    public.auth_rol() = 'superadmin'
    OR (public.auth_rol() = 'admin' AND public.auth_conjunto_id() = consejeros.conjunto_id)
  );

CREATE POLICY "consejeros_update" ON consejeros
  FOR UPDATE USING (
    public.auth_rol() = 'superadmin'
    OR (public.auth_rol() = 'admin' AND public.auth_conjunto_id() = consejeros.conjunto_id)
  );

CREATE POLICY "consejeros_delete" ON consejeros
  FOR DELETE USING (
    public.auth_rol() = 'superadmin'
    OR (public.auth_rol() = 'admin' AND public.auth_conjunto_id() = consejeros.conjunto_id)
  );

-- =====================================================
-- POLÍTICAS PARA PROPUESTAS
-- =====================================================
DROP POLICY IF EXISTS "propuestas_select" ON propuestas;
DROP POLICY IF EXISTS "propuestas_insert" ON propuestas;
DROP POLICY IF EXISTS "propuestas_update" ON propuestas;
DROP POLICY IF EXISTS "propuestas_delete" ON propuestas;

CREATE POLICY "propuestas_select" ON propuestas
  FOR SELECT USING (
    public.auth_rol() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = propuestas.proceso_id
      AND pr.conjunto_id = public.auth_conjunto_id()
    )
  );

CREATE POLICY "propuestas_insert" ON propuestas
  FOR INSERT WITH CHECK (
    public.auth_rol() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = propuestas.proceso_id
      AND (public.auth_rol() = 'superadmin' OR pr.conjunto_id = public.auth_conjunto_id())
    )
  );

CREATE POLICY "propuestas_update" ON propuestas
  FOR UPDATE USING (
    public.auth_rol() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = propuestas.proceso_id
      AND (public.auth_rol() = 'superadmin' OR pr.conjunto_id = public.auth_conjunto_id())
    )
  );

CREATE POLICY "propuestas_delete" ON propuestas
  FOR DELETE USING (
    public.auth_rol() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = propuestas.proceso_id
      AND (public.auth_rol() = 'superadmin' OR pr.conjunto_id = public.auth_conjunto_id())
    )
  );

-- =====================================================
-- POLÍTICAS PARA DOCUMENTOS
-- =====================================================
DROP POLICY IF EXISTS "documentos_select" ON documentos;
DROP POLICY IF EXISTS "documentos_insert" ON documentos;
DROP POLICY IF EXISTS "documentos_update" ON documentos;
DROP POLICY IF EXISTS "documentos_delete" ON documentos;

CREATE POLICY "documentos_select" ON documentos
  FOR SELECT USING (
    public.auth_rol() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM propuestas prop
      JOIN procesos pr ON pr.id = prop.proceso_id
      WHERE prop.id = documentos.propuesta_id
      AND pr.conjunto_id = public.auth_conjunto_id()
    )
  );

CREATE POLICY "documentos_insert" ON documentos
  FOR INSERT WITH CHECK (
    public.auth_rol() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM propuestas prop
      JOIN procesos pr ON pr.id = prop.proceso_id
      WHERE prop.id = documentos.propuesta_id
      AND (public.auth_rol() = 'superadmin' OR pr.conjunto_id = public.auth_conjunto_id())
    )
  );

CREATE POLICY "documentos_update" ON documentos
  FOR UPDATE USING (
    public.auth_rol() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM propuestas prop
      JOIN procesos pr ON pr.id = prop.proceso_id
      WHERE prop.id = documentos.propuesta_id
      AND (public.auth_rol() = 'superadmin' OR pr.conjunto_id = public.auth_conjunto_id())
    )
  );

CREATE POLICY "documentos_delete" ON documentos
  FOR DELETE USING (
    public.auth_rol() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM propuestas prop
      JOIN procesos pr ON pr.id = prop.proceso_id
      WHERE prop.id = documentos.propuesta_id
      AND (public.auth_rol() = 'superadmin' OR pr.conjunto_id = public.auth_conjunto_id())
    )
  );

-- =====================================================
-- POLÍTICAS PARA CRITERIOS
-- =====================================================
DROP POLICY IF EXISTS "criterios_select" ON criterios;
DROP POLICY IF EXISTS "criterios_insert" ON criterios;
DROP POLICY IF EXISTS "criterios_update" ON criterios;
DROP POLICY IF EXISTS "criterios_delete" ON criterios;

CREATE POLICY "criterios_select" ON criterios
  FOR SELECT USING (
    public.auth_rol() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = criterios.proceso_id
      AND pr.conjunto_id = public.auth_conjunto_id()
    )
  );

CREATE POLICY "criterios_insert" ON criterios
  FOR INSERT WITH CHECK (
    public.auth_rol() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = criterios.proceso_id
      AND (public.auth_rol() = 'superadmin' OR pr.conjunto_id = public.auth_conjunto_id())
    )
  );

CREATE POLICY "criterios_update" ON criterios
  FOR UPDATE USING (
    public.auth_rol() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = criterios.proceso_id
      AND (public.auth_rol() = 'superadmin' OR pr.conjunto_id = public.auth_conjunto_id())
    )
  );

CREATE POLICY "criterios_delete" ON criterios
  FOR DELETE USING (
    public.auth_rol() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = criterios.proceso_id
      AND (public.auth_rol() = 'superadmin' OR pr.conjunto_id = public.auth_conjunto_id())
    )
  );

-- =====================================================
-- POLÍTICAS PARA EVALUACIONES
-- =====================================================
DROP POLICY IF EXISTS "evaluaciones_select" ON evaluaciones;
DROP POLICY IF EXISTS "evaluaciones_insert" ON evaluaciones;
DROP POLICY IF EXISTS "evaluaciones_update" ON evaluaciones;

CREATE POLICY "evaluaciones_select" ON evaluaciones
  FOR SELECT USING (
    public.auth_rol() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = evaluaciones.proceso_id
      AND pr.conjunto_id = public.auth_conjunto_id()
    )
  );

CREATE POLICY "evaluaciones_insert" ON evaluaciones
  FOR INSERT WITH CHECK (
    public.auth_rol() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = evaluaciones.proceso_id
      AND pr.conjunto_id = public.auth_conjunto_id()
    )
  );

CREATE POLICY "evaluaciones_update" ON evaluaciones
  FOR UPDATE USING (
    public.auth_rol() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = evaluaciones.proceso_id
      AND pr.conjunto_id = public.auth_conjunto_id()
    )
  );

-- =====================================================
-- POLÍTICAS PARA VOTOS
-- =====================================================
DROP POLICY IF EXISTS "votos_select" ON votos;
DROP POLICY IF EXISTS "votos_insert" ON votos;

CREATE POLICY "votos_select" ON votos
  FOR SELECT USING (
    public.auth_rol() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = votos.proceso_id
      AND pr.conjunto_id = public.auth_conjunto_id()
    )
  );

CREATE POLICY "votos_insert" ON votos
  FOR INSERT WITH CHECK (
    public.auth_rol() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = votos.proceso_id
      AND pr.conjunto_id = public.auth_conjunto_id()
    )
  );

-- =====================================================
-- POLÍTICAS PARA AUDIT_LOG
-- =====================================================
DROP POLICY IF EXISTS "audit_select" ON audit_log;
DROP POLICY IF EXISTS "audit_insert" ON audit_log;

CREATE POLICY "audit_select" ON audit_log
  FOR SELECT USING (
    public.auth_rol() = 'superadmin'
    OR public.auth_conjunto_id() = audit_log.conjunto_id
  );

CREATE POLICY "audit_insert" ON audit_log
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- =====================================================
-- 4. FUNCIÓN: Obtener perfil del usuario actual
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  nombre VARCHAR,
  rol VARCHAR,
  conjunto_id UUID,
  activo BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.nombre,
    p.rol,
    p.conjunto_id,
    p.activo
  FROM usuarios p
  WHERE p.id = auth.uid();
END;
$$;

-- =====================================================
-- 5. FUNCIÓN: Actualizar último acceso
-- =====================================================
CREATE OR REPLACE FUNCTION update_last_access()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usuarios
  SET ultimo_acceso = NOW()
  WHERE id = auth.uid();
END;
$$;

-- =====================================================
-- 6. FUNCIÓN: Asignar conjunto a usuario
-- =====================================================
CREATE OR REPLACE FUNCTION assign_conjunto_to_user(
  p_user_id UUID,
  p_conjunto_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_rol VARCHAR;
BEGIN
  -- Verificar que el llamador es superadmin
  SELECT rol INTO v_caller_rol FROM usuarios WHERE id = auth.uid();
  
  IF v_caller_rol != 'superadmin' THEN
    RAISE EXCEPTION 'Solo superadmin puede asignar conjuntos';
  END IF;
  
  UPDATE usuarios
  SET conjunto_id = p_conjunto_id
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- 7. GRANTS: permisos de ejecución para roles de Supabase
-- =====================================================
GRANT EXECUTE ON FUNCTION public.auth_rol() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.auth_conjunto_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_last_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_conjunto_to_user(UUID, UUID) TO authenticated;
