-- ============================================================
-- 002_auth_rls.sql
-- Funciones SECURITY DEFINER + trigger de auth + RLS completo.
-- Sin recursión: las políticas de `usuarios` NUNCA consultan
-- `usuarios` directamente; usan las funciones helper.
-- Ejecutar DESPUÉS de 001_schema.sql.
-- ============================================================

-- ============================================================
-- FUNCIONES HELPER (SECURITY DEFINER)
-- Se ejecutan como el dueño de la función → bypasean RLS en
-- `usuarios`. Rompen el ciclo de recursión infinita.
-- ============================================================
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_user_conjunto()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conjunto_id FROM usuarios WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION auth_user_role()    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth_user_conjunto() TO authenticated, anon;

-- ============================================================
-- FUNCIÓN: Crear fila en usuarios al registrarse en Supabase Auth
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCIÓN: Perfil del usuario actual (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
  id          UUID,
  email       VARCHAR,
  nombre      VARCHAR,
  rol         VARCHAR,
  conjunto_id UUID,
  activo      BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT u.id, u.email, u.nombre, u.rol, u.conjunto_id, u.activo
    FROM usuarios u
    WHERE u.id = auth.uid();
END;
$$;

-- ============================================================
-- FUNCIÓN: Actualizar último acceso
-- ============================================================
CREATE OR REPLACE FUNCTION update_last_access()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = auth.uid();
END;
$$;

-- ============================================================
-- FUNCIÓN: Asignar conjunto a usuario (solo superadmin)
-- ============================================================
CREATE OR REPLACE FUNCTION assign_conjunto_to_user(
  p_user_id    UUID,
  p_conjunto_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth_user_role() != 'superadmin' THEN
    RAISE EXCEPTION 'Solo superadmin puede asignar conjuntos';
  END IF;
  UPDATE usuarios SET conjunto_id = p_conjunto_id WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_profile()                 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_last_access()                       TO authenticated;
GRANT EXECUTE ON FUNCTION assign_conjunto_to_user(UUID, UUID)        TO authenticated;

-- ============================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================
ALTER TABLE usuarios                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE conjuntos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE procesos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE consejeros                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_documento             ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuestas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE criterios                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones_admin          ENABLE ROW LEVEL SECURITY;
ALTER TABLE puntajes_criterio           ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones                ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuesta_rut_datos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_estados_propuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE transiciones_estado         ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_permisos              ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: USUARIOS
-- IMPORTANTE: Estas políticas NUNCA hacen EXISTS/SELECT sobre
-- `usuarios` para evitar recursión infinita (error 42P17).
-- Solo usan auth.uid() directo o funciones SECURITY DEFINER.
-- ============================================================
DROP POLICY IF EXISTS "usuarios_select_own"              ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_own"              ON usuarios;
DROP POLICY IF EXISTS "usuarios_select_superadmin"       ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_superadmin"       ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete_superadmin"       ON usuarios;
DROP POLICY IF EXISTS "usuarios_select_admin_conjunto"   ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_admin_conjunto"   ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete_admin_conjunto"   ON usuarios;

-- Cualquier usuario autenticado puede leer y editar su propia fila
CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "usuarios_update_own" ON usuarios
  FOR UPDATE USING (auth.uid() = id);

-- Superadmin: acceso total a todos los usuarios
CREATE POLICY "usuarios_select_superadmin" ON usuarios
  FOR SELECT USING (auth_user_role() = 'superadmin');

CREATE POLICY "usuarios_update_superadmin" ON usuarios
  FOR UPDATE USING (auth_user_role() = 'superadmin');

CREATE POLICY "usuarios_delete_superadmin" ON usuarios
  FOR DELETE USING (auth_user_role() = 'superadmin');

-- Admin: ve y edita usuarios de su mismo conjunto
CREATE POLICY "usuarios_select_admin_conjunto" ON usuarios
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND auth_user_conjunto() = usuarios.conjunto_id
    AND usuarios.conjunto_id IS NOT NULL
  );

CREATE POLICY "usuarios_update_admin_conjunto" ON usuarios
  FOR UPDATE
  USING (
    auth_user_role() = 'admin'
    AND auth_user_conjunto() = usuarios.conjunto_id
    AND usuarios.conjunto_id IS NOT NULL
  )
  WITH CHECK (
    rol != 'superadmin'
    AND auth_user_role() = 'admin'
    AND auth_user_conjunto() = usuarios.conjunto_id
  );

CREATE POLICY "usuarios_delete_admin_conjunto" ON usuarios
  FOR DELETE USING (
    usuarios.id != auth.uid()
    AND usuarios.rol != 'superadmin'
    AND auth_user_role() = 'admin'
    AND auth_user_conjunto() = usuarios.conjunto_id
    AND usuarios.conjunto_id IS NOT NULL
  );

-- ============================================================
-- RLS: CONJUNTOS
-- ============================================================
DROP POLICY IF EXISTS "conjuntos_select_superadmin" ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_select_auth"       ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_insert_superadmin" ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_insert_admin"      ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_update"            ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_delete"            ON conjuntos;

CREATE POLICY "conjuntos_select_superadmin" ON conjuntos
  FOR SELECT USING (auth_user_role() = 'superadmin');

-- Admin/evaluador ve su conjunto; admin sin conjunto asignado ve todos
-- (caso de onboarding: el admin aún no tiene conjunto)
CREATE POLICY "conjuntos_select_auth" ON conjuntos
  FOR SELECT USING (
    auth_user_conjunto() = conjuntos.id
    OR (auth_user_role() = 'admin' AND auth_user_conjunto() IS NULL)
  );

CREATE POLICY "conjuntos_insert_superadmin" ON conjuntos
  FOR INSERT WITH CHECK (auth_user_role() = 'superadmin');

CREATE POLICY "conjuntos_insert_admin" ON conjuntos
  FOR INSERT WITH CHECK (
    auth_user_role() = 'admin'
    AND auth_user_conjunto() IS NULL
  );

CREATE POLICY "conjuntos_update" ON conjuntos
  FOR UPDATE USING (
    auth_user_role() = 'superadmin'
    OR (auth_user_role() = 'admin' AND auth_user_conjunto() = conjuntos.id)
  );

CREATE POLICY "conjuntos_delete" ON conjuntos
  FOR DELETE USING (auth_user_role() = 'superadmin');

-- ============================================================
-- RLS: PROCESOS
-- ============================================================
DROP POLICY IF EXISTS "procesos_select" ON procesos;
DROP POLICY IF EXISTS "procesos_insert" ON procesos;
DROP POLICY IF EXISTS "procesos_update" ON procesos;
DROP POLICY IF EXISTS "procesos_delete" ON procesos;

CREATE POLICY "procesos_select" ON procesos
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR auth_user_conjunto() = procesos.conjunto_id
  );

