-- ============================================================
-- MIGRACIÓN 003: MÁQUINA DE ESTADOS DE PROPUESTAS
-- Sistema de Selección de Administradores PH — Ley 675
-- ============================================================
-- Este script es idempotente: puede ejecutarse múltiples veces
-- sin efectos secundarios. Usa IF NOT EXISTS y ON CONFLICT.
-- ============================================================

-- ============================================================
-- PASO 1: SOLTAR EL CHECK CONSTRAINT EXISTENTE
-- Debe hacerse ANTES de migrar datos para que el UPDATE
-- no sea bloqueado por el constraint original ('activa',
-- 'descalificada', 'retirada') que no conoce los nuevos estados.
-- ============================================================
ALTER TABLE propuestas
  DROP CONSTRAINT IF EXISTS propuestas_estado_check;

-- También cubre el nombre alternativo usado en algunas versiones
ALTER TABLE propuestas
  DROP CONSTRAINT IF EXISTS propuestas_estado_check1;

DO $$
BEGIN
  RAISE NOTICE '[003] Constraint propuestas_estado_check eliminado (si existía).';
END $$;

-- ============================================================
-- PASO 2: MIGRACIÓN DE DATOS — estados legacy → nuevo esquema
-- Ahora es seguro hacer el UPDATE porque no hay constraint activo.
-- ============================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 'activa' (estado original v1) → 'en_evaluacion'
  -- Se asume que las propuestas 'activas' ya pasaron revisión documental
  -- y validación legal en el flujo anterior.
  UPDATE propuestas SET estado = 'en_evaluacion' WHERE estado = 'activa';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[003] Filas migradas "activa" → "en_evaluacion": %', v_count;

  -- 'descalificada' y 'retirada' se mantienen — son estados válidos en el nuevo esquema.
END $$;

-- ============================================================
-- PASO 3: AGREGAR EL NUEVO CHECK CONSTRAINT
-- Incluye todos los estados del flujo completo.
-- Se aplica DESPUÉS de la migración de datos para que las
-- filas ya actualizadas sean válidas en el nuevo constraint.
-- ============================================================
ALTER TABLE propuestas
  ADD CONSTRAINT propuestas_estado_check CHECK (
    estado IN (
      -- Ingreso y revisión documental
      'registro',           -- Candidato registrado, pendiente de revisión
      'en_revision',        -- Admin inició revisión documental
      'incompleto',         -- Documentación incompleta — se solicita subsanar
      'en_subsanacion',     -- Candidato tiene plazo activo para corregir
      -- Validación legal
      'en_validacion',      -- Revisión legal activa (SARLAFT, antecedentes, pólizas)
      'no_apto_legal',      -- ELIMINATORIO: no pasa validación legal
      -- Evaluación
      'habilitada',         -- Aprobó legal, habilitado para evaluación
      'en_evaluacion',      -- En evaluación activa por consejeros
      -- Resultados de evaluación
      'condicionado',       -- Puntaje 55–69
      'apto',               -- Puntaje 70–84
      'destacado',          -- Puntaje ≥ 85
      'no_apto',            -- Puntaje < 55 — no supera el mínimo
      -- Terminales
      'adjudicado',         -- Seleccionado formalmente por el consejo
      'descalificada',      -- Descalificado por incumplimiento grave
      'retirada'            -- Retirado voluntariamente del proceso
    )
  );

DO $$
BEGIN
  RAISE NOTICE '[003] Nuevo constraint propuestas_estado_check aplicado con 15 estados.';
END $$;

-- ============================================================
-- PASO 3: TABLA DE HISTORIAL DE ESTADOS
-- Registro inmutable de cada transición. Solo INSERT, nunca UPDATE.
-- ============================================================
CREATE TABLE IF NOT EXISTS historial_estados_propuesta (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id    UUID         NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  -- Estado anterior es NULL en el primer registro (estado inicial del candidato)
  estado_anterior VARCHAR(30),
  estado_nuevo    VARCHAR(30)  NOT NULL,
  -- UUID del usuario Supabase Auth que ejecutó el cambio (NULL = sistema/automático)
  usuario_id      UUID,
  observacion     TEXT,
  -- JSONB para datos adicionales: ip_address, user_agent, motivo_sistema, etc.
  metadata        JSONB,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_propuesta_id
  ON historial_estados_propuesta(propuesta_id);

CREATE INDEX IF NOT EXISTS idx_historial_created_at
  ON historial_estados_propuesta(created_at DESC);

-- RLS: misma política permisiva que el resto del sistema
ALTER TABLE historial_estados_propuesta ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'historial_estados_propuesta'
      AND policyname = 'allow_all_historial_estados'
  ) THEN
    CREATE POLICY "allow_all_historial_estados"
      ON historial_estados_propuesta
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- PASO 4: TABLA DE TRANSICIONES VÁLIDAS
-- Define el grafo completo de estados. Fuente única de verdad.
-- ============================================================
CREATE TABLE IF NOT EXISTS transiciones_estado (
  id                   SERIAL       PRIMARY KEY,
  estado_origen        VARCHAR(30)  NOT NULL,
  estado_destino       VARCHAR(30)  NOT NULL,
  -- Si TRUE, la API exige que 'observacion' no sea nula ni vacía
  requiere_observacion BOOLEAN      DEFAULT FALSE,
  -- Descripción legible del motivo de esta transición
  descripcion          VARCHAR(255),
  UNIQUE (estado_origen, estado_destino)
);

