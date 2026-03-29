-- ============================================================
-- 004_seed_data.sql
-- Todos los datos iniciales del sistema.
-- Idempotente: usa ON CONFLICT DO NOTHING / DO UPDATE.
-- Ejecutar DESPUÉS de 003_functions.sql.
-- ============================================================

-- ============================================================
-- TRANSICIONES DE ESTADO (grafo de la máquina de estados)
-- ============================================================
INSERT INTO transiciones_estado (estado_origen, estado_destino, requiere_observacion, descripcion)
VALUES
  -- Flujo principal
  ('registro',       'en_revision',    false, 'Admin inicia revisión documental'),
  ('en_revision',    'incompleto',     true,  'Documentación incompleta o inválida'),
  ('en_revision',    'en_validacion',  false, 'Documentación completa, pasa a validación legal'),
  ('incompleto',     'en_subsanacion', false, 'Se notifica al candidato el plazo de subsanación'),
  ('en_subsanacion', 'en_validacion',  false, 'Candidato subsanó documentación correctamente'),
  ('en_subsanacion', 'descalificada',  true,  'Candidato no subsanó en el plazo establecido'),
  ('en_validacion',  'no_apto_legal',  true,  'No supera validación legal (SARLAFT, antecedentes, pólizas)'),
  ('en_validacion',  'habilitada',     false, 'Cumple todos los requisitos legales'),
  ('habilitada',     'en_evaluacion',  false, 'Proceso de evaluación activado'),
  -- Resultados de evaluación
  ('en_evaluacion',  'no_apto',        false, 'Puntaje final < 55'),
  ('en_evaluacion',  'condicionado',   false, 'Puntaje final entre 55 y 69'),
  ('en_evaluacion',  'apto',           false, 'Puntaje final entre 70 y 84'),
  ('en_evaluacion',  'destacado',      false, 'Puntaje final ≥ 85'),
  -- Adjudicación
  ('condicionado',   'adjudicado',     true,  'Adjudicado con condiciones por aprobación del consejo'),
  ('apto',           'adjudicado',     false, 'Adjudicado por aprobación del consejo'),
  ('destacado',      'adjudicado',     false, 'Adjudicado (clasificación destacada)'),
  -- Retiro voluntario desde cualquier estado activo
  ('registro',       'retirada',       true,  'Retirado voluntariamente'),
  ('en_revision',    'retirada',       true,  'Retirado durante revisión documental'),
  ('incompleto',     'retirada',       true,  'Retirado con documentación incompleta'),
  ('en_subsanacion', 'retirada',       true,  'Retirado durante período de subsanación'),
  ('en_validacion',  'retirada',       true,  'Retirado durante validación legal'),
  ('habilitada',     'retirada',       true,  'Retirado estando habilitado'),
  ('en_evaluacion',  'retirada',       true,  'Retirado durante evaluación')
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;

-- ============================================================
-- TIPOS DE DOCUMENTO
-- ON CONFLICT DO UPDATE: actualiza si ya existen registros
-- ============================================================
INSERT INTO tipos_documento
  (codigo, nombre, categoria, es_obligatorio, tipo_persona, extensiones_permitidas, tamano_maximo_mb, dias_vigencia, activo)
VALUES
  -- Documentos generales (ambos tipos de persona)
  ('carta_presentacion',       'Carta de presentación',                                      'tecnico',    true,  'ambos',    '{pdf,docx}',    5,  365, true),
  ('propuesta_gestion',        'Propuesta de gestión administrativa',                         'tecnico',    true,  'ambos',    '{pdf,docx}',    10, 365, true),
  ('propuesta_economica',      'Propuesta económica',                                         'financiero', true,  'ambos',    '{pdf,docx}',    5,  365, true),
  ('hoja_de_vida',             'Hoja de vida con soportes',                                   'tecnico',    true,  'ambos',    '{pdf}',         15, 365, true),
  ('certificados_experiencia', 'Certificados de experiencia (NIT, funciones, fechas, cargo)', 'referencia', true,  'ambos',    '{pdf}',         20, 365, true),
  ('referencias_verificables', 'Referencias verificables',                                    'referencia', false, 'ambos',    '{pdf,docx}',    10, 365, true),
  -- Persona Natural
  ('cedula',                   'Copia de cédula de ciudadanía',                               'legal',      true,  'natural',  '{pdf,jpg,png}', 5,  365, true),
  ('rut_natural',              'RUT actualizado',                                             'legal',      true,  'natural',  '{pdf}',         5,  365, true),
  ('antecedentes_disciplinarios', 'Antecedentes disciplinarios (Procuraduría)',               'legal',      true,  'natural',  '{pdf}',         5,  90,  true),
  ('antecedentes_judiciales',  'Antecedentes judiciales (Policía Nacional)',                  'legal',      true,  'natural',  '{pdf}',         5,  90,  true),
  ('antecedentes_fiscales',    'Antecedentes fiscales (Contraloría)',                         'legal',      true,  'natural',  '{pdf}',         5,  90,  true),
  ('medidas_correctivas',      'Medidas correctivas vigentes',                                'legal',      true,  'natural',  '{pdf}',         5,  90,  true),
  ('redam',                    'Certificado REDAM',                                           'legal',      true,  'natural',  '{pdf}',         5,  90,  true),
  -- Persona Jurídica
  ('camara_comercio',          'Certificado de existencia y representación legal',            'legal',      true,  'juridica', '{pdf}',         8,  30,  true),
  ('rut_juridica',             'RUT actualizado',                                             'legal',      true,  'juridica', '{pdf}',         5,  365, true),
  ('estados_financieros',      'Estados financieros de los últimos dos años',                 'financiero', true,  'juridica', '{pdf,xlsx}',    20, 365, true),
  ('pago_parafiscales',        'Certificación de pago de aportes parafiscales',               'legal',      true,  'juridica', '{pdf}',         5,  30,  true),
  ('certificacion_sst',        'Certificación SST vigente',                                   'legal',      true,  'juridica', '{pdf}',         5,  365, true),
  ('exp_propiedad_horizontal', 'Certificados de experiencia en propiedad horizontal',         'referencia', true,  'juridica', '{pdf}',         20, 365, true)