CREATE POLICY "procesos_insert" ON procesos
  FOR INSERT WITH CHECK (
    auth_user_role() = 'superadmin'
    OR (auth_user_role() = 'admin' AND auth_user_conjunto() = procesos.conjunto_id)
  );

CREATE POLICY "procesos_update" ON procesos
  FOR UPDATE USING (
    auth_user_role() = 'superadmin'
    OR (auth_user_role() = 'admin' AND auth_user_conjunto() = procesos.conjunto_id)
  );

CREATE POLICY "procesos_delete" ON procesos
  FOR DELETE USING (
    auth_user_role() = 'superadmin'
    OR (auth_user_role() = 'admin' AND auth_user_conjunto() = procesos.conjunto_id)
  );

-- ============================================================
-- RLS: CONSEJEROS
-- ============================================================
DROP POLICY IF EXISTS "consejeros_select" ON consejeros;
DROP POLICY IF EXISTS "consejeros_insert" ON consejeros;
DROP POLICY IF EXISTS "consejeros_update" ON consejeros;
DROP POLICY IF EXISTS "consejeros_delete" ON consejeros;

CREATE POLICY "consejeros_select" ON consejeros
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR auth_user_conjunto() = consejeros.conjunto_id
  );

CREATE POLICY "consejeros_insert" ON consejeros
  FOR INSERT WITH CHECK (
    auth_user_role() = 'superadmin'
    OR (auth_user_role() = 'admin' AND auth_user_conjunto() = consejeros.conjunto_id)
  );

CREATE POLICY "consejeros_update" ON consejeros
  FOR UPDATE USING (
    auth_user_role() = 'superadmin'
    OR (auth_user_role() = 'admin' AND auth_user_conjunto() = consejeros.conjunto_id)
  );

