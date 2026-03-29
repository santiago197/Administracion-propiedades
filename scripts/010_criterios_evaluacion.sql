-- ============================================================
-- MIGRACIÓN 010: TABLA criterios_evaluacion
-- ============================================================
-- Permite gestionar dinámicamente los criterios de evaluación
-- en lugar de tenerlos hardcodeados en el código.
-- ============================================================

-- Tabla principal de criterios
CREATE TABLE IF NOT EXISTS criterios_evaluacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  peso INTEGER NOT NULL CHECK (peso >= 0 AND peso <= 100),
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_criterios_activo ON criterios_evaluacion(activo);
CREATE INDEX IF NOT EXISTS idx_criterios_orden ON criterios_evaluacion(orden);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_criterios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_criterios_updated_at ON criterios_evaluacion;
CREATE TRIGGER trigger_criterios_updated_at
  BEFORE UPDATE ON criterios_evaluacion
  FOR EACH ROW
  EXECUTE FUNCTION update_criterios_updated_at();

-- RLS
ALTER TABLE criterios_evaluacion ENABLE ROW LEVEL SECURITY;

-- Política de lectura: todos los usuarios autenticados pueden leer
CREATE POLICY criterios_select_policy ON criterios_evaluacion
  FOR SELECT
  TO authenticated
  USING (true);

-- Política de escritura: solo superadmin y admin pueden modificar
-- Usamos auth.jwt() para evitar recursión con tabla usuarios
CREATE POLICY criterios_insert_policy ON criterios_evaluacion
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.activo = true
        AND u.rol IN ('superadmin', 'admin')
    )
  );

CREATE POLICY criterios_update_policy ON criterios_evaluacion
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.activo = true
        AND u.rol IN ('superadmin', 'admin')
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.activo = true
        AND u.rol IN ('superadmin', 'admin')
    )
  );

CREATE POLICY criterios_delete_policy ON criterios_evaluacion
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.activo = true
        AND u.rol IN ('superadmin', 'admin')
    )
  );

-- ============================================================
-- DATOS INICIALES (9 criterios por defecto)
-- ============================================================

INSERT INTO criterios_evaluacion (codigo, nombre, descripcion, peso, orden, activo) VALUES
  ('expPH',                   'Experiencia en Propiedad Horizontal',       'Mínimo 5 años certificados en administración de propiedad horizontal.',                                     20, 1, true),
  ('expDensidad',             'Experiencia en Conjuntos de Alta Densidad', 'Experiencia en conjuntos >500 unidades, con retos de seguridad, convivencia y parqueaderos.',             15, 2, true),
  ('capacidadOperativa',      'Capacidad Operativa / Equipo de Apoyo',     'Recursos humanos y técnicos disponibles para la gestión.',                                                 15, 3, true),
  ('propuestaTecnica',        'Propuesta Técnica / Plan de Gestión',       'Claridad, organización y viabilidad del plan administrativo.',                                            15, 4, true),
  ('formacionAcademica',      'Formación Académica',                       'Profesional en áreas administrativas, contables, económicas, ingeniería, derecho o afines.',             10, 5, true),
  ('conocimientosNormativos', 'Conocimientos Normativos y Técnicos',       'Ley 675, Ley 1801, SST, manejo presupuestal y financiero.',                                              10, 6, true),
  ('referencias',             'Referencias Verificables',                  'Calidad y confiabilidad de referencias.',                                                                  5, 7, true),
  ('economica',               'Propuesta Económica',                       'Honorarios y condiciones económicas.',                                                                      5, 8, true),
  ('competenciasPersonales',  'Competencias Personales',                   'Liderazgo, ética, comunicación, manejo de conflictos.',                                                    5, 9, true)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- Función para validar que el peso total sea 100
-- ============================================================

CREATE OR REPLACE FUNCTION validar_peso_total_criterios()
RETURNS TRIGGER AS $$
DECLARE
  peso_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(peso), 0) INTO peso_total
  FROM criterios_evaluacion
  WHERE activo = true;
  
  -- Solo advertir, no bloquear (permite configuración incremental)
  IF peso_total != 100 THEN
    RAISE WARNING 'El peso total de los criterios activos es % (debería ser 100)', peso_total;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentario: Este trigger solo advierte, no bloquea operaciones
-- DROP TRIGGER IF EXISTS trigger_validar_peso ON criterios_evaluacion;
-- CREATE TRIGGER trigger_validar_peso
--   AFTER INSERT OR UPDATE OR DELETE ON criterios_evaluacion
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION validar_peso_total_criterios();
