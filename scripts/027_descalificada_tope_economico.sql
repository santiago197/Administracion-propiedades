-- ============================================================
-- Migración 027: transiciones a 'descalificada' desde estados activos
-- Permite rechazar una propuesta por superar el tope económico definido
-- (o cualquier otro motivo de descalificación) desde cualquier estado activo.
-- ============================================================

INSERT INTO transiciones_estado
  (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  ('registro',      'descalificada', true, 'Descalificada antes de iniciar revisión'),
  ('en_revision',   'descalificada', true, 'Descalificada durante revisión documental'),
  ('incompleto',    'descalificada', true, 'Descalificada con documentación incompleta'),
  ('en_validacion', 'descalificada', true, 'Descalificada durante validación legal'),
  ('habilitada',    'descalificada', true, 'Descalificada estando habilitada (ej: supera tope económico)'),
  ('en_evaluacion', 'descalificada', true, 'Descalificada durante evaluación (ej: supera tope económico)'),
  ('condicionado',  'descalificada', true, 'Descalificada tras evaluación (ej: supera tope económico)'),
  ('apto',          'descalificada', true, 'Descalificada tras evaluación (ej: supera tope económico)'),
  ('destacado',     'descalificada', true, 'Descalificada tras evaluación (ej: supera tope económico)')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;
