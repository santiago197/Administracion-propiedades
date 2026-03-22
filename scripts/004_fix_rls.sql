-- ============================================================
-- MIGRACIÓN 004: CORRECCIÓN DE POLÍTICAS RLS RECURSIVAS
-- Sistema de Selección de Administradores PH — Ley 675
-- ============================================================
--
-- PROBLEMA: La política "usuarios_select_superadmin" definida en
-- 002_security_auth.sql es RECURSIVA:
--
--   CREATE POLICY "usuarios_select_superadmin" ON usuarios
--     FOR SELECT USING (
--       EXISTS (SELECT 1 FROM usuarios p WHERE p.id = auth.uid() ...)
--     );
--
-- Cuando cualquier consulta evalúa una política RLS que hace
-- EXISTS (SELECT 1 FROM usuarios ...), PostgreSQL evalúa a su vez
-- las políticas de la tabla `usuarios`. La política
-- usuarios_select_superadmin vuelve a hacer SELECT sobre `usuarios`,
-- y así sucesivamente hasta agotar el stack:
--
--   ERROR: stack depth limit exceeded
--
-- Este error se propaga como error 500 en todos los endpoints que
-- acceden a tablas protegidas por RLS (conjuntos, procesos, etc.).
--
-- SOLUCIÓN: Crear funciones auxiliares con SECURITY DEFINER que
-- consultan `usuarios` sin disparar RLS, y reemplazar todas las
-- políticas que usaban el patrón EXISTS en tablas relacionadas.
--
-- Este script es idempotente: usa CREATE OR REPLACE y DROP IF EXISTS.
-- ============================================================

-- ============================================================
-- PASO 1: FUNCIONES AUXILIARES (SECURITY DEFINER)
-- Ejecutan como el dueño de la función → bypasean RLS en `usuarios`.
-- Retornan NULL si el usuario no tiene fila en `usuarios`.
-- ============================================================

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_user_conjunto()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT conjunto_id FROM usuarios WHERE id = auth.uid();
$$;

DO $$
BEGIN
  RAISE NOTICE '[004] Funciones auxiliares auth_user_role() y auth_user_conjunto() creadas.';
END $$;

-- ============================================================
-- PASO 2: TABLA usuarios — eliminar política recursiva
-- ============================================================

DROP POLICY IF EXISTS "usuarios_select_superadmin" ON usuarios;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usuarios' AND policyname = 'usuarios_select_superadmin'
  ) THEN
    CREATE POLICY "usuarios_select_superadmin" ON usuarios
      FOR SELECT USING (auth_user_role() = 'superadmin');
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '[004] Política usuarios_select_superadmin corregida (no recursiva).';
END $$;

-- ============================================================
-- PASO 3: TABLA conjuntos — reemplazar políticas
-- ============================================================

DROP POLICY IF EXISTS "conjuntos_select_superadmin" ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_select_admin"      ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_insert_superadmin" ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_insert_admin"      ON conjuntos;
DROP POLICY IF EXISTS "conjuntos_update"            ON conjuntos;

-- Superadmin ve todos los conjuntos
CREATE POLICY "conjuntos_select_superadmin" ON conjuntos
  FOR SELECT USING (auth_user_role() = 'superadmin');

-- Admin ve su conjunto (o todos si aún no tiene conjunto asignado)
CREATE POLICY "conjuntos_select_admin" ON conjuntos
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND (
      auth_user_conjunto() = conjuntos.id
      OR auth_user_conjunto() IS NULL
    )
  );

-- Superadmin puede crear conjuntos
CREATE POLICY "conjuntos_insert_superadmin" ON conjuntos
  FOR INSERT WITH CHECK (auth_user_role() = 'superadmin');

-- Admin puede crear si aún no tiene conjunto asignado
CREATE POLICY "conjuntos_insert_admin" ON conjuntos
  FOR INSERT WITH CHECK (
    auth_user_role() = 'admin'
    AND auth_user_conjunto() IS NULL
  );

-- Solo superadmin o admin del conjunto pueden actualizar
CREATE POLICY "conjuntos_update" ON conjuntos
  FOR UPDATE USING (
    auth_user_role() = 'superadmin'
    OR (auth_user_role() = 'admin' AND auth_user_conjunto() = conjuntos.id)
  );

