-- =====================================================
-- 012_fix_documentos_schema.sql
-- Corrige columna tipo_documento_id y estados de documentos.
-- Ejecutar en Supabase SQL Editor si la BD ya existe.
-- =====================================================

ALTER TABLE public.documentos
ADD COLUMN IF NOT EXISTS tipo_documento_id UUID REFERENCES public.tipos_documento(id) ON DELETE SET NULL;

-- Normalizar estados existentes antes de aplicar el CHECK
UPDATE public.documentos
SET estado = CASE
  WHEN estado IS NULL THEN 'PENDIENTE'
  WHEN upper(estado) IN ('PENDIENTE','CARGADO','EN_REVISION','APROBADO','RECHAZADO','VENCIDO')
    THEN upper(estado)
  WHEN lower(estado) IN ('completo','cargado') THEN 'CARGADO'
  WHEN lower(estado) IN ('en_revision','en revision') THEN 'EN_REVISION'
  WHEN lower(estado) = 'aprobado' THEN 'APROBADO'
  WHEN lower(estado) IN ('rechazado','incompleto') THEN 'RECHAZADO'
  WHEN lower(estado) = 'vencido' THEN 'VENCIDO'
  ELSE 'PENDIENTE'
END;

ALTER TABLE public.documentos
DROP CONSTRAINT IF EXISTS documentos_estado_check;

ALTER TABLE public.documentos
ADD CONSTRAINT documentos_estado_check
CHECK (upper(estado) IN ('PENDIENTE','CARGADO','EN_REVISION','APROBADO','RECHAZADO','VENCIDO'));

ALTER TABLE public.documentos
ALTER COLUMN estado SET DEFAULT 'PENDIENTE';

SELECT pg_notify('pgrst', 'reload schema');
