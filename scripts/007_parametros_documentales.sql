-- =====================================================
-- 007: Parámetros Documentales
-- Agrega extensiones_permitidas y tamano_maximo_mb a tipos_documento
-- y siembra los tipos de documento por defecto del proceso PH.
-- =====================================================

-- 1. Agregar columnas nuevas si no existen
ALTER TABLE tipos_documento
  ADD COLUMN IF NOT EXISTS extensiones_permitidas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tamano_maximo_mb DECIMAL(5,1) DEFAULT 10;

-- 2. Actualizar columnas existentes que no tienen valor
UPDATE tipos_documento
SET
  extensiones_permitidas = '{}',
  tamano_maximo_mb = 10
WHERE extensiones_permitidas IS NULL OR tamano_maximo_mb IS NULL;

-- 3. Sembrar tipos de documento por defecto
-- Documentos Generales (aplican a ambos tipos de persona)
INSERT INTO tipos_documento (codigo, nombre, categoria, es_obligatorio, tipo_persona, extensiones_permitidas, tamano_maximo_mb, dias_vigencia, activo)
VALUES
  ('carta_presentacion',          'Carta de presentación',                                    'tecnico',    true,  'ambos',    '{pdf,docx}', 5,  365, true),
  ('propuesta_gestion',           'Propuesta de gestión administrativa',                       'tecnico',    true,  'ambos',    '{pdf,docx}', 10, 365, true),
  ('propuesta_economica',         'Propuesta económica',                                       'financiero', true,  'ambos',    '{pdf,docx}', 5,  365, true),
  ('hoja_de_vida',                'Hoja de vida con soportes',                                 'tecnico',    true,  'ambos',    '{pdf}',      15, 365, true),
  ('certificados_experiencia',    'Certificados de experiencia (NIT, funciones, fechas, cargo)','referencia', true,  'ambos',    '{pdf}',      20, 365, true),
  ('referencias_verificables',    'Referencias verificables',                                   'referencia', false, 'ambos',    '{pdf,docx}', 10, 365, true),

-- Documentos Persona Natural
  ('cedula',                      'Copia de cédula de ciudadanía',                             'legal',      true,  'natural',  '{pdf,jpg,png}', 5, 365, true),
  ('rut_natural',                 'RUT actualizado',                                            'legal',      true,  'natural',  '{pdf}',      5,  365, true),
  ('antecedentes_disciplinarios', 'Antecedentes disciplinarios (Procuraduría)',                 'legal',      true,  'natural',  '{pdf}',      5,  90,  true),
  ('antecedentes_judiciales',     'Antecedentes judiciales (Policía Nacional)',                 'legal',      true,  'natural',  '{pdf}',      5,  90,  true),
  ('antecedentes_fiscales',       'Antecedentes fiscales (Contraloría)',                        'legal',      true,  'natural',  '{pdf}',      5,  90,  true),
  ('medidas_correctivas',         'Medidas correctivas vigentes',                               'legal',      true,  'natural',  '{pdf}',      5,  90,  true),
  ('redam',                       'Certificado REDAM',                                          'legal',      true,  'natural',  '{pdf}',      5,  90,  true),

-- Documentos Persona Jurídica
  ('camara_comercio',             'Certificado de existencia y representación legal (Cámara de Comercio)', 'legal', true, 'juridica', '{pdf}', 8,  30,  true),
  ('rut_juridica',                'RUT actualizado',                                            'legal',      true,  'juridica', '{pdf}',      5,  365, true),
  ('estados_financieros',         'Estados financieros de los últimos dos años',                'financiero', true,  'juridica', '{pdf,xlsx}', 20, 365, true),
  ('pago_parafiscales',           'Certificación de pago de aportes parafiscales',              'legal',      true,  'juridica', '{pdf}',      5,  30,  true),
  ('certificacion_sst',           'Certificación SST vigente',                                  'legal',      true,  'juridica', '{pdf}',      5,  365, true),
  ('exp_propiedad_horizontal',    'Certificados de experiencia en propiedad horizontal',         'referencia', true,  'juridica', '{pdf}',      20, 365, true)
ON CONFLICT (codigo) DO UPDATE SET
  nombre                  = EXCLUDED.nombre,
  categoria               = EXCLUDED.categoria,
  es_obligatorio          = EXCLUDED.es_obligatorio,
  tipo_persona            = EXCLUDED.tipo_persona,
  extensiones_permitidas  = EXCLUDED.extensiones_permitidas,
  tamano_maximo_mb        = EXCLUDED.tamano_maximo_mb,
  dias_vigencia           = EXCLUDED.dias_vigencia,
  updated_at              = NOW();

-- 4. RLS: permitir lectura pública de tipos_documento para usuarios autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tipos_documento' AND policyname = 'tipos_documento_read_authenticated'
  ) THEN
    CREATE POLICY tipos_documento_read_authenticated ON tipos_documento
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tipos_documento' AND policyname = 'tipos_documento_write_admin'
  ) THEN
    CREATE POLICY tipos_documento_write_admin ON tipos_documento
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND activo = true)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND activo = true)
      );
  END IF;
END $$;