DO $$
BEGIN
  RAISE NOTICE '[004] Políticas de conjuntos actualizadas.';
END $$;

-- ============================================================
-- PASO 4: TABLA procesos
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

DO $$
BEGIN
  RAISE NOTICE '[004] Políticas de procesos actualizadas.';
END $$;

-- ============================================================
-- PASO 5: TABLA consejeros
-- ============================================================

DROP POLICY IF EXISTS "consejeros_select" ON consejeros;
DROP POLICY IF EXISTS "consejeros_insert" ON consejeros;
DROP POLICY IF EXISTS "consejeros_update" ON consejeros;
DROP POLICY IF EXISTS "consejeros_delete" ON consejeros;
ALTER TABLE consejeros
  ADD COLUMN IF NOT EXISTS codigo_acceso TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS consejeros_codigo_acceso_unique
  ON consejeros (codigo_acceso)
  WHERE codigo_acceso IS NOT NULL;

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

DO $$
BEGIN
  RAISE NOTICE '[004] Políticas de consejeros actualizadas.';
END $$;

-- ============================================================
-- PASO 6: TABLA propuestas
-- Acceso vía proceso → conjunto del usuario
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
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = propuestas.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "propuestas_update" ON propuestas
  FOR UPDATE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = propuestas.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "propuestas_delete" ON propuestas
  FOR DELETE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = propuestas.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

DO $$
BEGIN
  RAISE NOTICE '[004] Políticas de propuestas actualizadas.';
END $$;

-- ============================================================
-- PASO 7: TABLA documentos
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
    AND EXISTS (
      SELECT 1 FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      WHERE p.id = documentos.propuesta_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "documentos_update" ON documentos
  FOR UPDATE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      WHERE p.id = documentos.propuesta_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "documentos_delete" ON documentos
  FOR DELETE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      WHERE p.id = documentos.propuesta_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

DO $$
BEGIN
  RAISE NOTICE '[004] Políticas de documentos actualizadas.';
END $$;

-- ============================================================
-- PASO 8: TABLA criterios
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
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = criterios.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "criterios_update" ON criterios
  FOR UPDATE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = criterios.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "criterios_delete" ON criterios
  FOR DELETE USING (
    auth_user_role() IN ('superadmin', 'admin')
    AND EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = criterios.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

DO $$
BEGIN
  RAISE NOTICE '[004] Políticas de criterios actualizadas.';
END $$;

-- ============================================================
-- PASO 9: TABLA evaluaciones
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
    EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = evaluaciones.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

CREATE POLICY "evaluaciones_update" ON evaluaciones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = evaluaciones.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

DO $$
BEGIN
  RAISE NOTICE '[004] Políticas de evaluaciones actualizadas.';
END $$;

-- ============================================================
-- PASO 10: TABLA votos
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
    EXISTS (
      SELECT 1 FROM procesos pr
      WHERE pr.id = votos.proceso_id
        AND pr.conjunto_id = auth_user_conjunto()
    )
  );

DO $$
BEGIN
  RAISE NOTICE '[004] Políticas de votos actualizadas.';
END $$;

-- ============================================================
-- PASO 11: TABLA audit_log
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

DO $$
BEGIN
  RAISE NOTICE '[004] Políticas de audit_log actualizadas.';
END $$;

-- ============================================================
-- PASO 12: TABLA historial_estados_propuesta (migración 003)
-- ============================================================

DROP POLICY IF EXISTS "allow_all_historial_estados" ON historial_estados_propuesta;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'historial_estados_propuesta'
      AND policyname = 'historial_select'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'historial_estados_propuesta'
      AND policyname = 'historial_insert'
  ) THEN
    CREATE POLICY "historial_insert" ON historial_estados_propuesta
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '[004] Políticas de historial_estados_propuesta actualizadas.';
END $$;

-- ============================================================
-- FIN — Resumen
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '[004] Migración completada:';
  RAISE NOTICE '      - Funciones auth_user_role() y auth_user_conjunto() creadas (SECURITY DEFINER).';
  RAISE NOTICE '      - Política recursiva usuarios_select_superadmin corregida.';
  RAISE NOTICE '      - Todas las políticas RLS actualizadas para usar las funciones helper.';
  RAISE NOTICE '      - El error "stack depth limit exceeded" en GET /api/conjuntos debería resolverse.';
END $$;
