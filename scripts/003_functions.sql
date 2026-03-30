-- ============================================================
-- 003_functions.sql
-- Toda la lógica de negocio: funciones, triggers y vistas.
-- Ejecutar DESPUÉS de 002_auth_rls.sql.
-- ============================================================

-- ============================================================
-- GENERACIÓN DE CÓDIGO DE ACCESO PARA CONSEJEROS
-- ============================================================
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS VARCHAR(8) LANGUAGE plpgsql AS $$
DECLARE
  chars  TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8) := '';
  i      INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION set_consejero_codigo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.codigo_acceso IS NULL THEN
    LOOP
      NEW.codigo_acceso := generate_access_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM consejeros WHERE codigo_acceso = NEW.codigo_acceso
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_consejero_codigo_trigger ON consejeros;
CREATE TRIGGER set_consejero_codigo_trigger
  BEFORE INSERT ON consejeros
  FOR EACH ROW EXECUTE FUNCTION set_consejero_codigo();

-- ============================================================
-- VENCIMIENTO AUTOMÁTICO DE DOCUMENTOS
-- ============================================================
CREATE OR REPLACE FUNCTION verificar_vencimiento_documentos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fecha_vencimiento IS NOT NULL AND NEW.fecha_vencimiento < CURRENT_DATE THEN
    NEW.estado := 'VENCIDO';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_verificar_vencimiento ON documentos;
CREATE TRIGGER trigger_verificar_vencimiento
  BEFORE INSERT OR UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION verificar_vencimiento_documentos();

-- ============================================================
-- VERIFICACIÓN DE COMPLETITUD DOCUMENTAL
-- Retorna 'COMPLETA' o 'INCOMPLETA' según tipos_documento obligatorios.
-- ============================================================
CREATE OR REPLACE FUNCTION verificar_documentos_propuesta(p_propuesta_id UUID)
RETURNS VARCHAR LANGUAGE plpgsql AS $$
DECLARE
  v_tipo_persona VARCHAR;
  v_faltantes    INTEGER;
BEGIN
  SELECT tipo_persona INTO v_tipo_persona
  FROM propuestas WHERE id = p_propuesta_id;

  SELECT COUNT(*) INTO v_faltantes
  FROM tipos_documento td
  WHERE td.activo = true
    AND td.es_obligatorio = true
    AND (td.tipo_persona = v_tipo_persona OR td.tipo_persona = 'ambos')
    AND NOT EXISTS (
      SELECT 1 FROM documentos d
      WHERE d.propuesta_id = p_propuesta_id
        AND d.tipo_documento_id = td.id
        AND d.estado IN ('APROBADO', 'CARGADO', 'EN_REVISION')
    );

  IF v_faltantes > 0 THEN
    RETURN 'INCOMPLETA';
  ELSE
    RETURN 'COMPLETA';
  END IF;
END;
$$;

-- ============================================================
-- TRIGGER: Actualizar estado de propuesta por cambio en documentos
-- Solo retrocede a 'incompleto' cuando un doc obligatorio es
-- rechazado o vence. La transición hacia 'habilitada' requiere
-- validación legal explícita del admin.
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_estado_por_documentos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_completitud VARCHAR;
BEGIN
  v_completitud := verificar_documentos_propuesta(NEW.propuesta_id);

  IF v_completitud = 'INCOMPLETA' THEN
    UPDATE propuestas
    SET estado = 'incompleto'
    WHERE id = NEW.propuesta_id
      AND estado IN ('en_revision', 'incompleto', 'habilitada', 'en_evaluacion');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_actualizar_estado_propuesta ON documentos;
CREATE TRIGGER trigger_actualizar_estado_propuesta
  AFTER INSERT OR UPDATE OF estado ON documentos
  FOR EACH ROW EXECUTE FUNCTION actualizar_estado_por_documentos();

-- ============================================================
-- CÁLCULO DE PUNTAJE PONDERADO DE UNA PROPUESTA
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_puntaje_propuesta(p_propuesta_id UUID)
RETURNS DECIMAL(5,2) LANGUAGE plpgsql AS $$
DECLARE
  v_puntaje    DECIMAL(5,2);
  v_proceso_id UUID;
  v_total_peso DECIMAL(5,2);
BEGIN
  SELECT proceso_id INTO v_proceso_id
  FROM propuestas WHERE id = p_propuesta_id;

  SELECT COALESCE(SUM(peso), 0) INTO v_total_peso
  FROM criterios
  WHERE proceso_id = v_proceso_id AND activo = true;

  IF v_total_peso = 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(
    SUM((e.valor / c.valor_maximo * 100) * c.peso / v_total_peso)
    / NULLIF(COUNT(DISTINCT e.consejero_id), 0),
    0
  ) INTO v_puntaje
  FROM evaluaciones e
  JOIN criterios c ON e.criterio_id = c.id
  WHERE e.propuesta_id = p_propuesta_id AND c.activo = true;

  RETURN ROUND(v_puntaje, 2);