ON CONFLICT (codigo) DO UPDATE SET
  nombre                 = EXCLUDED.nombre,
  categoria              = EXCLUDED.categoria,
  es_obligatorio         = EXCLUDED.es_obligatorio,
  tipo_persona           = EXCLUDED.tipo_persona,
  extensiones_permitidas = EXCLUDED.extensiones_permitidas,
  tamano_maximo_mb       = EXCLUDED.tamano_maximo_mb,
  dias_vigencia          = EXCLUDED.dias_vigencia,
  activo                 = EXCLUDED.activo,
  updated_at             = NOW();

-- ============================================================
-- PERMISOS DEL SISTEMA
-- ============================================================
INSERT INTO permisos (codigo, nombre, descripcion, categoria)
VALUES
  ('crear_procesos',    'Crear procesos',    'Crear nuevos procesos de selección',      'procesos'),
  ('editar_procesos',   'Editar procesos',   'Modificar procesos existentes',           'procesos'),
  ('eliminar_procesos', 'Eliminar procesos', 'Eliminar procesos',                       'procesos'),
  ('ver_procesos',      'Ver procesos',      'Visualizar procesos',                     'procesos'),
  ('invitar_consejeros','Invitar consejeros','Agregar consejeros al conjunto',          'consejeros'),
  ('editar_consejeros', 'Editar consejeros', 'Modificar datos de consejeros',           'consejeros'),
  ('eliminar_consejeros','Eliminar consejeros','Eliminar consejeros',                   'consejeros'),
  ('cargar_documentos', 'Cargar documentos', 'Subir documentos de propuestas',          'documentos'),
  ('validar_documentos','Validar documentos','Aprobar/rechazar documentos',             'documentos'),
  ('evaluar_propuestas','Evaluar propuestas','Calificar candidatos',                    'evaluacion'),
  ('votar',             'Votar',             'Emitir votos en procesos',                'votacion'),
  ('ver_reportes',      'Ver reportes',      'Acceder a reportes y estadísticas',       'reportes'),
  ('exportar_reportes', 'Exportar reportes', 'Exportar informes',                       'reportes'),
  ('ver_finanzas',      'Ver finanzas',      'Ver información financiera',              'finanzas'),
  ('auditar_documentos','Auditar documentos','Revisar auditoría de documentos',         'auditoria'),
  ('gestionar_roles',   'Gestionar roles',   'Crear y editar roles del sistema',        'configuracion'),
  ('gestionar_usuarios','Gestionar usuarios','Administrar usuarios',                    'configuracion')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- ROLES DE SISTEMA
-- NULL en conjunto_id = global (aplica a todos los conjuntos)
-- ============================================================
INSERT INTO roles (nombre, descripcion, es_sistema, conjunto_id)
VALUES
  ('Administrador',   'Administrador del conjunto con acceso completo',    true, NULL),
  ('Consejero',       'Miembro del consejo de administración',             true, NULL),
  ('Revisor fiscal',  'Auditor financiero y documental',                   true, NULL),
  ('Evaluador',       'Puede evaluar propuestas pero no administrar',      true, NULL)
ON CONFLICT (conjunto_id, nombre) DO NOTHING;

-- ============================================================
-- PERMISOS POR ROL DE SISTEMA
-- ============================================================

-- Administrador: todos excepto auditoría y finanzas
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Administrador' AND r.es_sistema = true
  AND p.codigo IN (
    'crear_procesos', 'editar_procesos', 'eliminar_procesos', 'ver_procesos',
    'invitar_consejeros', 'editar_consejeros', 'eliminar_consejeros',
    'cargar_documentos', 'validar_documentos',
    'ver_reportes', 'exportar_reportes',
    'gestionar_roles', 'gestionar_usuarios'
  )
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Consejero: evaluar, votar, ver
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Consejero' AND r.es_sistema = true
  AND p.codigo IN ('evaluar_propuestas', 'votar', 'ver_reportes', 'ver_procesos')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Revisor fiscal: finanzas, auditoría
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Revisor fiscal' AND r.es_sistema = true
  AND p.codigo IN ('ver_finanzas', 'auditar_documentos', 'ver_reportes', 'ver_procesos')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Evaluador: solo evaluar y ver
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Evaluador' AND r.es_sistema = true
  AND p.codigo IN ('evaluar_propuestas', 'ver_reportes', 'ver_procesos')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Recargar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
