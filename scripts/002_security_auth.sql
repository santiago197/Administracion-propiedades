-- =====================================================
-- Sistema de Autenticación y Seguridad
-- Migración 002: Perfiles de Usuario y Roles
-- =====================================================

-- 1. TABLA: PERFILES DE USUARIO
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nombre_completo VARCHAR(255),
  rol VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (rol IN ('superadmin', 'admin', 'consejero')),
  conjunto_id UUID REFERENCES conjuntos(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_conjunto ON profiles(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_profiles_rol ON profiles(rol);

-- Habilitar RLS en profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "profiles_select_own" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Superadmin puede ver todos los perfiles
CREATE POLICY "profiles_select_superadmin" ON profiles 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.rol = 'superadmin'
    )
  );

-- Trigger para actualizar updated_at en profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. FUNCIÓN: Crear perfil automáticamente al registrarse
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre_completo, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre_completo', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'rol', 'admin')
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
-- Superadmin ve todos
CREATE POLICY "conjuntos_select_superadmin" ON conjuntos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'superadmin')
  );

-- Admin ve solo su conjunto
CREATE POLICY "conjuntos_select_admin" ON conjuntos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND rol = 'admin' 
      AND conjunto_id = conjuntos.id
    )
  );

-- Superadmin puede crear conjuntos
CREATE POLICY "conjuntos_insert_superadmin" ON conjuntos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'superadmin')
  );

-- Admin puede crear si no tiene conjunto asignado
CREATE POLICY "conjuntos_insert_admin" ON conjuntos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND rol = 'admin' 
      AND conjunto_id IS NULL
    )
  );

-- Actualizar: solo superadmin o admin de ese conjunto
CREATE POLICY "conjuntos_update" ON conjuntos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (rol = 'superadmin' OR (rol = 'admin' AND conjunto_id = conjuntos.id))
    )
  );

-- =====================================================
-- POLÍTICAS PARA PROCESOS
-- =====================================================
CREATE POLICY "procesos_select" ON procesos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.rol = 'superadmin' OR p.conjunto_id = procesos.conjunto_id)
    )
  );

CREATE POLICY "procesos_insert" ON procesos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.rol = 'superadmin' OR (p.rol = 'admin' AND p.conjunto_id = procesos.conjunto_id))
    )
  );

CREATE POLICY "procesos_update" ON procesos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.rol = 'superadmin' OR (p.rol = 'admin' AND p.conjunto_id = procesos.conjunto_id))
    )
  );

CREATE POLICY "procesos_delete" ON procesos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.rol = 'superadmin' OR (p.rol = 'admin' AND p.conjunto_id = procesos.conjunto_id))
    )
  );

-- =====================================================
-- POLÍTICAS PARA CONSEJEROS
-- =====================================================
CREATE POLICY "consejeros_select" ON consejeros
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.rol = 'superadmin' OR p.conjunto_id = consejeros.conjunto_id)
    )
  );

CREATE POLICY "consejeros_insert" ON consejeros
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.rol = 'superadmin' OR (p.rol = 'admin' AND p.conjunto_id = consejeros.conjunto_id))
    )
  );

CREATE POLICY "consejeros_update" ON consejeros
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.rol = 'superadmin' OR (p.rol = 'admin' AND p.conjunto_id = consejeros.conjunto_id))
    )
  );

CREATE POLICY "consejeros_delete" ON consejeros
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.rol = 'superadmin' OR (p.rol = 'admin' AND p.conjunto_id = consejeros.conjunto_id))
    )
  );

-- =====================================================
-- POLÍTICAS PARA PROPUESTAS
-- =====================================================
CREATE POLICY "propuestas_select" ON propuestas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND (p.rol = 'superadmin' OR pr.id = propuestas.proceso_id)
    )
  );

CREATE POLICY "propuestas_insert" ON propuestas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND p.rol IN ('superadmin', 'admin')
      AND pr.id = propuestas.proceso_id
    )
  );

