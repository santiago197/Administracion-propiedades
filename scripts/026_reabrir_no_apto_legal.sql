-- ============================================================
-- MIGRACIÓN 026: REABRIR VALIDACIÓN DESDE NO_APTO_LEGAL
-- Permite transición no_apto_legal -> en_validacion
-- para re-evaluación con nuevo umbral legal.
-- ============================================================

INSERT INTO transiciones_estado
  (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  (
    'no_apto_legal',
    'en_validacion',
    true,
    'Reapertura de validación legal por ajuste de umbral o revisión administrativa'
  )
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;

