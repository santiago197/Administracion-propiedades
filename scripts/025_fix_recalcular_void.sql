-- ============================================================
-- 025_fix_recalcular_void.sql
-- Reemplaza recalcular_resultados para que retorne VOID.
-- El error "structure of query does not match function result type"
-- ocurría porque el RETURN QUERY devolvía VARCHAR(255)/VARCHAR(20)
-- donde la firma declaraba TEXT/VARCHAR sin longitud.
-- Al retornar VOID el caller lee los datos frescos con un SELECT
-- separado, eliminando la fuente del error.
-- ============================================================

DROP FUNCTION IF EXISTS recalcular_resultados(UUID);

CREATE OR REPLACE FUNCTION recalcular_resultados(p_proceso_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peso_evaluacion  INTEGER;
  v_peso_votacion    INTEGER;
  v_total_consejeros INTEGER;
BEGIN
  -- Pesos del proceso
  SELECT peso_evaluacion, peso_votacion
  INTO v_peso_evaluacion, v_peso_votacion
  FROM procesos
  WHERE id = p_proceso_id;

  -- Total consejeros activos del conjunto
  SELECT COUNT(*)::INTEGER INTO v_total_consejeros
  FROM consejeros co
  JOIN procesos pr ON pr.conjunto_id = co.conjunto_id
  WHERE pr.id = p_proceso_id AND co.activo = true;

  -- 1. Recalcular puntaje_evaluacion y clasificacion
  UPDATE propuestas p
  SET
    puntaje_evaluacion = calcular_puntaje_propuesta(p.id),
    clasificacion      = clasificar_candidato(calcular_puntaje_propuesta(p.id))
  WHERE p.proceso_id = p_proceso_id
    AND p.estado NOT IN ('no_apto_legal', 'retirada', 'descalificada');

  -- 2. Actualizar votos_recibidos
  UPDATE propuestas p
  SET votos_recibidos = (
    SELECT COUNT(*)::INTEGER FROM votos v WHERE v.propuesta_id = p.id
  )
  WHERE p.proceso_id = p_proceso_id;

  -- 3. Calcular puntaje_final = (eval × peso_eval%) + (votos_norm × peso_voto%)
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
END;
$$;

REVOKE ALL ON FUNCTION recalcular_resultados(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recalcular_resultados(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalcular_resultados(UUID) TO service_role;

DO $$
BEGIN
  RAISE NOTICE '[025] recalcular_resultados reescrita como RETURNS VOID.';
END $$;
