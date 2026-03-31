-- ============================================================
-- MIGRACIÓN 014: REABRIR EVALUACIÓN DESDE NO_APTO
-- Permite transición no_apto -> en_evaluacion
-- ============================================================

INSERT INTO transiciones_estado
  (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  ('no_apto', 'en_evaluacion', true, 'Reapertura de evaluación para nueva calificación')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;
