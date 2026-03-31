-- =====================================================
-- Sistema de Selección de Administradores PH Colombia
-- Ley 675 de 2001
-- =====================================================

-- 1. TABLA: CONJUNTOS RESIDENCIALES
-- =====================================================
CREATE TABLE IF NOT EXISTS conjuntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  direccion VARCHAR(500) NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  anio INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  logo_url TEXT,
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'archivado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: PROCESOS DE SELECCIÓN
-- =====================================================
CREATE TABLE IF NOT EXISTS procesos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id UUID NOT NULL REFERENCES conjuntos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  peso_evaluacion INTEGER DEFAULT 70 CHECK (peso_evaluacion >= 0 AND peso_evaluacion <= 100),
  peso_votacion INTEGER DEFAULT 30 CHECK (peso_votacion >= 0 AND peso_votacion <= 100),
  estado VARCHAR(20) DEFAULT 'configuracion' CHECK (estado IN ('configuracion', 'evaluacion', 'votacion', 'finalizado', 'cancelado')),
  created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT peso_total_check CHECK (peso_evaluacion + peso_votacion = 100)
);

-- 3. TABLA: CONSEJEROS
-- =====================================================
CREATE TABLE IF NOT EXISTS consejeros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id UUID NOT NULL REFERENCES conjuntos(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(255) NOT NULL,
  cargo VARCHAR(50) NOT NULL CHECK (cargo IN ('presidente', 'vicepresidente', 'secretario', 'tesorero', 'vocal_principal', 'consejero', 'consejero_suplente')),
  torre VARCHAR(50),
  apartamento VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(50),
  codigo_acceso VARCHAR(8) UNIQUE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consejeros
  ADD COLUMN IF NOT EXISTS cargo TEXT;

ALTER TABLE consejeros
  ADD COLUMN IF NOT EXISTS codigo_acceso TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS consejeros_codigo_acceso_unique
  ON consejeros (codigo_acceso)
  WHERE codigo_acceso IS NOT NULL;

-- 4. TABLA: PROPUESTAS DE ADMINISTRADORES
-- =====================================================
CREATE TABLE IF NOT EXISTS propuestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id UUID NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
  tipo_persona VARCHAR(20) NOT NULL CHECK (tipo_persona IN ('juridica', 'natural')),
  razon_social VARCHAR(255) NOT NULL,
  nit_cedula VARCHAR(50) NOT NULL,
  representante_legal VARCHAR(255),
  anios_experiencia INTEGER DEFAULT 0,
  unidades_administradas INTEGER DEFAULT 0,
  telefono VARCHAR(50),
  email VARCHAR(255),
  direccion TEXT,
  valor_honorarios DECIMAL(15, 2),
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'registro' CHECK (estado IN ('registro', 'incompleto', 'no_apto_legal', 'habilitada', 'en_evaluacion', 'no_apto', 'adjudicado', 'descalificada', 'retirada')),
  clasificacion VARCHAR(20) CHECK (clasificacion IN ('destacado', 'apto', 'condicionado', 'no_apto')),
  cumple_requisitos_legales BOOLEAN DEFAULT false,
  observaciones_legales TEXT,
  puntaje_legal DECIMAL(5, 2) DEFAULT 0,
  puntaje_tecnico DECIMAL(5, 2) DEFAULT 0,
  puntaje_financiero DECIMAL(5, 2) DEFAULT 0,
  puntaje_referencias DECIMAL(5, 2) DEFAULT 0,
  puntaje_propuesta DECIMAL(5, 2) DEFAULT 0,
  puntaje_evaluacion DECIMAL(5, 2) DEFAULT 0,
  votos_recibidos INTEGER DEFAULT 0,
  puntaje_final DECIMAL(5, 2) DEFAULT 0,
  created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: DOCUMENTOS
-- 10. TABLA: CATÁLOGO DE TIPOS DE DOCUMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS tipos_documento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('legal', 'financiero', 'tecnico', 'referencia')),
  es_obligatorio BOOLEAN DEFAULT true,
  tipo_persona VARCHAR(20) NOT NULL DEFAULT 'ambos' CHECK (tipo_persona IN ('juridica', 'natural', 'ambos')),
  dias_vigencia INTEGER DEFAULT 365,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: DOCUMENTOS (Actualizada para gestión y validación)