CREATE POLICY "consejeros_delete" ON consejeros
  FOR DELETE USING (
    auth_user_role() = 'superadmin'
    OR (auth_user_role() = 'admin' AND auth_user_conjunto() = consejeros.conjunto_id)
  );

-- ============================================================
-- RLS: TIPOS_DOCUMENTO
-- ============================================================
DROP POLICY IF EXISTS "tipos_documento_select"             ON tipos_documento;
DROP POLICY IF EXISTS "tipos_documento_insert"             ON tipos_documento;
DROP POLICY IF EXISTS "tipos_documento_update"             ON tipos_documento;
DROP POLICY IF EXISTS "tipos_documento_delete"             ON tipos_documento;
DROP POLICY IF EXISTS "tipos_documento_read_authenticated" ON tipos_documento;
DROP POLICY IF EXISTS "tipos_documento_write_admin"        ON tipos_documento;

CREATE POLICY "tipos_documento_select" ON tipos_documento
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tipos_documento_insert" ON tipos_documento
  FOR INSERT WITH CHECK (auth_user_role() IN ('superadmin', 'admin'));

CREATE POLICY "tipos_documento_update" ON tipos_documento
  FOR UPDATE USING (auth_user_role() IN ('superadmin', 'admin'));

CREATE POLICY "tipos_documento_delete" ON tipos_documento
  FOR DELETE USING (auth_user_role() = 'superadmin');

-- ============================================================
-- RLS: PROPUESTAS
-- ============================================================
DROP POLICY IF EXISTS "propuestas_select" ON propuestas;
DROP POLICY IF EXISTS "propuestas_insert" ON propuestas;
DROP POLICY IF EXISTS "propuestas_update" ON propuestas;
DROP POLICY IF EXISTS "propuestas_delete" ON propuestas;