CREATE POLICY "propuestas_update" ON propuestas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND p.rol IN ('superadmin', 'admin')
      AND pr.id = propuestas.proceso_id
    )
  );

CREATE POLICY "propuestas_delete" ON propuestas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND p.rol IN ('superadmin', 'admin')
      AND pr.id = propuestas.proceso_id
    )
  );

-- =====================================================
-- POLÍTICAS PARA DOCUMENTOS
-- =====================================================
CREATE POLICY "documentos_select" ON documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      JOIN propuestas prop ON prop.proceso_id = pr.id
      WHERE p.id = auth.uid() 
      AND prop.id = documentos.propuesta_id
    )
  );

CREATE POLICY "documentos_insert" ON documentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      JOIN propuestas prop ON prop.proceso_id = pr.id
      WHERE p.id = auth.uid() 
      AND p.rol IN ('superadmin', 'admin')
      AND prop.id = documentos.propuesta_id
    )
  );

CREATE POLICY "documentos_update" ON documentos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      JOIN propuestas prop ON prop.proceso_id = pr.id
      WHERE p.id = auth.uid() 
      AND p.rol IN ('superadmin', 'admin')
      AND prop.id = documentos.propuesta_id
    )
  );

CREATE POLICY "documentos_delete" ON documentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      JOIN propuestas prop ON prop.proceso_id = pr.id
      WHERE p.id = auth.uid() 
      AND p.rol IN ('superadmin', 'admin')
      AND prop.id = documentos.propuesta_id
    )
  );

-- =====================================================
-- POLÍTICAS PARA CRITERIOS
-- =====================================================
CREATE POLICY "criterios_select" ON criterios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND pr.id = criterios.proceso_id
    )
  );

CREATE POLICY "criterios_insert" ON criterios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND p.rol IN ('superadmin', 'admin')
      AND pr.id = criterios.proceso_id
    )
  );

CREATE POLICY "criterios_update" ON criterios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND p.rol IN ('superadmin', 'admin')
      AND pr.id = criterios.proceso_id
    )
  );

CREATE POLICY "criterios_delete" ON criterios
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND p.rol IN ('superadmin', 'admin')
      AND pr.id = criterios.proceso_id
    )
  );

-- =====================================================
-- POLÍTICAS PARA EVALUACIONES
-- =====================================================
CREATE POLICY "evaluaciones_select" ON evaluaciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND pr.id = evaluaciones.proceso_id
    )
  );

CREATE POLICY "evaluaciones_insert" ON evaluaciones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND pr.id = evaluaciones.proceso_id
    )
  );

CREATE POLICY "evaluaciones_update" ON evaluaciones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND pr.id = evaluaciones.proceso_id
    )
  );

-- =====================================================
-- POLÍTICAS PARA VOTOS
-- =====================================================
CREATE POLICY "votos_select" ON votos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND pr.id = votos.proceso_id
    )
  );

CREATE POLICY "votos_insert" ON votos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN procesos pr ON pr.conjunto_id = p.conjunto_id
      WHERE p.id = auth.uid() 
      AND pr.id = votos.proceso_id
    )
  );

-- =====================================================
-- POLÍTICAS PARA AUDIT_LOG
-- =====================================================
CREATE POLICY "audit_select" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (p.rol = 'superadmin' OR p.conjunto_id = audit_log.conjunto_id)
    )
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
  nombre_completo VARCHAR,
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
    p.nombre_completo,
    p.rol,
    p.conjunto_id,
    p.activo
  FROM profiles p
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
  UPDATE profiles
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
  SELECT rol INTO v_caller_rol FROM profiles WHERE id = auth.uid();
  
  IF v_caller_rol != 'superadmin' THEN
    RAISE EXCEPTION 'Solo superadmin puede asignar conjuntos';
  END IF;
  
  UPDATE profiles
  SET conjunto_id = p_conjunto_id
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;
