-- ============================================================
-- 018_acceso_proponentes.sql
-- Tabla de códigos de acceso para que proponentes carguen
-- sus documentos sin necesitar cuenta en el sistema.
-- ============================================================

CREATE TABLE IF NOT EXISTS acceso_proponentes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id  UUID        NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  codigo        VARCHAR(8)  NOT NULL UNIQUE,
  activo        BOOLEAN     NOT NULL DEFAULT true,
  fecha_limite  TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID        REFERENCES usuarios(id),
  CONSTRAINT codigo_format CHECK (codigo ~ '^[A-Z]{3}[0-9]{5}$')
);

-- Solo puede existir un acceso por propuesta
-- IMPORTANTE: debe ser CONSTRAINT (no solo INDEX) para que el upsert de PostgREST funcione
ALTER TABLE acceso_proponentes
  ADD CONSTRAINT acceso_proponentes_propuesta_id_key UNIQUE (propuesta_id);

CREATE INDEX IF NOT EXISTS idx_acceso_codigo
  ON acceso_proponentes(codigo);

-- ── Permisos de rol ──────────────────────────────────────────
-- anon necesita SELECT para que /api/proponente/validar funcione sin sesión
GRANT SELECT ON acceso_proponentes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON acceso_proponentes TO authenticated;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE acceso_proponentes ENABLE ROW LEVEL SECURITY;

-- Administradores y evaluadores ven y gestionan los accesos de su conjunto
CREATE POLICY "admin_gestiona_accesos" ON acceso_proponentes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM propuestas p
      JOIN procesos pr ON pr.id = p.proceso_id
      JOIN usuarios u  ON u.conjunto_id = pr.conjunto_id
      WHERE p.id = acceso_proponentes.propuesta_id
        AND u.id = auth.uid()
        AND u.activo = true
    )
  );

-- Superadmin ve todo
CREATE POLICY "superadmin_gestiona_accesos" ON acceso_proponentes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol = 'superadmin' AND activo = true
    )
  );

-- Lectura pública por código (para el endpoint de validación sin sesión)
CREATE POLICY "lectura_publica_por_codigo" ON acceso_proponentes
  FOR SELECT
  USING (true);

-- ── updated_at automático ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_acceso_proponentes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acceso_proponentes_updated_at ON acceso_proponentes;
CREATE TRIGGER trg_acceso_proponentes_updated_at
  BEFORE UPDATE ON acceso_proponentes
  FOR EACH ROW EXECUTE FUNCTION update_acceso_proponentes_updated_at();