CREATE POLICY "propuestas_select" ON propuestas
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = propuestas.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "propuestas_insert" ON propuestas
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('superadmin', 'admin')
    AND (
      auth_user_role() = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM procesos pr
        WHERE pr.id = propuestas.proceso_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

CREATE POLICY "propuestas_update" ON propuestas
  FOR UPDATE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND (
      auth_user_role() = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM procesos pr
        WHERE pr.id = propuestas.proceso_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

CREATE POLICY "propuestas_delete" ON propuestas
  FOR DELETE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND (
      auth_user_role() = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM procesos pr
        WHERE pr.id = propuestas.proceso_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

-- ============================================================
-- RLS: DOCUMENTOS
-- ============================================================
DROP POLICY IF EXISTS "documentos_select" ON documentos;
DROP POLICY IF EXISTS "documentos_insert" ON documentos;
DROP POLICY IF EXISTS "documentos_update" ON documentos;
DROP POLICY IF EXISTS "documentos_delete" ON documentos;

CREATE POLICY "documentos_select" ON documentos
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      WHERE p.id = documentos.propuesta_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "documentos_insert" ON documentos
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('superadmin', 'admin')
    AND (
      auth_user_role() = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM propuestas p
        JOIN procesos pr ON pr.id = p.proceso_id
        WHERE p.id = documentos.propuesta_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

CREATE POLICY "documentos_update" ON documentos
  FOR UPDATE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND (
      auth_user_role() = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM propuestas p
        JOIN procesos pr ON pr.id = p.proceso_id
        WHERE p.id = documentos.propuesta_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

CREATE POLICY "documentos_delete" ON documentos
  FOR DELETE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND (
      auth_user_role() = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM propuestas p
        JOIN procesos pr ON pr.id = p.proceso_id
        WHERE p.id = documentos.propuesta_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

-- ============================================================
-- RLS: CRITERIOS
-- ============================================================
DROP POLICY IF EXISTS "criterios_select" ON criterios;
DROP POLICY IF EXISTS "criterios_insert" ON criterios;
DROP POLICY IF EXISTS "criterios_update" ON criterios;
DROP POLICY IF EXISTS "criterios_delete" ON criterios;

CREATE POLICY "criterios_select" ON criterios
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = criterios.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "criterios_insert" ON criterios
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('superadmin', 'admin')
    AND (
      auth_user_role() = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM procesos pr
        WHERE pr.id = criterios.proceso_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

CREATE POLICY "criterios_update" ON criterios
  FOR UPDATE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND (
      auth_user_role() = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM procesos pr
        WHERE pr.id = criterios.proceso_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

CREATE POLICY "criterios_delete" ON criterios
  FOR DELETE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND (
      auth_user_role() = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM procesos pr
        WHERE pr.id = criterios.proceso_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

-- ============================================================
-- RLS: EVALUACIONES_ADMIN
-- ============================================================
DROP POLICY IF EXISTS "evaluaciones_admin_select" ON evaluaciones_admin;
DROP POLICY IF EXISTS "evaluaciones_admin_insert" ON evaluaciones_admin;
DROP POLICY IF EXISTS "evaluaciones_admin_update" ON evaluaciones_admin;

CREATE POLICY "evaluaciones_admin_select" ON evaluaciones_admin
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      WHERE p.id = evaluaciones_admin.propuesta_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "evaluaciones_admin_insert" ON evaluaciones_admin
  FOR INSERT WITH CHECK (
    auth_user_role() IN ('superadmin', 'admin', 'evaluador')
    AND (
      auth_user_role() = 'superadmin'
      OR EXISTS (
        SELECT 1 FROM propuestas p
        JOIN procesos pr ON pr.id = p.proceso_id
        WHERE p.id = evaluaciones_admin.propuesta_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

CREATE POLICY "evaluaciones_admin_update" ON evaluaciones_admin
  FOR UPDATE USING (
    auth_user_role() = 'superadmin'
    OR (
      evaluaciones_admin.evaluador_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM propuestas p
        JOIN procesos pr ON pr.id = p.proceso_id
        WHERE p.id = evaluaciones_admin.propuesta_id
          AND pr.conjunto_id = auth_user_conjunto()
      )
    )
  );

-- ============================================================
-- RLS: PUNTAJES_CRITERIO
-- ============================================================
DROP POLICY IF EXISTS "puntajes_criterio_select" ON puntajes_criterio;
DROP POLICY IF EXISTS "puntajes_criterio_insert" ON puntajes_criterio;
DROP POLICY IF EXISTS "puntajes_criterio_delete" ON puntajes_criterio;

CREATE POLICY "puntajes_criterio_select" ON puntajes_criterio
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM evaluaciones_admin ea
      JOIN propuestas p  ON p.id  = ea.propuesta_id
      JOIN procesos   pr ON pr.id = p.proceso_id
      WHERE ea.id = puntajes_criterio.evaluacion_id
        AND (auth_user_role() = 'superadmin' OR pr.conjunto_id = auth_user_conjunto())
    )
  );

CREATE POLICY "puntajes_criterio_insert" ON puntajes_criterio
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluaciones_admin ea
      JOIN propuestas p  ON p.id  = ea.propuesta_id
      JOIN procesos   pr ON pr.id = p.proceso_id
      WHERE ea.id = puntajes_criterio.evaluacion_id
        AND ea.evaluador_id = auth.uid()
        AND (auth_user_role() = 'superadmin' OR pr.conjunto_id = auth_user_conjunto())
    )
  );

CREATE POLICY "puntajes_criterio_delete" ON puntajes_criterio
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM evaluaciones_admin ea
      JOIN propuestas p  ON p.id  = ea.propuesta_id
      JOIN procesos   pr ON pr.id = p.proceso_id
      WHERE ea.id = puntajes_criterio.evaluacion_id
        AND (
          auth_user_role() = 'superadmin'
          OR (ea.evaluador_id = auth.uid() AND pr.conjunto_id = auth_user_conjunto())
        )
    )
  );

-- ============================================================
-- RLS: EVALUACIONES (de consejeros)
-- ============================================================
DROP POLICY IF EXISTS "evaluaciones_select" ON evaluaciones;
DROP POLICY IF EXISTS "evaluaciones_insert" ON evaluaciones;
DROP POLICY IF EXISTS "evaluaciones_update" ON evaluaciones;

CREATE POLICY "evaluaciones_select" ON evaluaciones
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = evaluaciones.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "evaluaciones_insert" ON evaluaciones
  FOR INSERT WITH CHECK (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = evaluaciones.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "evaluaciones_update" ON evaluaciones
  FOR UPDATE USING (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = evaluaciones.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

-- ============================================================
-- RLS: VOTOS
-- ============================================================
DROP POLICY IF EXISTS "votos_select" ON votos;
DROP POLICY IF EXISTS "votos_insert" ON votos;

CREATE POLICY "votos_select" ON votos
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = votos.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "votos_insert" ON votos
  FOR INSERT WITH CHECK (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = votos.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

-- ============================================================
-- RLS: AUDIT_LOG
-- ============================================================
DROP POLICY IF EXISTS "audit_select" ON audit_log;
DROP POLICY IF EXISTS "audit_insert" ON audit_log;

CREATE POLICY "audit_select" ON audit_log
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR auth_user_conjunto() = audit_log.conjunto_id
  );

CREATE POLICY "audit_insert" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS: PROPUESTA_RUT_DATOS
-- ============================================================
DROP POLICY IF EXISTS "rut_datos_select"               ON propuesta_rut_datos;
DROP POLICY IF EXISTS "rut_datos_insert"               ON propuesta_rut_datos;
DROP POLICY IF EXISTS "rut_datos_update"               ON propuesta_rut_datos;
DROP POLICY IF EXISTS "rut_datos_select_mismo_conjunto" ON propuesta_rut_datos;
DROP POLICY IF EXISTS "rut_datos_insert_mismo_conjunto" ON propuesta_rut_datos;
DROP POLICY IF EXISTS "rut_datos_update_mismo_conjunto" ON propuesta_rut_datos;
DROP POLICY IF EXISTS "rut_datos_superadmin"            ON propuesta_rut_datos;

CREATE POLICY "rut_datos_select" ON propuesta_rut_datos
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      WHERE p.id = propuesta_rut_datos.propuesta_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "rut_datos_insert" ON propuesta_rut_datos
  FOR INSERT WITH CHECK (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      WHERE p.id = propuesta_rut_datos.propuesta_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "rut_datos_update" ON propuesta_rut_datos
  FOR UPDATE USING (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      WHERE p.id = propuesta_rut_datos.propuesta_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

-- ============================================================
-- RLS: HISTORIAL_ESTADOS_PROPUESTA
-- ============================================================
DROP POLICY IF EXISTS "historial_select"             ON historial_estados_propuesta;
DROP POLICY IF EXISTS "historial_insert"             ON historial_estados_propuesta;
DROP POLICY IF EXISTS "allow_all_historial_estados"  ON historial_estados_propuesta;

CREATE POLICY "historial_select" ON historial_estados_propuesta
  FOR SELECT USING (
    auth_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      WHERE p.id = historial_estados_propuesta.propuesta_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "historial_insert" ON historial_estados_propuesta
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS: TRANSICIONES_ESTADO (solo lectura para autenticados)
-- ============================================================
DROP POLICY IF EXISTS "transiciones_select" ON transiciones_estado;

CREATE POLICY "transiciones_select" ON transiciones_estado
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS: PERMISOS (lectura para todos los autenticados)
-- ============================================================
DROP POLICY IF EXISTS "permisos_select_all" ON permisos;
DROP POLICY IF EXISTS "permisos_insert"     ON permisos;
DROP POLICY IF EXISTS "permisos_update"     ON permisos;
DROP POLICY IF EXISTS "permisos_delete"     ON permisos;

CREATE POLICY "permisos_select_all" ON permisos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "permisos_insert" ON permisos
  FOR INSERT WITH CHECK (auth_user_role() = 'superadmin');

CREATE POLICY "permisos_update" ON permisos
  FOR UPDATE USING (auth_user_role() = 'superadmin');

CREATE POLICY "permisos_delete" ON permisos
  FOR DELETE USING (auth_user_role() = 'superadmin');

-- ============================================================
-- RLS: ROLES
-- ============================================================
DROP POLICY IF EXISTS "roles_select" ON roles;
DROP POLICY IF EXISTS "roles_insert" ON roles;
DROP POLICY IF EXISTS "roles_update" ON roles;
DROP POLICY IF EXISTS "roles_delete" ON roles;

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

-- ============================================================
-- RLS: ROLES_PERMISOS
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

-- Recargar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
