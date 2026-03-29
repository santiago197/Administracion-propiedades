-- ============================================================
-- 001_schema.sql
-- Todas las tablas, índices y triggers de updated_at.
-- Sin lógica de negocio, sin RLS.
-- Ejecutar primero en Supabase SQL Editor (instalación nueva).
-- ============================================================

-- ============================================================
-- FUNCIÓN: updated_at (debe definirse ANTES de cualquier trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. CONJUNTOS RESIDENCIALES
-- ============================================================
CREATE TABLE IF NOT EXISTS conjuntos (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     VARCHAR(255) NOT NULL,
  direccion  VARCHAR(500) NOT NULL,
  ciudad     VARCHAR(100) NOT NULL,
  anio       INTEGER      NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  logo_url   TEXT,
  estado     VARCHAR(20)  DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'archivado')),
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- 2. USUARIOS (referencia 1:1 con auth.users de Supabase)
-- Debe crearse ANTES que cualquier tabla que la referencie.
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL,
  nombre        VARCHAR(255),
  rol           VARCHAR(20)  NOT NULL DEFAULT 'admin'
                             CHECK (rol IN ('superadmin', 'admin', 'evaluador', 'consejero')),
  conjunto_id   UUID         REFERENCES conjuntos(id) ON DELETE SET NULL,
  activo        BOOLEAN      DEFAULT true,
  ultimo_acceso TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email    ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_conjunto ON usuarios(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol      ON usuarios(rol);

-- ============================================================
-- 3. TIPOS DE DOCUMENTO (catálogo; independiente)
-- ============================================================
CREATE TABLE IF NOT EXISTS tipos_documento (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                 VARCHAR(50)  UNIQUE NOT NULL,
  nombre                 VARCHAR(255) NOT NULL,
  categoria              VARCHAR(20)  NOT NULL CHECK (categoria IN ('legal', 'financiero', 'tecnico', 'referencia')),
  es_obligatorio         BOOLEAN      DEFAULT true,
  tipo_persona           VARCHAR(20)  NOT NULL DEFAULT 'ambos'
                                      CHECK (tipo_persona IN ('juridica', 'natural', 'ambos')),
  dias_vigencia          INTEGER      DEFAULT 365,
  extensiones_permitidas TEXT[]       DEFAULT '{}',
  tamano_maximo_mb       DECIMAL(5,1) DEFAULT 10,
  activo                 BOOLEAN      DEFAULT true,
  created_at             TIMESTAMPTZ  DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- 4. PROCESOS DE SELECCIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS procesos (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id      UUID         NOT NULL REFERENCES conjuntos(id) ON DELETE CASCADE,
  nombre           VARCHAR(255) NOT NULL,
  descripcion      TEXT,
  fecha_inicio     DATE         NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin        DATE,
  peso_evaluacion  INTEGER      DEFAULT 70 CHECK (peso_evaluacion >= 0 AND peso_evaluacion <= 100),
  peso_votacion    INTEGER      DEFAULT 30 CHECK (peso_votacion  >= 0 AND peso_votacion  <= 100),
  estado           VARCHAR(20)  DEFAULT 'configuracion'
                                CHECK (estado IN ('configuracion', 'evaluacion', 'votacion', 'finalizado', 'cancelado')),
  created_by       UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT peso_total_check CHECK (peso_evaluacion + peso_votacion = 100)
);

CREATE INDEX IF NOT EXISTS idx_procesos_conjunto ON procesos(conjunto_id);

-- ============================================================
-- 5. CONSEJEROS (evaluadores sin cuenta Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS consejeros (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id     UUID         NOT NULL REFERENCES conjuntos(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(255) NOT NULL,
  cargo           VARCHAR(50)  NOT NULL
                               CHECK (cargo IN ('presidente', 'vicepresidente', 'secretario',
                                                'tesorero', 'vocal_principal', 'consejero',
                                                'consejero_suplente')),
  torre           VARCHAR(50),
  apartamento     VARCHAR(50)  NOT NULL,
  email           VARCHAR(255),
  telefono        VARCHAR(50),
  codigo_acceso   VARCHAR(8)   UNIQUE,
  activo          BOOLEAN      DEFAULT true,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consejeros_conjunto ON consejeros(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_consejeros_codigo   ON consejeros(codigo_acceso);

-- ============================================================
-- 6. PROPUESTAS DE ADMINISTRADORES
-- ============================================================
CREATE TABLE IF NOT EXISTS propuestas (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id               UUID          NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
  tipo_persona             VARCHAR(20)   NOT NULL CHECK (tipo_persona IN ('juridica', 'natural')),
  razon_social             VARCHAR(255)  NOT NULL,
  nit_cedula               VARCHAR(50)   NOT NULL,
  representante_legal      VARCHAR(255),
  anios_experiencia        INTEGER       DEFAULT 0,
  unidades_administradas   INTEGER       DEFAULT 0,
  telefono                 VARCHAR(50),
  email                    VARCHAR(255),
  direccion                TEXT,
  valor_honorarios         DECIMAL(15,2),
  observaciones            TEXT,
  -- Estado completo del flujo (máquina de estados de 003_functions.sql)
  estado                   VARCHAR(20)   DEFAULT 'registro'
                                         CHECK (estado IN (
                                           'registro', 'en_revision', 'incompleto',
                                           'en_subsanacion', 'en_validacion', 'no_apto_legal',
                                           'habilitada', 'en_evaluacion',
                                           'condicionado', 'apto', 'destacado', 'no_apto',
                                           'adjudicado', 'descalificada', 'retirada'
                                         )),
  clasificacion            VARCHAR(20)   CHECK (clasificacion IN ('destacado', 'apto', 'condicionado', 'no_apto')),
  -- Validación legal
  cumple_requisitos_legales BOOLEAN      DEFAULT false,
  observaciones_legales    TEXT,
  checklist_legal          JSONB,
  -- Puntajes
  puntaje_legal            DECIMAL(5,2)  DEFAULT 0,
  puntaje_tecnico          DECIMAL(5,2)  DEFAULT 0,
  puntaje_financiero       DECIMAL(5,2)  DEFAULT 0,
  puntaje_referencias      DECIMAL(5,2)  DEFAULT 0,
  puntaje_propuesta        DECIMAL(5,2)  DEFAULT 0,
  puntaje_evaluacion       DECIMAL(5,2)  DEFAULT 0,
  votos_recibidos          INTEGER       DEFAULT 0,
  puntaje_final            DECIMAL(5,2)  DEFAULT 0,
  created_by               UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_propuestas_proceso ON propuestas(proceso_id);
CREATE INDEX IF NOT EXISTS idx_propuestas_estado  ON propuestas(estado);

-- ============================================================
-- 7. DOCUMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS documentos (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id      UUID         NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  tipo_documento_id UUID         REFERENCES tipos_documento(id) ON DELETE SET NULL,
  tipo              VARCHAR(50)  NOT NULL,
  nombre            VARCHAR(255) NOT NULL,
  archivo_url       TEXT,
  archivo_pathname  TEXT,
  es_obligatorio    BOOLEAN      DEFAULT false,
  estado            VARCHAR(20)  DEFAULT 'PENDIENTE'
                                 CHECK (estado IN ('PENDIENTE', 'CARGADO', 'EN_REVISION',
                                                   'APROBADO', 'RECHAZADO', 'VENCIDO')),
  fecha_vencimiento DATE,
  observaciones     TEXT,
  validado_por      UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_validacion  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_propuesta ON documentos(propuesta_id);

-- ============================================================
-- 8. CRITERIOS DE EVALUACIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS criterios (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id  UUID          NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
  nombre      VARCHAR(100)  NOT NULL,
  descripcion TEXT,
  peso        DECIMAL(5,2)  NOT NULL CHECK (peso > 0 AND peso <= 100),
  tipo        VARCHAR(20)   NOT NULL CHECK (tipo IN ('numerico', 'booleano', 'escala')),
  valor_minimo INTEGER      DEFAULT 1,
  valor_maximo INTEGER      DEFAULT 5,
  orden       INTEGER       DEFAULT 0,
  activo      BOOLEAN       DEFAULT true,
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_criterios_proceso ON criterios(proceso_id);

-- ============================================================
-- 9. EVALUACIONES DEL ADMINISTRADOR (matriz de calificación)
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluaciones_admin (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id  UUID          NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  evaluador_id  UUID          NOT NULL REFERENCES usuarios(id)   ON DELETE CASCADE,
  puntaje_total DECIMAL(5,2)  NOT NULL DEFAULT 0,
  clasificacion VARCHAR(20)   CHECK (clasificacion IN ('destacado', 'apto', 'condicionado', 'no_apto')),
  observaciones TEXT,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (propuesta_id, evaluador_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_admin_propuesta ON evaluaciones_admin(propuesta_id);
CREATE INDEX IF NOT EXISTS idx_eval_admin_evaluador ON evaluaciones_admin(evaluador_id);

-- ============================================================
-- 10. PUNTAJES DETALLADOS POR CRITERIO
-- ============================================================
CREATE TABLE IF NOT EXISTS puntajes_criterio (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id  UUID          NOT NULL REFERENCES evaluaciones_admin(id) ON DELETE CASCADE,
  criterio_codigo VARCHAR(50)  NOT NULL,
  puntaje        DECIMAL(5,2)  NOT NULL,
  valor_original TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puntajes_evaluacion ON puntajes_criterio(evaluacion_id);

-- ============================================================
-- 11. EVALUACIONES DE CONSEJEROS
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluaciones (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id   UUID          NOT NULL REFERENCES procesos(id)   ON DELETE CASCADE,
  consejero_id UUID          NOT NULL REFERENCES consejeros(id) ON DELETE CASCADE,
  propuesta_id UUID          NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  criterio_id  UUID          NOT NULL REFERENCES criterios(id)  ON DELETE CASCADE,
  valor        DECIMAL(5,2)  NOT NULL,
  comentario   TEXT,
  created_at   TIMESTAMPTZ   DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (consejero_id, propuesta_id, criterio_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_proceso   ON evaluaciones(proceso_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_consejero ON evaluaciones(consejero_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_propuesta ON evaluaciones(propuesta_id);

-- ============================================================
-- 12. VOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS votos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id    UUID        NOT NULL REFERENCES procesos(id)   ON DELETE CASCADE,
  consejero_id  UUID        NOT NULL REFERENCES consejeros(id) ON DELETE CASCADE,
  propuesta_id  UUID        NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  justificacion TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proceso_id, consejero_id)
);

CREATE INDEX IF NOT EXISTS idx_votos_proceso ON votos(proceso_id);

-- ============================================================
-- 13. AUDITORÍA
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id      UUID         REFERENCES conjuntos(id)  ON DELETE SET NULL,
  proceso_id       UUID         REFERENCES procesos(id)   ON DELETE SET NULL,
  consejero_id     UUID         REFERENCES consejeros(id) ON DELETE SET NULL,
  accion           VARCHAR(50)  NOT NULL,
  entidad          VARCHAR(50)  NOT NULL,
  entidad_id       UUID,
  datos_anteriores JSONB,
  datos_nuevos     JSONB,
  ip_address       VARCHAR(45),
  user_agent       TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_conjunto ON audit_log(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_audit_proceso  ON audit_log(proceso_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_log(created_at);

-- ============================================================
-- 14. DATOS RUT (OCR)
-- ============================================================
CREATE TABLE IF NOT EXISTS propuesta_rut_datos (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id             UUID        NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  nit_extraido             TEXT,
  dv_extraido              TEXT,
  razon_social_extraida    TEXT,
  tipo_contribuyente       TEXT,
  representantes_legales   JSONB       NOT NULL DEFAULT '[]',
  socios                   JSONB       NOT NULL DEFAULT '[]',
  revisor_fiscal_principal JSONB,
  revisor_fiscal_suplente  JSONB,
  contador                 JSONB,
  responsabilidades        JSONB       NOT NULL DEFAULT '[]',
  hay_alerta_pep           BOOLEAN     NOT NULL DEFAULT false,
  nit_coincide             BOOLEAN,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS propuesta_rut_datos_propuesta_id_idx
  ON propuesta_rut_datos(propuesta_id);
CREATE INDEX IF NOT EXISTS propuesta_rut_datos_pep_idx
  ON propuesta_rut_datos(hay_alerta_pep)
  WHERE hay_alerta_pep = true;

-- ============================================================
-- 15. HISTORIAL DE ESTADOS DE PROPUESTAS (inmutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS historial_estados_propuesta (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id    UUID         NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(30),
  estado_nuevo    VARCHAR(30)  NOT NULL,
  usuario_id      UUID,
  observacion     TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_propuesta_id
  ON historial_estados_propuesta(propuesta_id);
CREATE INDEX IF NOT EXISTS idx_historial_created_at
  ON historial_estados_propuesta(created_at DESC);

-- ============================================================
-- 16. TRANSICIONES DE ESTADO (grafo de la máquina de estados)
-- ============================================================
CREATE TABLE IF NOT EXISTS transiciones_estado (
  id                   SERIAL       PRIMARY KEY,
  estado_origen        VARCHAR(30)  NOT NULL,
  estado_destino       VARCHAR(30)  NOT NULL,
  requiere_observacion BOOLEAN      DEFAULT false,
  descripcion          VARCHAR(255),
  UNIQUE (estado_origen, estado_destino)
);

-- ============================================================
-- 17. PERMISOS DEL SISTEMA
-- ============================================================
CREATE TABLE IF NOT EXISTS permisos (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      VARCHAR(50)  NOT NULL UNIQUE,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  categoria   VARCHAR(50)  NOT NULL DEFAULT 'general',
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permisos_categoria ON permisos(categoria);

-- ============================================================
-- 18. ROLES CONFIGURABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id UUID         REFERENCES conjuntos(id) ON DELETE CASCADE,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  es_sistema  BOOLEAN      DEFAULT false,
  activo      BOOLEAN      DEFAULT true,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (conjunto_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_roles_conjunto ON roles(conjunto_id);

-- ============================================================
-- 19. RELACIÓN ROLES-PERMISOS
-- ============================================================
CREATE TABLE IF NOT EXISTS roles_permisos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id     UUID        NOT NULL REFERENCES roles(id)   ON DELETE CASCADE,
  permiso_id UUID        NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (rol_id, permiso_id)
);

CREATE INDEX IF NOT EXISTS idx_roles_permisos_rol     ON roles_permisos(rol_id);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_permiso ON roles_permisos(permiso_id);

-- ============================================================
-- TRIGGERS: updated_at en todas las tablas que lo tienen
-- ============================================================
CREATE OR REPLACE TRIGGER update_conjuntos_updated_at
  BEFORE UPDATE ON conjuntos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_tipos_documento_updated_at
  BEFORE UPDATE ON tipos_documento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_procesos_updated_at
  BEFORE UPDATE ON procesos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_consejeros_updated_at
  BEFORE UPDATE ON consejeros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_propuestas_updated_at
  BEFORE UPDATE ON propuestas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_criterios_updated_at
  BEFORE UPDATE ON criterios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_evaluaciones_admin_updated_at
  BEFORE UPDATE ON evaluaciones_admin
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_evaluaciones_updated_at
  BEFORE UPDATE ON evaluaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_propuesta_rut_datos_updated_at
  BEFORE UPDATE ON propuesta_rut_datos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
