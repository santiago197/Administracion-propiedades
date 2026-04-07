-- ============================================================
-- 016_transicion_retroceso_validacion.sql
-- Permite regresar de en_validacion → en_revision cuando
-- hay que subsanar documentación (requiere observación).
-- ============================================================

INSERT INTO transiciones_estado (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES ('en_validacion', 'en_revision', true, 'Regresa a revisión documental para subsanación')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;
