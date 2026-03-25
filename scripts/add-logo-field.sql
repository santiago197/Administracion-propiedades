-- Agregar campo logo_url a tabla conjuntos
-- Ejecutar en Supabase SQL Editor

ALTER TABLE conjuntos
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conjuntos' 
AND column_name = 'logo_url';
