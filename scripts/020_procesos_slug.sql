-- ============================================================
-- 020_procesos_slug.sql
-- Agregar columna slug a tabla procesos para URLs amigables
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

-- Función para generar slug desde el nombre
-- Usa en migrations y triggers
CREATE OR REPLACE FUNCTION generate_slug(text_input VARCHAR(255))
RETURNS VARCHAR(255) AS $$
BEGIN
  -- Convertir a minúsculas
  -- Reemplazar espacios y caracteres especiales con guiones
  -- Remover acentos
  RETURN lower(
    regexp_replace(
      regexp_replace(
        unaccent(text_input),
        '[^a-z0-9]+',
        '-',
        'g'
      ),
      '^-+|-+$',
      '',
      'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Crear trigger para generar slug automáticamente al insertar o actualizar
CREATE OR REPLACE FUNCTION procesos_set_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.nombre);
    
    -- Si el slug ya existe, agregar sufijo numérico
    DECLARE
      base_slug VARCHAR(255);
      counter INT := 1;
      final_slug VARCHAR(255);
    BEGIN
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
    END;
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
  RAISE NOTICE '[020] Columna slug agregada a procesos con índices y trigger automático';
END $$;
