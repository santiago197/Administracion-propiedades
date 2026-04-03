-- ============================================================
-- MIGRACIÓN 021: Catálogo de ítems de validación legal
-- ============================================================

CREATE TABLE IF NOT EXISTS validacion_legal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  seccion TEXT NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('critico', 'importante', 'condicionante', 'informativo')),
  descripcion TEXT NOT NULL,
  aplica_a TEXT NOT NULL DEFAULT 'ambos' CHECK (aplica_a IN ('ambos', 'juridica', 'natural')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
  orden INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validacion_legal_items_seccion_orden
  ON validacion_legal_items (seccion, orden);

CREATE INDEX IF NOT EXISTS idx_validacion_legal_items_activo
  ON validacion_legal_items (activo);

CREATE OR REPLACE FUNCTION set_updated_at_validacion_legal_items()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_validacion_legal_items ON validacion_legal_items;
CREATE TRIGGER trg_set_updated_at_validacion_legal_items
  BEFORE UPDATE ON validacion_legal_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_validacion_legal_items();

INSERT INTO validacion_legal_items
  (codigo, seccion, nombre, categoria, descripcion, aplica_a, activo, obligatorio, orden)
VALUES
  ('procuraduria', 'Antecedentes', 'Procuraduría', 'critico', 'Sin antecedentes disciplinarios activos.', 'ambos', TRUE, TRUE, 1),
  ('contraloria', 'Antecedentes', 'Contraloría', 'critico', 'Sin antecedentes fiscales activos.', 'ambos', TRUE, TRUE, 2),
  ('policia', 'Antecedentes', 'Policía Nacional', 'critico', 'Sin antecedentes judiciales.', 'ambos', TRUE, TRUE, 3),
  ('personeria', 'Antecedentes', 'Personería', 'critico', 'Sin antecedentes ante la Personería.', 'ambos', TRUE, TRUE, 4),
  ('medidas', 'Antecedentes', 'Medidas correctivas', 'critico', 'Sin medidas correctivas vigentes.', 'ambos', TRUE, TRUE, 5),
  ('redam', 'Antecedentes', 'REDAM', 'critico', 'No inscrito en el Registro de Deudores Alimentarios Morosos.', 'ambos', TRUE, TRUE, 6),
  ('delitos_sexuales', 'Antecedentes', 'Inhabilidades por delitos sexuales', 'critico', 'Sin inhabilidades por delitos sexuales o contra menores.', 'ambos', TRUE, TRUE, 7),
  ('procesos_legales', 'Antecedentes', 'Sin procesos legales activos', 'critico', 'No se encuentra incurso en procesos legales (penales, civiles o administrativos) vigentes que comprometan su idoneidad. Soportar con declaración bajo juramento o certificación de secretaría de juzgados.', 'ambos', TRUE, TRUE, 8),
  ('sarlaft', 'SARLAFT y documentación', 'SARLAFT / Listas restrictivas', 'critico', 'No aparece en listas Clinton, OFACs ni UIAF.', 'ambos', TRUE, TRUE, 1),
  ('rut', 'SARLAFT y documentación', 'RUT actualizado', 'critico', 'RUT vigente y coincidente con datos registrados.', 'ambos', TRUE, TRUE, 2),
  ('camara_comercio', 'SARLAFT y documentación', 'Cámara de Comercio vigente', 'critico', 'Certificado de existencia y representación legal vigente.', 'juridica', TRUE, TRUE, 3),
  ('parafiscales', 'Requisitos operativos', 'Pago de parafiscales', 'importante', 'Certificación de pago de aportes parafiscales al día.', 'juridica', TRUE, TRUE, 1),
  ('sst', 'Requisitos operativos', 'Certificación SST vigente', 'importante', 'Sistema de Seguridad y Salud en el Trabajo activo.', 'juridica', TRUE, TRUE, 2),
  ('estados_fin', 'Requisitos operativos', 'Estados financieros (2 años)', 'importante', 'Estados financieros de los últimos dos años presentados.', 'juridica', TRUE, TRUE, 3),
  ('experiencia', 'Requisitos operativos', 'Certificados de experiencia', 'importante', 'Certificados con NIT, funciones, fechas y cargo desempeñado.', 'ambos', TRUE, TRUE, 4),
  ('poliza_rc', 'Pólizas', 'Póliza Resp. Civil Profesional', 'condicionante', 'Póliza vigente. Exigible previo a firma del contrato.', 'ambos', TRUE, TRUE, 1),
  ('poliza_do', 'Pólizas', 'Póliza D&O para el Consejo', 'informativo', 'A gestionar dentro del primer mes de gestión.', 'ambos', TRUE, FALSE, 2)
ON CONFLICT (codigo) DO NOTHING;
