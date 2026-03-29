-- ============================================================
-- reset_propuestas.sql
-- Elimina todos los procesos, propuestas y datos asociados.
-- Preserva: conjuntos, usuarios, consejeros, tipos_documento,
--           permisos, roles, roles_permisos, transiciones_estado.
--
-- ¡EJECUTAR CON CUIDADO! Esta operación es IRREVERSIBLE.
-- ============================================================

BEGIN;

-- El orden importa: primero los hijos, luego los padres.
-- FK con ON DELETE CASCADE se podrían omitir, pero se listan
-- explícitamente para mayor claridad y control.

DELETE FROM puntajes_criterio;
DELETE FROM evaluaciones_admin;
DELETE FROM evaluaciones;
DELETE FROM votos;
DELETE FROM historial_estados_propuesta;
DELETE FROM propuesta_rut_datos;
DELETE FROM documentos;
DELETE FROM propuestas;
DELETE FROM criterios;
DELETE FROM audit_log;
DELETE FROM procesos;

-- ============================================================
-- VERIFICACIÓN
-- Todas las tablas de procesos/propuestas deben quedar en 0.
-- Las preservadas deben mantener sus registros.
-- ============================================================
SELECT tabla, registros,
  CASE
    WHEN preservado AND registros > 0 THEN '✓ preservado'
    WHEN NOT preservado AND registros = 0 THEN '✓ eliminado'
    WHEN NOT preservado AND registros > 0 THEN '✗ ERROR: aún tiene datos'
    ELSE '⚠ vacío (normal si es instalación nueva)'
  END AS estado
FROM (
  SELECT 'procesos'                    AS tabla, COUNT(*)::INT AS registros, false AS preservado FROM procesos
  UNION ALL
  SELECT 'criterios',                           COUNT(*)::INT, false FROM criterios
  UNION ALL
  SELECT 'propuestas',                          COUNT(*)::INT, false FROM propuestas
  UNION ALL
  SELECT 'documentos',                          COUNT(*)::INT, false FROM documentos
  UNION ALL
  SELECT 'evaluaciones',                        COUNT(*)::INT, false FROM evaluaciones
  UNION ALL
  SELECT 'evaluaciones_admin',                  COUNT(*)::INT, false FROM evaluaciones_admin
  UNION ALL
  SELECT 'puntajes_criterio',                   COUNT(*)::INT, false FROM puntajes_criterio
  UNION ALL
  SELECT 'votos',                               COUNT(*)::INT, false FROM votos
  UNION ALL
  SELECT 'historial_estados_propuesta',         COUNT(*)::INT, false FROM historial_estados_propuesta
  UNION ALL
  SELECT 'propuesta_rut_datos',                 COUNT(*)::INT, false FROM propuesta_rut_datos
  UNION ALL
  SELECT 'audit_log',                           COUNT(*)::INT, false FROM audit_log
  UNION ALL
  SELECT '— conjuntos (preservado)',            COUNT(*)::INT, true  FROM conjuntos
  UNION ALL
  SELECT '— usuarios (preservado)',             COUNT(*)::INT, true  FROM usuarios
  UNION ALL
  SELECT '— consejeros (preservado)',           COUNT(*)::INT, true  FROM consejeros
  UNION ALL
  SELECT '— tipos_documento (preservado)',      COUNT(*)::INT, true  FROM tipos_documento
) t
ORDER BY preservado, tabla;

COMMIT;
