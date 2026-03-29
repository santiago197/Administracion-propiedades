-- =====================================================
-- 008: Corrección de columnas faltantes en propuestas
-- Agrega columnas que pueden no existir si la tabla fue
-- creada con una versión anterior del schema.
-- =====================================================

-- Columnas de validación legal
ALTER TABLE propuestas
  ADD COLUMN IF NOT EXISTS cumple_requisitos_legales BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS observaciones_legales TEXT,
  ADD COLUMN IF NOT EXISTS checklist_legal JSONB;

-- Columnas de puntajes (por si alguna falta)
ALTER TABLE propuestas
  ADD COLUMN IF NOT EXISTS puntaje_legal DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS puntaje_tecnico DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS puntaje_financiero DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS puntaje_referencias DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS puntaje_propuesta DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS puntaje_evaluacion DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS votos_recibidos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS puntaje_final DECIMAL(5,2) DEFAULT 0;

-- Ampliar el CHECK de estado para incluir todos los estados del flujo
-- (en caso de que se creó con la versión reducida del schema)
ALTER TABLE propuestas DROP CONSTRAINT IF EXISTS propuestas_estado_check;
ALTER TABLE propuestas ADD CONSTRAINT propuestas_estado_check
  CHECK (estado IN (
    'registro', 'en_revision', 'incompleto', 'en_subsanacion',
    'en_validacion', 'no_apto_legal', 'habilitada', 'en_evaluacion',
    'condicionado', 'apto', 'destacado', 'no_apto',
    'adjudicado', 'descalificada', 'retirada'
  ));

-- Recargar el schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