-- Poblar transiciones (idempotente con ON CONFLICT DO NOTHING)
INSERT INTO transiciones_estado
  (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  -- ── Flujo principal ──────────────────────────────────────────────
  ('registro',       'en_revision',    false, 'Admin inicia revisión documental del candidato'),
  ('registro',       'en_evaluacion',  false, 'Documentación completa, pasa a evaluación'),
  ('en_revision',    'incompleto',     true,  'Se detecta documentación incompleta o inválida'),
  ('en_revision',    'en_validacion',  false, 'Documentación completa, pasa a validación legal'),
  ('en_revision',    'en_evaluacion',  false, 'Documentación completa, pasa a evaluación'),
  ('incompleto',     'en_subsanacion', false, 'Se notifica al candidato el plazo de subsanación'),
  ('incompleto',     'en_evaluacion',  false, 'Documentación completa, pasa a evaluación'),
  ('en_subsanacion', 'en_validacion',  false, 'Candidato subsanó documentación correctamente'),
  ('en_subsanacion', 'en_evaluacion',  false, 'Documentación completa, pasa a evaluación'),
  ('en_subsanacion', 'descalificada',  true,  'Candidato no subsanó en el plazo establecido'),
  ('en_validacion',  'en_evaluacion',  false, 'Documentación completa, pasa a evaluación'),
  ('en_validacion',  'no_apto_legal',  true,  'No supera validación legal (SARLAFT, antecedentes, paz y salvo)'),
  ('en_validacion',  'habilitada',     false, 'Cumple todos los requisitos legales, habilitado para evaluación'),
  ('habilitada',     'en_evaluacion',  false, 'Proceso de evaluación activado'),
  -- ── Resultados de evaluación ─────────────────────────────────────
  ('en_evaluacion',  'no_apto',        false, 'Puntaje final < 55, no supera el mínimo reglamentario'),
  ('en_evaluacion',  'condicionado',   false, 'Puntaje final entre 55 y 69'),
  ('en_evaluacion',  'apto',           false, 'Puntaje final entre 70 y 84'),
  ('en_evaluacion',  'destacado',      false, 'Puntaje final ≥ 85'),
  ('no_apto',        'en_evaluacion',  true,  'Reapertura de evaluación para nueva calificación'),
  -- ── Adjudicación por el consejo ──────────────────────────────────
  -- Solo candidatos APTO, CONDICIONADO o DESTACADO pueden adjudicarse
  ('condicionado',   'adjudicado',     true,  'Adjudicado con condiciones por aprobación del consejo'),
  ('apto',           'adjudicado',     false, 'Adjudicado por aprobación del consejo'),
  ('destacado',      'adjudicado',     false, 'Adjudicado por aprobación del consejo (clasificación destacada)'),
  -- ── Retiro voluntario (desde cualquier estado activo no terminal) ─
  ('registro',       'retirada',       true,  'Candidato retirado voluntariamente del proceso'),
  ('en_revision',    'retirada',       true,  'Candidato retirado durante revisión documental'),
  ('incompleto',     'retirada',       true,  'Candidato retirado con documentación incompleta'),
  ('en_subsanacion', 'retirada',       true,  'Candidato retirado durante período de subsanación'),
  ('en_validacion',  'retirada',       true,  'Candidato retirado durante validación legal'),
  ('habilitada',     'retirada',       true,  'Candidato retirado estando habilitado'),
  ('en_evaluacion',  'retirada',       true,  'Candidato retirado durante proceso de evaluación')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;

-- ============================================================
-- PASO 5: FUNCIÓN — Validar si una transición es permitida
-- Consulta la tabla transiciones_estado. Pura lectura.
-- ============================================================
CREATE OR REPLACE FUNCTION validar_transicion_estado(
  p_origen  VARCHAR,
  p_destino VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
      FROM transiciones_estado
     WHERE estado_origen  = p_origen
       AND estado_destino = p_destino
  );
END;
$$;

-- ============================================================
-- PASO 6: FUNCIÓN — Obtener transiciones disponibles desde un estado
-- Usada por el frontend para mostrar solo las opciones válidas.
-- ============================================================
CREATE OR REPLACE FUNCTION get_transiciones_disponibles(
  p_estado_actual VARCHAR
)
RETURNS TABLE (
  estado_destino       VARCHAR,
  requiere_observacion BOOLEAN,
  descripcion          VARCHAR
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT te.estado_destino,
           te.requiere_observacion,
           te.descripcion
      FROM transiciones_estado te
     WHERE te.estado_origen = p_estado_actual
     ORDER BY te.id;
END;
$$;

-- ============================================================
-- PASO 7: FUNCIÓN CENTRAL — Cambiar estado de una propuesta
--
-- Responsabilidades:
--   1. Adquiere lock de fila (evita condiciones de carrera)
--   2. Valida que la transición exista en transiciones_estado
--   3. Verifica observación obligatoria
--   4. Aplica el cambio en propuestas
--   5. Inserta registro inmutable en historial_estados_propuesta
--   6. Inserta registro en audit_log
--   7. Retorna JSONB con el resultado
--
-- Errores lanzados (prefijo permite discriminar en el cliente):
--   PROPUESTA_NOT_FOUND  — UUID inválido o no existe
--   INVALID_TRANSITION   — Transición no definida en el grafo
--   OBSERVACION_REQUERIDA — La transición exige una observación
-- ============================================================
CREATE OR REPLACE FUNCTION cambiar_estado_propuesta(
  p_propuesta_id UUID,
  p_estado_nuevo VARCHAR,
  p_usuario_id   UUID    DEFAULT NULL,
  p_observacion  TEXT    DEFAULT NULL,
  p_metadata     JSONB   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_estado_actual        VARCHAR(30);
  v_razon_social         VARCHAR(255);
  v_proceso_id           UUID;
  v_requiere_observacion BOOLEAN;
BEGIN
  -- ── 1. Leer y bloquear la fila ────────────────────────────────────
  SELECT estado, razon_social, proceso_id
    INTO v_estado_actual, v_razon_social, v_proceso_id
    FROM propuestas
   WHERE id = p_propuesta_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPUESTA_NOT_FOUND: Propuesta % no encontrada', p_propuesta_id;
  END IF;

  -- ── 2. Verificar que la transición esté en el grafo ──────────────
  IF NOT validar_transicion_estado(v_estado_actual, p_estado_nuevo) THEN
    RAISE EXCEPTION
      'INVALID_TRANSITION: La transición "%" → "%" no está permitida en el flujo definido',
      v_estado_actual, p_estado_nuevo;
  END IF;

  -- ── 3. Verificar observación obligatoria ─────────────────────────
  SELECT te.requiere_observacion
    INTO v_requiere_observacion
    FROM transiciones_estado te
   WHERE te.estado_origen  = v_estado_actual
     AND te.estado_destino = p_estado_nuevo;

  IF v_requiere_observacion IS TRUE
     AND (p_observacion IS NULL OR trim(p_observacion) = '')
  THEN
    RAISE EXCEPTION
      'OBSERVACION_REQUERIDA: La transición "%" → "%" requiere una observación',
      v_estado_actual, p_estado_nuevo;
  END IF;

  -- ── 4. Aplicar cambio de estado ───────────────────────────────────
  UPDATE propuestas
     SET estado     = p_estado_nuevo,
         updated_at = NOW()
   WHERE id = p_propuesta_id;

  -- ── 5. Registrar en historial de estados (inmutable) ─────────────
  INSERT INTO historial_estados_propuesta
    (propuesta_id, estado_anterior, estado_nuevo, usuario_id, observacion, metadata)
  VALUES
    (p_propuesta_id, v_estado_actual, p_estado_nuevo, p_usuario_id, p_observacion, p_metadata);

  -- ── 6. Registrar en audit_log ─────────────────────────────────────
  INSERT INTO audit_log
    (proceso_id, accion, entidad, entidad_id, datos_anteriores, datos_nuevos)
  VALUES (
    v_proceso_id,
    'CAMBIO_ESTADO',
    'propuesta',
    p_propuesta_id,
    jsonb_build_object(
      'estado',       v_estado_actual,
      'razon_social', v_razon_social
    ),
    jsonb_build_object(
      'estado',       p_estado_nuevo,
      'observacion',  p_observacion,
      'usuario_id',   p_usuario_id::TEXT
    )
  );

  -- ── 7. Retornar resultado ─────────────────────────────────────────
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
-- PASO 8: REGISTRO INICIAL DE HISTORIAL PARA DATOS EXISTENTES
-- Inserta el estado actual como "estado inicial" en el historial
-- para propuestas que ya existían antes de esta migración.
-- Solo inserta si la propuesta aún no tiene registro en historial.
-- ============================================================
INSERT INTO historial_estados_propuesta
  (propuesta_id, estado_anterior, estado_nuevo, observacion, created_at)
SELECT
  p.id,
  NULL,            -- sin estado anterior — este es el punto de origen
  p.estado,
  'Registro inicial creado por migración 003_state_machine',
  COALESCE(p.created_at, NOW())
  FROM propuestas p
 WHERE NOT EXISTS (
   SELECT 1
     FROM historial_estados_propuesta h
    WHERE h.propuesta_id = p.id
 );

DO $$
BEGIN
  RAISE NOTICE '[003] Migración completada: tablas, funciones y datos iniciales creados.';
END $$;
