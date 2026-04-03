-- ============================================================
-- 020_procesos_slug_alternative.sql
-- Versión alternativa SIN dependencia de extensión unaccent
-- ============================================================

-- Agregar columna slug
ALTER TABLE procesos
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;

-- Crear índice en slug para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_procesos_slug 
ON procesos(slug);

-- Crear índice compuesto para búsquedas por conjunto y slug
CREATE INDEX IF NOT EXISTS idx_procesos_conjunto_slug 
ON procesos(conjunto_id, slug);

-- Función para generar slug SIN usar unaccent
-- Usa replace para caracteres comunes en español
CREATE OR REPLACE FUNCTION generate_slug(text_input VARCHAR(255))
RETURNS VARCHAR(255) AS $$
DECLARE
  slug_text VARCHAR(255);
BEGIN
  -- Convertir a minúsculas y hacer replacements de caracteres acentuados
  slug_text := lower(text_input);
  
  -- Reemplazar caracteres acentuados comunes
  slug_text := replace(slug_text, 'á', 'a');
  slug_text := replace(slug_text, 'é', 'e');
  slug_text := replace(slug_text, 'í', 'i');
  slug_text := replace(slug_text, 'ó', 'o');
  slug_text := replace(slug_text, 'ú', 'u');
  slug_text := replace(slug_text, 'ñ', 'n');
  slug_text := replace(slug_text, 'à', 'a');
  slug_text := replace(slug_text, 'è', 'e');
  slug_text := replace(slug_text, 'ì', 'i');
  slug_text := replace(slug_text, 'ò', 'o');
  slug_text := replace(slug_text, 'ù', 'u');
  slug_text := replace(slug_text, 'ä', 'a');
  slug_text := replace(slug_text, 'ë', 'e');
  slug_text := replace(slug_text, 'ï', 'i');
  slug_text := replace(slug_text, 'ö', 'o');
  slug_text := replace(slug_text, 'ü', 'u');
  
  -- Reemplazar espacios y caracteres especiales con guiones
  slug_text := regexp_replace(slug_text, '[^a-z0-9]+', '-', 'g');
  
  -- Remover guiones al inicio y final
  slug_text := regexp_replace(slug_text, '^-+|-+$', '', 'g');
  
  RETURN slug_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Crear trigger para generar slug automáticamente al insertar o actualizar
CREATE OR REPLACE FUNCTION procesos_set_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug VARCHAR(255);
  counter INT := 1;
  final_slug VARCHAR(255);
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.nombre);
    
    -- Si el slug ya existe, agregar sufijo numérico
    base_slug := NEW.slug;
    final_slug := base_slug;
    
    WHILE EXISTS(
      SELECT 1 FROM procesos 
      WHERE slug = final_slug 
      AND (
        NEW.id IS NULL OR id != NEW.id
      )
      AND conjunto_id = NEW.conjunto_id
    ) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropear trigger anterior si existe
DROP TRIGGER IF EXISTS procesos_slug_trigger ON procesos;

-- Crear trigger
CREATE TRIGGER procesos_slug_trigger
BEFORE INSERT OR UPDATE ON procesos
FOR EACH ROW
EXECUTE FUNCTION procesos_set_slug();

DO $$
BEGIN
  RAISE NOTICE '[020] Columna slug agregada a procesos con índices y trigger automático (sin unaccent)';
END $$;
