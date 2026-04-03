-- ============================================================
-- 019_enable_unaccent.sql
-- Habilitar extensión unaccent en Supabase para slug generation
-- ============================================================

-- Crear extensión unaccent (required por generate_slug)
CREATE EXTENSION IF NOT EXISTS unaccent;

COMMENT ON EXTENSION unaccent IS 'Extension para remover acentos en texto (usado por generate_slug)';
