-- ============================================================
-- 021_consejeros_puede_votar.sql
-- Agregar columna puede_votar a tabla consejeros
-- Permite al admin habilitar/deshabilitar votación individual
-- ============================================================

-- Agregar columna puede_votar
ALTER TABLE consejeros
ADD COLUMN IF NOT EXISTS puede_votar BOOLEAN DEFAULT true;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_consejeros_puede_votar 
ON consejeros(conjunto_id, puede_votar);

-- Crear índice compuesto para votantes activos
CREATE INDEX IF NOT EXISTS idx_consejeros_votantes_activos
ON consejeros(conjunto_id) 
WHERE activo = true AND puede_votar = true;

DO $$
BEGIN
  RAISE NOTICE '[021] Columna puede_votar agregada a consejeros con índices optimizados';
END $$;
