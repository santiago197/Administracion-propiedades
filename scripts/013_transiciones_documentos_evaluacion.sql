-- =====================================================
-- 013: Transiciones directas a en_evaluacion por documentos
-- Permite avanzar cuando la documentación requerida está completa.
-- =====================================================

INSERT INTO transiciones_estado
  (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  ('registro',       'en_evaluacion',  false, 'Documentación completa, pasa a evaluación'),
  ('en_revision',    'en_evaluacion',  false, 'Documentación completa, pasa a evaluación'),
  ('incompleto',     'en_evaluacion',  false, 'Documentación completa, pasa a evaluación'),
  ('en_subsanacion', 'en_evaluacion',  false, 'Documentación completa, pasa a evaluación'),
  ('en_validacion',  'en_evaluacion',  false, 'Documentación completa, pasa a evaluación')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;