END;
$$;

-- ============================================================
-- CLASIFICACIÓN AUTOMÁTICA POR PUNTAJE (escala 0–100)
-- ============================================================
CREATE OR REPLACE FUNCTION clasificar_candidato(p_puntaje DECIMAL)
RETURNS VARCHAR LANGUAGE plpgsql AS $$
BEGIN
  IF    p_puntaje >= 85 THEN RETURN 'destacado';
  ELSIF p_puntaje >= 70 THEN RETURN 'apto';
  ELSIF p_puntaje >= 55 THEN RETURN 'condicionado';
  ELSE                       RETURN 'no_apto';
  END IF;
END;
$$;

-- ============================================================
-- CALCULAR PUNTAJE FINAL (evaluación + votación)
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_puntaje_final(p_proceso_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_peso_evaluacion  INTEGER;
  v_peso_votacion    INTEGER;
  v_total_consejeros INTEGER;
BEGIN
  SELECT peso_evaluacion, peso_votacion
  INTO v_peso_evaluacion, v_peso_votacion
  FROM procesos WHERE id = p_proceso_id;

  SELECT COUNT(*) INTO v_total_consejeros
  FROM consejeros co
  JOIN procesos pr ON pr.conjunto_id = co.conjunto_id
  WHERE pr.id = p_proceso_id AND co.activo = true;

  UPDATE propuestas
  SET
    puntaje_evaluacion = calcular_puntaje_propuesta(id),
    clasificacion      = clasificar_candidato(calcular_puntaje_propuesta(id)),
    estado             = CASE
                           WHEN calcular_puntaje_propuesta(id) < 55 THEN 'no_apto'
                           ELSE 'en_evaluacion'
                         END
  WHERE proceso_id = p_proceso_id
    AND estado IN ('habilitada', 'en_evaluacion');

  UPDATE propuestas p
  SET votos_recibidos = (
    SELECT COUNT(*) FROM votos v WHERE v.propuesta_id = p.id
  )
  WHERE proceso_id = p_proceso_id;

  UPDATE propuestas
  SET puntaje_final = ROUND(
    (puntaje_evaluacion * v_peso_evaluacion / 100.0)
    + (
        CASE WHEN v_total_consejeros > 0
             THEN (votos_recibidos::DECIMAL / v_total_consejeros * 100)
             ELSE 0
        END
      ) * v_peso_votacion / 100.0,
    2
  )
  WHERE proceso_id = p_proceso_id
    AND estado NOT IN ('no_apto_legal', 'retirada', 'descalificada');
END;
$$;

-- ============================================================
-- MÁQUINA DE ESTADOS: validar si una transición es permitida
-- ============================================================
CREATE OR REPLACE FUNCTION validar_transicion_estado(
  p_origen  VARCHAR,
  p_destino VARCHAR
)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM transiciones_estado
    WHERE estado_origen = p_origen AND estado_destino = p_destino
  );
END;
$$;

