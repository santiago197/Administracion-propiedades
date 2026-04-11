-- ============================================================
-- 015_preseleccionado_entrevista.sql
-- Agrega el estado "preseleccionado" al flujo de la máquina
-- de estados. Representa un candidato que superó la entrevista
-- y tiene prioridad en el ranking.
-- ============================================================

-- 1. Transiciones hacia "preseleccionado"
--    Aplica desde cualquier estado de evaluación positiva
INSERT INTO transiciones_estado
  (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  ('apto',           'preseleccionado', false, 'Candidato preseleccionado tras entrevista exitosa'),
  ('destacado',      'preseleccionado', false, 'Candidato preseleccionado tras entrevista exitosa (clasificación destacada)'),
  ('condicionado',   'preseleccionado', false, 'Candidato preseleccionado tras entrevista, pese a clasificación condicionada'),
  ('en_evaluacion',  'preseleccionado', false, 'Candidato preseleccionado durante proceso de evaluación')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;

-- 2. Transiciones desde "preseleccionado"
--    Puede adjudicarse, rechazarse por otra razón posterior, o retirarse
INSERT INTO transiciones_estado
  (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  ('preseleccionado', 'adjudicado',    false, 'Candidato preseleccionado adjudicado por el consejo'),
  ('preseleccionado', 'descalificada', true,  'Candidato preseleccionado descalificado en etapa posterior'),
  ('preseleccionado', 'retirada',      true,  'Candidato preseleccionado retirado del proceso')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;
