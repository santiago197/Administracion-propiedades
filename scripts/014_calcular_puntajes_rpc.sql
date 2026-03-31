-- =============================================================
-- 014_calcular_puntajes_rpc.sql
-- RPCs para cálculo incremental y final de puntajes.
-- NO modifican el campo `estado` (eso es responsabilidad de la
-- máquina de estados vía cambiar_estado_propuesta).
-- =============================================================

-- -------------------------------------------------------------
-- 1. actualizar_puntaje_propuesta
--    Recalcula puntaje_evaluacion + clasificacion de UNA propuesta.
--    Llamado después de cada guardado de evaluación.
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS actualizar_puntaje_propuesta(UUID);

CREATE OR REPLACE FUNCTION actualizar_puntaje_propuesta(p_propuesta_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_puntaje DECIMAL(5,2);
BEGIN
  v_puntaje := calcular_puntaje_propuesta(p_propuesta_id);

  UPDATE propuestas
  SET
    puntaje_evaluacion = v_puntaje,
    clasificacion      = clasificar_candidato(v_puntaje)
  WHERE id = p_propuesta_id;

  RETURN v_puntaje;
END;
$$;

REVOKE ALL ON FUNCTION actualizar_puntaje_propuesta(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION actualizar_puntaje_propuesta(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION actualizar_puntaje_propuesta(UUID) TO service_role;

-- -------------------------------------------------------------
-- 2. recalcular_resultados
--    Recalcula puntaje_evaluacion, clasificacion, votos_recibidos
--    y puntaje_final para TODAS las propuestas de un proceso.
--    NO toca el campo `estado`.
--    Llamado después del último voto y desde el panel admin.
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS recalcular_resultados(UUID);

CREATE OR REPLACE FUNCTION recalcular_resultados(p_proceso_id UUID)
RETURNS TABLE(
  propuesta_id       UUID,
  razon_social       TEXT,
  puntaje_evaluacion DECIMAL(5,2),
  votos_recibidos    INTEGER,
  puntaje_final      DECIMAL(5,2),
  clasificacion      VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peso_evaluacion  INTEGER;
  v_peso_votacion    INTEGER;
  v_total_consejeros INTEGER;
BEGIN
  SELECT peso_evaluacion, peso_votacion
  INTO v_peso_evaluacion, v_peso_votacion
  FROM procesos
  WHERE id = p_proceso_id;

  -- Total de consejeros activos del conjunto del proceso
  SELECT COUNT(*) INTO v_total_consejeros
  FROM consejeros co
  JOIN procesos pr ON pr.conjunto_id = co.conjunto_id
  WHERE pr.id = p_proceso_id AND co.activo = true;

  -- 1. Actualizar puntaje_evaluacion y clasificacion
  UPDATE propuestas p
  SET
    puntaje_evaluacion = calcular_puntaje_propuesta(p.id),
    clasificacion      = clasificar_candidato(calcular_puntaje_propuesta(p.id))
  WHERE p.proceso_id = p_proceso_id
    AND p.estado NOT IN ('no_apto_legal', 'retirada', 'descalificada');

  -- 2. Actualizar votos_recibidos
  UPDATE propuestas p
  SET votos_recibidos = (
    SELECT COUNT(*) FROM votos v WHERE v.propuesta_id = p.id
  )
  WHERE p.proceso_id = p_proceso_id;

  -- 3. Calcular puntaje_final combinando evaluación y votos
  UPDATE propuestas p
  SET puntaje_final = ROUND(
    (p.puntaje_evaluacion * v_peso_evaluacion / 100.0)
    + (
        CASE
          WHEN v_total_consejeros > 0
            THEN (p.votos_recibidos::DECIMAL / v_total_consejeros * 100)
          ELSE 0
        END
      ) * v_peso_votacion / 100.0,
    2
  )
  WHERE p.proceso_id = p_proceso_id
    AND p.estado NOT IN ('no_apto_legal', 'retirada', 'descalificada');

  -- 4. Devolver resumen ordenado por puntaje_final
  RETURN QUERY
    SELECT
      p.id,
      p.razon_social,
      p.puntaje_evaluacion,
      p.votos_recibidos,
      p.puntaje_final,
      p.clasificacion
    FROM propuestas p
    WHERE p.proceso_id = p_proceso_id
      AND p.estado NOT IN ('no_apto_legal', 'retirada', 'descalificada')
    ORDER BY p.puntaje_final DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION recalcular_resultados(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recalcular_resultados(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalcular_resultados(UUID) TO service_role;

DO $$
BEGIN
  RAISE NOTICE '[014] RPCs actualizar_puntaje_propuesta y recalcular_resultados creadas.';
END $$;
