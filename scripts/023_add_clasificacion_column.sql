-- ============================================================
-- 023_add_clasificacion_column.sql
-- Agregar columna clasificacion si no existe
-- ============================================================

-- Agregar columna clasificacion a propuestas si no existe
ALTER TABLE propuestas
ADD COLUMN IF NOT EXISTS clasificacion VARCHAR(20) 
  CHECK (clasificacion IN ('destacado', 'apto', 'condicionado', 'no_apto'))
  DEFAULT NULL;

-- Crear índice para búsquedas por clasificacion
CREATE INDEX IF NOT EXISTS idx_propuestas_clasificacion 
ON propuestas(clasificacion);

DO $$
BEGIN
  RAISE NOTICE '[023] Columna clasificacion agregada a propuestas';
END $$;
