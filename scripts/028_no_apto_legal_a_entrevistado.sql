-- ============================================================
-- MIGRACIÓN 028: PERMITIR ENTREVISTA DESDE NO_APTO_LEGAL
-- Habilita la transición no_apto_legal -> entrevistado
-- dejando observación obligatoria para trazabilidad.
-- ============================================================

INSERT INTO transiciones_estado
  (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  (
    'no_apto_legal',
    'entrevistado',
    true,
    'Entrevista permitida con observación: debe subsanar documentación legal'
  )
ON CONFLICT (estado_origen, estado_destino) DO UPDATE
SET
  requiere_observacion = EXCLUDED.requiere_observacion,
  descripcion = EXCLUDED.descripcion;