-- ============================================================
-- MÁQUINA DE ESTADOS: transiciones disponibles desde un estado
-- ============================================================
CREATE OR REPLACE FUNCTION get_transiciones_disponibles(p_estado_actual VARCHAR)
RETURNS TABLE (
  estado_destino       VARCHAR,
  requiere_observacion BOOLEAN,
  descripcion          VARCHAR
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
    SELECT te.estado_destino, te.requiere_observacion, te.descripcion
    FROM transiciones_estado te
    WHERE te.estado_origen = p_estado_actual
    ORDER BY te.id;
END;
$$;

-- ============================================================
-- MÁQUINA DE ESTADOS: cambiar estado de una propuesta
-- Valida la transición, registra historial y audit_log.
-- ============================================================
CREATE OR REPLACE FUNCTION cambiar_estado_propuesta(
  p_propuesta_id UUID,
  p_estado_nuevo VARCHAR,
  p_usuario_id   UUID  DEFAULT NULL,
  p_observacion  TEXT  DEFAULT NULL,
  p_metadata     JSONB DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_estado_actual        VARCHAR(30);
  v_razon_social         VARCHAR(255);
  v_proceso_id           UUID;
  v_requiere_observacion BOOLEAN;
BEGIN
  SELECT estado, razon_social, proceso_id
  INTO v_estado_actual, v_razon_social, v_proceso_id
  FROM propuestas
  WHERE id = p_propuesta_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPUESTA_NOT_FOUND: Propuesta % no encontrada', p_propuesta_id;
  END IF;

  IF NOT validar_transicion_estado(v_estado_actual, p_estado_nuevo) THEN
    RAISE EXCEPTION
      'INVALID_TRANSITION: La transición "%" → "%" no está permitida',
      v_estado_actual, p_estado_nuevo;
  END IF;

  SELECT te.requiere_observacion
  INTO v_requiere_observacion
  FROM transiciones_estado te
  WHERE te.estado_origen = v_estado_actual AND te.estado_destino = p_estado_nuevo;

  IF v_requiere_observacion IS TRUE
     AND (p_observacion IS NULL OR trim(p_observacion) = '')
  THEN
    RAISE EXCEPTION
      'OBSERVACION_REQUERIDA: La transición "%" → "%" requiere una observación',
      v_estado_actual, p_estado_nuevo;
  END IF;

  UPDATE propuestas
  SET estado = p_estado_nuevo, updated_at = NOW()
  WHERE id = p_propuesta_id;

  INSERT INTO historial_estados_propuesta
    (propuesta_id, estado_anterior, estado_nuevo, usuario_id, observacion, metadata)
  VALUES
    (p_propuesta_id, v_estado_actual, p_estado_nuevo, p_usuario_id, p_observacion, p_metadata);

  INSERT INTO audit_log
    (proceso_id, accion, entidad, entidad_id, datos_anteriores, datos_nuevos)
  VALUES (
    v_proceso_id,
    'CAMBIO_ESTADO',
    'propuesta',
    p_propuesta_id,
    jsonb_build_object('estado', v_estado_actual, 'razon_social', v_razon_social),
    jsonb_build_object('estado', p_estado_nuevo, 'observacion', p_observacion,
                       'usuario_id', p_usuario_id::TEXT)
  );

  RETURN jsonb_build_object(
    'success',         true,
    'propuesta_id',    p_propuesta_id,
    'estado_anterior', v_estado_actual,
    'estado_nuevo',    p_estado_nuevo,
    'razon_social',    v_razon_social
  );
END;
$$;

-- ============================================================
-- VISTAS
-- ============================================================

-- Resumen de propuestas con estadísticas
CREATE OR REPLACE VIEW vista_propuestas_resumen AS
SELECT
  p.id,
  p.proceso_id,
  p.razon_social,
  p.tipo_persona,
  p.nit_cedula,
  p.anios_experiencia,
  p.unidades_administradas,
  p.valor_honorarios,
  p.estado,
  p.puntaje_evaluacion,
  p.votos_recibidos,
  p.puntaje_final,
  pr.nombre  AS proceso_nombre,
  pr.estado  AS proceso_estado,
  c.nombre   AS conjunto_nombre,
  (SELECT COUNT(*) FROM documentos d WHERE d.propuesta_id = p.id AND d.estado = 'APROBADO')  AS docs_aprobados,
  (SELECT COUNT(*) FROM documentos d WHERE d.propuesta_id = p.id)                            AS docs_total
FROM propuestas p
JOIN procesos  pr ON p.proceso_id  = pr.id
JOIN conjuntos c  ON pr.conjunto_id = c.id;

-- Estado de evaluaciones por consejero
CREATE OR REPLACE VIEW vista_evaluaciones_consejero AS
SELECT
  co.id              AS consejero_id,
  co.nombre_completo,
  co.cargo,
  pr.id              AS proceso_id,
  pr.nombre          AS proceso_nombre,
  (SELECT COUNT(DISTINCT p.id) FROM propuestas p
   WHERE p.proceso_id = pr.id AND p.estado = 'en_evaluacion') AS total_propuestas,
  (SELECT COUNT(DISTINCT e.propuesta_id) FROM evaluaciones e
   WHERE e.consejero_id = co.id AND e.proceso_id = pr.id)     AS propuestas_evaluadas,
  EXISTS (SELECT 1 FROM votos v
          WHERE v.consejero_id = co.id AND v.proceso_id = pr.id) AS ha_votado
FROM consejeros co
CROSS JOIN procesos pr
WHERE co.conjunto_id = pr.conjunto_id AND co.activo = true;

-- Roles con sus permisos
CREATE OR REPLACE VIEW vista_roles_permisos AS
SELECT
  r.id          AS rol_id,
  r.nombre      AS rol_nombre,
  r.descripcion AS rol_descripcion,
  r.conjunto_id,
  r.es_sistema,
  r.activo,
  COALESCE(
    json_agg(
      json_build_object(
        'id',       p.id,
        'codigo',   p.codigo,
        'nombre',   p.nombre,
        'categoria', p.categoria
      )
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'
  ) AS permisos
FROM roles r
LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos       p  ON rp.permiso_id = p.id
GROUP BY r.id, r.nombre, r.descripcion, r.conjunto_id, r.es_sistema, r.activo;
