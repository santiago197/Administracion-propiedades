-- ============================================================
-- 015_normalizar_criterios.sql
-- Normaliza criterios: catálogo + configuración por proceso
-- ============================================================

BEGIN;

-- 1) Ajustar estructura de criterios_evaluacion (catálogo global)
ALTER TABLE criterios_evaluacion
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'escala'
  CHECK (tipo IN ('numerico', 'booleano', 'escala'));

ALTER TABLE criterios_evaluacion
  DROP COLUMN IF EXISTS peso,
  DROP COLUMN IF EXISTS codigo;

-- 2) Ajustar estructura de criterios (configuración por proceso)
ALTER TABLE criterios
  ADD COLUMN IF NOT EXISTS criterio_evaluacion_id UUID;

-- Backfill: intentar empatar por nombre (insensible a acentos y mayúsculas)
UPDATE criterios c
SET criterio_evaluacion_id = ce.id
FROM criterios_evaluacion ce
WHERE c.criterio_evaluacion_id IS NULL
  AND lower(c.nombre) = lower(ce.nombre);

-- Si no hay match por nombre, mantener null (revisar manualmente)

ALTER TABLE criterios
  ADD CONSTRAINT criterios_criterio_evaluacion_fk
  FOREIGN KEY (criterio_evaluacion_id)
  REFERENCES criterios_evaluacion(id)
  ON DELETE RESTRICT;

ALTER TABLE criterios
  ALTER COLUMN criterio_evaluacion_id SET NOT NULL;

-- 3) Quitar columnas duplicadas de criterios
ALTER TABLE criterios
  DROP COLUMN IF EXISTS nombre,
  DROP COLUMN IF EXISTS descripcion,
  DROP COLUMN IF EXISTS tipo;

COMMIT;

