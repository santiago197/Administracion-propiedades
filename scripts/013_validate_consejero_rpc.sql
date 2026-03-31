-- =============================================================
-- 013_validate_consejero_rpc.sql
-- Función SECURITY DEFINER para validar código de acceso de
-- consejero sin exponer las tablas al rol anon.
-- Retorna consejero + proceso activo en una sola llamada.
-- =============================================================

DROP FUNCTION IF EXISTS validate_consejero_code(TEXT);

CREATE OR REPLACE FUNCTION validate_consejero_code(p_codigo TEXT)
RETURNS TABLE(
  consejero_id UUID,
  conjunto_id  UUID,
  proceso_id   UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_codigo IS NULL OR length(trim(p_codigo)) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      c.id                AS consejero_id,
      c.conjunto_id       AS conjunto_id,
      p.id                AS proceso_id
    FROM consejeros c
    LEFT JOIN procesos p
      ON p.conjunto_id = c.conjunto_id
     AND p.estado = 'evaluacion'
    WHERE c.codigo_acceso = upper(trim(p_codigo))
      AND c.activo = true
    LIMIT 1;
END;
$$;

-- Revocar acceso público y otorgar solo a anon y authenticated
REVOKE ALL ON FUNCTION validate_consejero_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_consejero_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_consejero_code(TEXT) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '[013] Función validate_consejero_code creada con SECURITY DEFINER.';
END $$;
