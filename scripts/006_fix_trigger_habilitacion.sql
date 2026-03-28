-- =====================================================
-- MIGRACIÓN 006: Corrección del trigger de documentos
-- =====================================================
-- PROBLEMA: La función actualizar_estado_por_documentos() transicionaba
-- automáticamente al estado 'habilitada' cuando todos los documentos
-- obligatorios estaban aprobados, saltándose completamente la etapa de
-- validación legal (SARLAFT, antecedentes, pólizas, etc.).
--
-- CORRECCIÓN: El trigger solo gestiona la transición hacia 'incompleto'
-- cuando un documento obligatorio es rechazado o expira. La transición
-- a 'en_validacion' y posteriormente a 'habilitada' siempre debe ser
-- iniciada manualmente por el administrador a través del flujo normal.
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_estado_por_documentos()
RETURNS TRIGGER AS $$
DECLARE
  v_completitud VARCHAR;
BEGIN
  v_completitud := verificar_documentos_propuesta(NEW.propuesta_id);

  -- Si la documentación queda incompleta (documento rechazado o vencido),
  -- retroceder al estado 'incompleto' solo si la propuesta estaba en
  -- revisión activa o ya había sido habilitada (documento vencido post-habilitación).
  IF v_completitud = 'INCOMPLETA' THEN
    UPDATE propuestas
    SET estado = 'incompleto'
    WHERE id = NEW.propuesta_id
      AND estado IN ('en_revision', 'incompleto', 'habilitada');
  END IF;

  -- ELIMINADO: la transición automática a 'habilitada' cuando todos los
  -- documentos están aprobados. Esa decisión requiere validación legal
  -- explícita por parte del administrador (en_validacion → habilitada).

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
