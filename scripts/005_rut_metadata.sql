-- =============================================================================
-- 005_rut_metadata.sql
-- Tabla para almacenar los datos extendidos extraídos del RUT de cada propuesta.
-- Ejecutar en Supabase SQL Editor DESPUÉS de 004_fix_rls.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla principal
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS propuesta_rut_datos (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id              uuid        NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,

  -- Datos de identificación extraídos del RUT
  nit_extraido              text,
  dv_extraido               text,
  razon_social_extraida     text,
  tipo_contribuyente        text,       -- "Persona jurídica" | "Persona natural"

  -- Datos complejos como JSONB
  -- Cada elemento sigue la interfaz RepresentanteLegalData del parser
  representantes_legales    jsonb       NOT NULL DEFAULT '[]'::jsonb,

  -- Cada elemento sigue la interfaz SocioData del parser
  socios                    jsonb       NOT NULL DEFAULT '[]'::jsonb,

  -- Sigue la interfaz RevisorFiscalData
  revisor_fiscal_principal  jsonb,
  revisor_fiscal_suplente   jsonb,

  -- Sigue la interfaz ContadorData
  contador                  jsonb,

  -- Array de { codigo, nombre } según ResponsabilidadItem
  responsabilidades         jsonb       NOT NULL DEFAULT '[]'::jsonb,

  -- Banderas calculadas en el frontend al momento de extracción
  hay_alerta_pep            boolean     NOT NULL DEFAULT false,
  nit_coincide              boolean,    -- true si el NIT del RUT coincide con propuestas.nit_cedula

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS propuesta_rut_datos_propuesta_id_idx
  ON propuesta_rut_datos (propuesta_id);

CREATE INDEX IF NOT EXISTS propuesta_rut_datos_pep_idx
  ON propuesta_rut_datos (hay_alerta_pep)
  WHERE hay_alerta_pep = true;

-- -----------------------------------------------------------------------------
-- Trigger updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_propuesta_rut_datos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_propuesta_rut_datos_updated_at
  BEFORE UPDATE ON propuesta_rut_datos
  FOR EACH ROW EXECUTE FUNCTION update_propuesta_rut_datos_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE propuesta_rut_datos ENABLE ROW LEVEL SECURITY;

-- Los usuarios autenticados (admin / evaluador) acceden solo a registros
-- cuya propuesta pertenezca a su mismo conjunto.
CREATE POLICY "rut_datos_select_mismo_conjunto"
  ON propuesta_rut_datos FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      JOIN usuarios u  ON u.conjunto_id = pr.conjunto_id
      WHERE p.id = propuesta_rut_datos.propuesta_id
        AND u.id = auth.uid()
        AND u.activo = true
    )
  );

CREATE POLICY "rut_datos_insert_mismo_conjunto"
  ON propuesta_rut_datos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      JOIN usuarios u  ON u.conjunto_id = pr.conjunto_id
      WHERE p.id = propuesta_rut_datos.propuesta_id
        AND u.id = auth.uid()
        AND u.activo = true
    )
  );

CREATE POLICY "rut_datos_update_mismo_conjunto"
  ON propuesta_rut_datos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      JOIN usuarios u  ON u.conjunto_id = pr.conjunto_id
      WHERE p.id = propuesta_rut_datos.propuesta_id
        AND u.id = auth.uid()
        AND u.activo = true
    )
  );

-- Superadmin accede a todo
CREATE POLICY "rut_datos_superadmin"
  ON propuesta_rut_datos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol = 'superadmin' AND activo = true
    )
  );
