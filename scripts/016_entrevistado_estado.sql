-- ============================================================
-- 016_entrevistado_estado.sql
-- Agrega el estado "entrevistado" como paso intermedio entre
-- la evaluación y la decisión de preseleccionado / no apto.
--
-- Flujo: [apto|destacado|condicionado|habilitada|en_evaluacion]
--        → entrevistado → preseleccionado ó descalificada
-- ============================================================

-- 1. Ampliar CHECK constraint de propuestas
ALTER TABLE propuestas DROP CONSTRAINT IF EXISTS propuestas_estado_check;
ALTER TABLE propuestas ADD CONSTRAINT propuestas_estado_check
  CHECK (estado IN (
    'registro',
    'en_revision',
    'incompleto',
    'en_subsanacion',
    'en_validacion',
    'no_apto_legal',
    'habilitada',
    'en_evaluacion',
    'condicionado',
    'apto',
    'destacado',
    'no_apto',
    'entrevistado',
    'preseleccionado',
    'adjudicado',
    'descalificada',
    'retirada'
  ));

-- 2. Transiciones hacia "entrevistado"
INSERT INTO transiciones_estado
  (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  ('habilitada',    'entrevistado', false, 'Candidato convocado y entrevistado (desde habilitado)'),
  ('en_evaluacion', 'entrevistado', false, 'Candidato convocado y entrevistado (durante evaluación)'),
  ('condicionado',  'entrevistado', false, 'Candidato convocado y entrevistado (clasificación condicionada)'),
  ('apto',          'entrevistado', false, 'Candidato convocado y entrevistado (clasificación apta)'),
  ('destacado',     'entrevistado', false, 'Candidato convocado y entrevistado (clasificación destacada)')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;

-- 3. Transiciones desde "entrevistado"
INSERT INTO transiciones_estado
  (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  ('entrevistado', 'preseleccionado', false, 'Candidato preseleccionado tras entrevista exitosa'),
  ('entrevistado', 'descalificada',   true,  'Candidato no apto tras la entrevista'),
  ('entrevistado', 'adjudicado',      false, 'Candidato entrevistado adjudicado directamente'),
  ('entrevistado', 'retirada',        true,  'Candidato entrevistado retirado del proceso')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;