-- =====================================================
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  tipo_documento_id UUID REFERENCES tipos_documento(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL, -- Mantener por compatibilidad
  nombre VARCHAR(255) NOT NULL,
  archivo_url TEXT,
  archivo_pathname TEXT,
  es_obligatorio BOOLEAN DEFAULT false,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'CARGADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'VENCIDO')),
  fecha_vencimiento DATE,
  observaciones TEXT,
  validado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_validacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers para tipos_documento
CREATE TRIGGER update_tipos_documento_updated_at BEFORE UPDATE ON tipos_documento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. TABLA: CRITERIOS DE EVALUACIÓN
-- =====================================================
CREATE TABLE IF NOT EXISTS criterios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id UUID NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  peso DECIMAL(5, 2) NOT NULL CHECK (peso > 0 AND peso <= 100),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('numerico', 'booleano', 'escala')),
  valor_minimo INTEGER DEFAULT 1,
  valor_maximo INTEGER DEFAULT 5,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: EVALUACIONES
-- 7. TABLA: EVALUACIONES (Actualizada para gestión administrativa)
-- =====================================================
CREATE TABLE IF NOT EXISTS evaluaciones_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  evaluador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  puntaje_total DECIMAL(5, 2) NOT NULL DEFAULT 0,
  clasificacion VARCHAR(20) CHECK (clasificacion IN ('destacado', 'apto', 'condicionado', 'no_apto')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABLA: PUNTAJES DETALLADOS (1 por criterio)
-- =====================================================
CREATE TABLE IF NOT EXISTS puntajes_criterio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES evaluaciones_admin(id) ON DELETE CASCADE,
  criterio_codigo VARCHAR(50) NOT NULL,
  puntaje DECIMAL(5, 2) NOT NULL,
  valor_original TEXT, -- Para guardar qué opción seleccionó
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: EVALUACIONES (Original para Consejeros)
-- =====================================================
CREATE TABLE IF NOT EXISTS evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id UUID NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
  consejero_id UUID NOT NULL REFERENCES consejeros(id) ON DELETE CASCADE,
  propuesta_id UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  criterio_id UUID NOT NULL REFERENCES criterios(id) ON DELETE CASCADE,
  valor DECIMAL(5, 2) NOT NULL,
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(consejero_id, propuesta_id, criterio_id)
);

-- 8. TABLA: VOTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS votos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id UUID NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
  consejero_id UUID NOT NULL REFERENCES consejeros(id) ON DELETE CASCADE,
  propuesta_id UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  justificacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proceso_id, consejero_id)
);

