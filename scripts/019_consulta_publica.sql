-- ============================================================
-- 019_consulta_publica.sql
-- Agregar columna es_publica a procesos y configuración
-- de consulta pública del proceso
-- ============================================================

-- Agregar columna es_publica a tabla procesos
ALTER TABLE procesos
ADD COLUMN IF NOT EXISTS es_publica BOOLEAN DEFAULT false;

-- Índice para búsqueda rápida de procesos públicos
CREATE INDEX IF NOT EXISTS idx_procesos_es_publica 
ON procesos(es_publica)
WHERE es_publica = true;

-- Índice compuesto para búsqueda por conjunto y visibilidad
CREATE INDEX IF NOT EXISTS idx_procesos_conjunto_publica 
ON procesos(conjunto_id, es_publica);

DO $$
BEGIN
  RAISE NOTICE '[019] Columna es_publica agregada a procesos y índices creados';
END $$;

 ALTER TABLE procesos
  ADD COLUMN IF NOT EXISTS es_publica BOOLEAN DEFAULT false;

  -- Índice para búsqueda rápida de procesos públicos
  CREATE INDEX IF NOT EXISTS idx_procesos_es_publica
  ON procesos(es_publica)
  WHERE es_publica = true;

  -- Índice compuesto para búsqueda por conjunto y visibilidad
  CREATE INDEX IF NOT EXISTS idx_procesos_conjunto_publica
  ON procesos(conjunto_id, es_publica);

-- Marcar el proceso de Barlovento como público para habilitar la consulta pública
UPDATE procesos
SET es_publica = true
WHERE id = '4dadca05-62dc-4c5b-97a9-ee11592f83dc';