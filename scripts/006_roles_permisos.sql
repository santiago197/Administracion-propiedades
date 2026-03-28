-- =====================================================
-- Migración 006: Roles y Permisos Configurables
-- Sistema de Selección de Administradores PH Colombia
-- =====================================================

-- 1. TABLA: PERMISOS DISPONIBLES
-- =====================================================
CREATE TABLE IF NOT EXISTS permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(50) NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permisos predefinidos del sistema
INSERT INTO permisos (codigo, nombre, descripcion, categoria) VALUES
  ('crear_procesos', 'Crear procesos', 'Permite crear nuevos procesos de selección', 'procesos'),
  ('editar_procesos', 'Editar procesos', 'Permite modificar procesos existentes', 'procesos'),
  ('eliminar_procesos', 'Eliminar procesos', 'Permite eliminar procesos', 'procesos'),
  ('ver_procesos', 'Ver procesos', 'Permite visualizar procesos', 'procesos'),
  ('invitar_consejeros', 'Invitar consejeros', 'Permite agregar consejeros al conjunto', 'consejeros'),
  ('editar_consejeros', 'Editar consejeros', 'Permite modificar datos de consejeros', 'consejeros'),
  ('eliminar_consejeros', 'Eliminar consejeros', 'Permite eliminar consejeros', 'consejeros'),
  ('cargar_documentos', 'Cargar documentos', 'Permite subir documentos de propuestas', 'documentos'),
  ('validar_documentos', 'Validar documentos', 'Permite aprobar/rechazar documentos', 'documentos'),
  ('evaluar_propuestas', 'Evaluar propuestas', 'Permite calificar candidatos', 'evaluacion'),
  ('votar', 'Votar', 'Permite emitir votos en procesos', 'votacion'),
  ('ver_reportes', 'Ver reportes', 'Permite acceder a reportes y estadísticas', 'reportes'),
  ('exportar_reportes', 'Exportar reportes', 'Permite exportar informes', 'reportes'),
  ('ver_finanzas', 'Ver finanzas', 'Permite ver información financiera', 'finanzas'),
  ('auditar_documentos', 'Auditar documentos', 'Permite revisar auditoría de documentos', 'auditoria'),
  ('gestionar_roles', 'Gestionar roles', 'Permite crear y editar roles del sistema', 'configuracion'),
  ('gestionar_usuarios', 'Gestionar usuarios', 'Permite administrar usuarios', 'configuracion')
ON CONFLICT (codigo) DO NOTHING;

-- 2. TABLA: ROLES CONFIGURABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id UUID REFERENCES conjuntos(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  es_sistema BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conjunto_id, nombre)
);

-- Roles de sistema (globales, sin conjunto_id)
INSERT INTO roles (nombre, descripcion, es_sistema, conjunto_id) VALUES
  ('Administrador', 'Administrador del conjunto con acceso completo', true, NULL),
  ('Consejero', 'Miembro del consejo de administración', true, NULL),
  ('Revisor fiscal', 'Auditor financiero y documental', true, NULL),
  ('Evaluador', 'Puede evaluar propuestas pero no administrar', true, NULL)
ON CONFLICT (conjunto_id, nombre) DO NOTHING;

-- 3. TABLA: RELACIÓN ROLES-PERMISOS
-- =====================================================
CREATE TABLE IF NOT EXISTS roles_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rol_id, permiso_id)
);

-- Asignar permisos a roles de sistema
-- Administrador: todos los permisos excepto auditoría
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

-- Consejero: evaluar, votar, ver reportes
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Consejero' AND r.es_sistema = true
  AND p.codigo IN ('evaluar_propuestas', 'votar', 'ver_reportes', 'ver_procesos')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Revisor fiscal: ver finanzas, auditar
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

-- 4. ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_roles_conjunto ON roles(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_rol ON roles_permisos(rol_id);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_permiso ON roles_permisos(permiso_id);
CREATE INDEX IF NOT EXISTS idx_permisos_categoria ON permisos(categoria);

-- 5. TRIGGER PARA updated_at
-- =====================================================
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. HABILITAR RLS
-- =====================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_permisos ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS RLS
-- =====================================================
-- Permisos: todos pueden leer (son definiciones del sistema)
CREATE POLICY "permisos_select_all" ON permisos
  FOR SELECT USING (true);

-- Roles: ver roles de sistema O roles del propio conjunto
CREATE POLICY "roles_select" ON roles
  FOR SELECT USING (
    es_sistema = true 
    OR conjunto_id IS NULL
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() 
      AND (u.rol = 'superadmin' OR u.conjunto_id = roles.conjunto_id)
    )
  );

-- Solo admin/superadmin pueden crear roles en su conjunto
CREATE POLICY "roles_insert" ON roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR (u.rol = 'admin' AND u.conjunto_id = roles.conjunto_id)
      )
    )
  );

-- Solo admin/superadmin pueden actualizar roles de su conjunto (no los de sistema)
CREATE POLICY "roles_update" ON roles
  FOR UPDATE USING (
    es_sistema = false
    AND EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR (u.rol = 'admin' AND u.conjunto_id = roles.conjunto_id)
      )
    )
  );

-- Solo admin/superadmin pueden eliminar roles de su conjunto (no los de sistema)
CREATE POLICY "roles_delete" ON roles
  FOR DELETE USING (
    es_sistema = false
    AND EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR (u.rol = 'admin' AND u.conjunto_id = roles.conjunto_id)
      )
    )
  );

-- Roles_permisos: mismas reglas que roles
CREATE POLICY "roles_permisos_select" ON roles_permisos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = roles_permisos.rol_id
      AND (
        r.es_sistema = true
        OR r.conjunto_id IS NULL
        OR EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = auth.uid()
          AND (u.rol = 'superadmin' OR u.conjunto_id = r.conjunto_id)
        )
      )
    )
  );

CREATE POLICY "roles_permisos_insert" ON roles_permisos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = roles_permisos.rol_id
      AND r.es_sistema = false
      AND EXISTS (
        SELECT 1 FROM usuarios u
        WHERE u.id = auth.uid()
        AND (u.rol = 'superadmin' OR (u.rol = 'admin' AND u.conjunto_id = r.conjunto_id))
      )
    )
  );

CREATE POLICY "roles_permisos_delete" ON roles_permisos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = roles_permisos.rol_id
      AND r.es_sistema = false
      AND EXISTS (
        SELECT 1 FROM usuarios u
        WHERE u.id = auth.uid()
        AND (u.rol = 'superadmin' OR (u.rol = 'admin' AND u.conjunto_id = r.conjunto_id))
      )
    )
  );

-- 8. VISTA PARA ROLES CON PERMISOS
-- =====================================================
CREATE OR REPLACE VIEW vista_roles_permisos AS
SELECT 
  r.id AS rol_id,
  r.nombre AS rol_nombre,
  r.descripcion AS rol_descripcion,
  r.conjunto_id,
  r.es_sistema,
  r.activo,
  COALESCE(
    json_agg(
      json_build_object(
        'id', p.id,
        'codigo', p.codigo,
        'nombre', p.nombre,
        'categoria', p.categoria
      )
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'
  ) AS permisos
FROM roles r
LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos p ON rp.permiso_id = p.id
GROUP BY r.id, r.nombre, r.descripcion, r.conjunto_id, r.es_sistema, r.activo;