-- 9. TABLA: AUDITORÍA
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id UUID REFERENCES conjuntos(id) ON DELETE SET NULL,
  proceso_id UUID REFERENCES procesos(id) ON DELETE SET NULL,
  consejero_id UUID REFERENCES consejeros(id) ON DELETE SET NULL,
  accion VARCHAR(50) NOT NULL,
  entidad VARCHAR(50) NOT NULL,
  entidad_id UUID,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_procesos_conjunto ON procesos(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_consejeros_conjunto ON consejeros(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_consejeros_codigo ON consejeros(codigo_acceso);
CREATE INDEX IF NOT EXISTS idx_propuestas_proceso ON propuestas(proceso_id);
CREATE INDEX IF NOT EXISTS idx_documentos_propuesta ON documentos(propuesta_id);
CREATE INDEX IF NOT EXISTS idx_criterios_proceso ON criterios(proceso_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_proceso ON evaluaciones(proceso_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_consejero ON evaluaciones(consejero_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_propuesta ON evaluaciones(propuesta_id);
CREATE INDEX IF NOT EXISTS idx_votos_proceso ON votos(proceso_id);
CREATE INDEX IF NOT EXISTS idx_audit_conjunto ON audit_log(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_audit_proceso ON audit_log(proceso_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- =====================================================
-- SEED DATA: Tipos de Documento
-- =====================================================
INSERT INTO tipos_documento (codigo, nombre, categoria, es_obligatorio, tipo_persona) VALUES
-- Jurídica
('CAMARA_COMERCIO', 'Cámara de Comercio (vigente)', 'legal', true, 'juridica'),
('RUT_JUR', 'RUT Empresa', 'legal', true, 'juridica'),
('POLIZA_RC', 'Póliza Responsabilidad Civil', 'legal', true, 'juridica'),
('POLIZA_CUMPLIMIENTO', 'Póliza de Cumplimiento', 'legal', true, 'juridica'),
('ESTADOS_FINANCIEROS', 'Estados Financieros (último año)', 'financiero', true, 'juridica'),
-- Natural
('CEDULA', 'Cédula de Ciudadanía', 'legal', true, 'natural'),
('RUT_NAT', 'RUT Persona Natural', 'legal', true, 'natural'),
('HOJA_VIDA', 'Hoja de Vida Detallada', 'tecnico', true, 'natural'),
('ANTECEDENTES', 'Certificado de Antecedentes (Procuraduría/Policía)', 'legal', true, 'natural'),
-- Ambos
('REFERENCIAS', 'Referencias Comerciales/Personales', 'referencia', true, 'ambos'),
('PROPUESTA_TEC', 'Propuesta Técnica y Económica', 'tecnico', true, 'ambos')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE conjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE procesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE consejeros ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE criterios ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para el sistema (usando service role en el backend)
-- En producción, estas políticas deberían ser más restrictivas según el modelo de autenticación

CREATE POLICY "allow_all_conjuntos" ON conjuntos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_procesos" ON procesos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_consejeros" ON consejeros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_propuestas" ON propuestas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_documentos" ON documentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_criterios" ON criterios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_evaluaciones" ON evaluaciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_votos" ON votos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_audit" ON audit_log FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- FUNCIÓN: Actualizar timestamp updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_conjuntos_updated_at BEFORE UPDATE ON conjuntos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_procesos_updated_at BEFORE UPDATE ON procesos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consejeros_updated_at BEFORE UPDATE ON consejeros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_propuestas_updated_at BEFORE UPDATE ON propuestas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_criterios_updated_at BEFORE UPDATE ON criterios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluaciones_updated_at BEFORE UPDATE ON evaluaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIÓN: Generar código de acceso único
-- =====================================================
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar código de acceso automáticamente
CREATE OR REPLACE FUNCTION set_consejero_codigo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_acceso IS NULL THEN
    LOOP
      NEW.codigo_acceso := generate_access_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM consejeros WHERE codigo_acceso = NEW.codigo_acceso);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_consejero_codigo_trigger BEFORE INSERT ON consejeros
  FOR EACH ROW EXECUTE FUNCTION set_consejero_codigo();

-- =====================================================
-- FUNCIÓN: Verificar vencimiento automático de documentos
-- =====================================================
CREATE OR REPLACE FUNCTION verificar_vencimiento_documentos()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fecha_vencimiento IS NOT NULL AND NEW.fecha_vencimiento < CURRENT_DATE THEN
    NEW.estado = 'VENCIDO';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_verificar_vencimiento
  BEFORE INSERT OR UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION verificar_vencimiento_documentos();

-- =====================================================
-- FUNCIÓN: Calcular puntaje ponderado de propuesta
-- Escala 0-100 con criterios específicos del flujo
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_puntaje_propuesta(p_propuesta_id UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
  v_puntaje DECIMAL(5, 2);
  v_proceso_id UUID;
  v_total_peso DECIMAL(5, 2);
BEGIN
  -- Obtener el proceso de la propuesta
  SELECT proceso_id INTO v_proceso_id FROM propuestas WHERE id = p_propuesta_id;
  
  -- Obtener suma total de pesos de criterios activos
  SELECT COALESCE(SUM(peso), 0) INTO v_total_peso 
  FROM criterios 
  WHERE proceso_id = v_proceso_id AND activo = true;
  
  IF v_total_peso = 0 THEN
    RETURN 0;
  END IF;
  
  -- Calcular puntaje ponderado promedio (escala 0-100)
  -- Asumiendo que e.valor está en escala 1-5, convertimos a base 100
  SELECT COALESCE(
    SUM((e.valor / c.valor_maximo * 100) * c.peso / v_total_peso) / NULLIF(COUNT(DISTINCT e.consejero_id), 0),
    0
  ) INTO v_puntaje
  FROM evaluaciones e
  JOIN criterios c ON e.criterio_id = c.id
  WHERE e.propuesta_id = p_propuesta_id AND c.activo = true;
  
  RETURN ROUND(v_puntaje, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Clasificar automáticamente al candidato
-- =====================================================
CREATE OR REPLACE FUNCTION clasificar_candidato(p_puntaje DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
  IF p_puntaje >= 85 THEN RETURN 'destacado';
  ELSIF p_puntaje >= 70 THEN RETURN 'apto';
  ELSIF p_puntaje >= 55 THEN RETURN 'condicionado';
  ELSE RETURN 'no_apto';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Calcular puntaje final (evaluación + votación)
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_puntaje_final(p_proceso_id UUID)
RETURNS VOID AS $$
DECLARE
  v_peso_evaluacion INTEGER;
  v_peso_votacion INTEGER;
  v_max_votos INTEGER;
  v_total_consejeros INTEGER;
BEGIN
  -- Obtener pesos del proceso
  SELECT peso_evaluacion, peso_votacion 
  INTO v_peso_evaluacion, v_peso_votacion
  FROM procesos WHERE id = p_proceso_id;

  -- Obtener total de consejeros activos del conjunto
  SELECT COUNT(*) INTO v_total_consejeros
  FROM consejeros co
  JOIN procesos pr ON pr.conjunto_id = co.conjunto_id
  WHERE pr.id = p_proceso_id AND co.activo = true;
  
  -- Actualizar puntajes de evaluación y clasificación inicial
  UPDATE propuestas 
  SET
    puntaje_evaluacion = calcular_puntaje_propuesta(id),
    estado = CASE
      WHEN calcular_puntaje_propuesta(id) < 55 THEN 'no_apto'
      ELSE 'en_evaluacion'
    END,
    clasificacion = clasificar_candidato(calcular_puntaje_propuesta(id))
  WHERE proceso_id = p_proceso_id AND estado IN ('habilitada', 'en_evaluacion');
  
  -- Contar votos por propuesta
  UPDATE propuestas p
  SET votos_recibidos = (
    SELECT COUNT(*) FROM votos v WHERE v.propuesta_id = p.id
  )
  WHERE proceso_id = p_proceso_id;
  
  -- Calcular puntaje final normalizado (escala 0-100)
  -- El puntaje de evaluación ya está en escala 100.
  -- Los votos se normalizan según el total de consejeros.
  UPDATE propuestas
  SET puntaje_final = ROUND(
    (puntaje_evaluacion * v_peso_evaluacion / 100) +
    (CASE WHEN v_total_consejeros > 0 THEN (votos_recibidos::DECIMAL / v_total_consejeros * 100) ELSE 0 END) * v_peso_votacion / 100,
    2
  )
  WHERE proceso_id = p_proceso_id AND estado != 'no_apto_legal' AND estado != 'retirada' AND estado != 'descalificada';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Verificar completitud de documentos de propuesta
-- =====================================================
CREATE OR REPLACE FUNCTION verificar_documentos_propuesta(p_propuesta_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_tipo_persona VARCHAR;
  v_faltantes INTEGER;
BEGIN
  -- Obtener tipo de persona de la propuesta
  SELECT tipo_persona INTO v_tipo_persona FROM propuestas WHERE id = p_propuesta_id;

  -- Contar tipos de documento obligatorios para ese tipo de persona que NO están aprobados
  -- (Consideramos que una propuesta está 'completa' solo si todos los obligatorios están APROBADOS o al menos CARGADOS según lógica de negocio)
  -- Aquí definimos que deben estar APROBADOS para avanzar de fase.

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
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estado de propuesta basado en documentos
CREATE OR REPLACE FUNCTION actualizar_estado_por_documentos()
RETURNS TRIGGER AS $$
DECLARE
  v_completitud VARCHAR;
  v_todos_aprobados BOOLEAN;
BEGIN
  v_completitud := verificar_documentos_propuesta(NEW.propuesta_id);

  -- Verificar si TODOS los documentos obligatorios están ya APROBADOS
  SELECT NOT EXISTS (
    SELECT 1 FROM tipos_documento td
    WHERE td.activo = true
      AND td.es_obligatorio = true
      AND (td.tipo_persona = (SELECT tipo_persona FROM propuestas WHERE id = NEW.propuesta_id) OR td.tipo_persona = 'ambos')
      AND NOT EXISTS (
        SELECT 1 FROM documentos d
        WHERE d.propuesta_id = NEW.propuesta_id
          AND d.tipo_documento_id = td.id
          AND d.estado = 'APROBADO'
      )
  ) INTO v_todos_aprobados;

  IF v_completitud = 'INCOMPLETA' THEN
    UPDATE propuestas SET estado = 'incompleto' WHERE id = NEW.propuesta_id AND estado IN ('registro', 'habilitada', 'incompleto');
  ELSIF v_todos_aprobados THEN
    UPDATE propuestas SET estado = 'habilitada' WHERE id = NEW.propuesta_id AND estado IN ('registro', 'incompleto');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_estado_propuesta
  AFTER INSERT OR UPDATE OF estado ON documentos
  FOR EACH ROW EXECUTE FUNCTION actualizar_estado_por_documentos();

-- =====================================================
-- VISTA: Resumen de propuestas con estadísticas
-- =====================================================
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
  pr.nombre as proceso_nombre,
  pr.estado as proceso_estado,
  c.nombre as conjunto_nombre,
  (SELECT COUNT(*) FROM documentos d WHERE d.propuesta_id = p.id AND d.estado IN ('CARGADO', 'EN_REVISION', 'APROBADO')) as docs_completos,
  (SELECT COUNT(*) FROM documentos d WHERE d.propuesta_id = p.id) as docs_total
FROM propuestas p
JOIN procesos pr ON p.proceso_id = pr.id
JOIN conjuntos c ON pr.conjunto_id = c.id;

-- =====================================================
-- VISTA: Estado de evaluaciones por consejero
-- =====================================================
CREATE OR REPLACE VIEW vista_evaluaciones_consejero AS
SELECT 
  co.id as consejero_id,
  co.nombre_completo,
  co.cargo,
  pr.id as proceso_id,
  pr.nombre as proceso_nombre,
  (SELECT COUNT(DISTINCT p.id) FROM propuestas p WHERE p.proceso_id = pr.id AND p.estado = 'activa') as total_propuestas,
  (SELECT COUNT(DISTINCT e.propuesta_id) FROM evaluaciones e WHERE e.consejero_id = co.id AND e.proceso_id = pr.id) as propuestas_evaluadas,
  EXISTS(SELECT 1 FROM votos v WHERE v.consejero_id = co.id AND v.proceso_id = pr.id) as ha_votado
FROM consejeros co
CROSS JOIN procesos pr
WHERE co.conjunto_id = pr.conjunto_id AND co.activo = true;
