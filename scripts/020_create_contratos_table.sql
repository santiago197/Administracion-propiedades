-- ============================================================================
-- MIGRACIÓN: Sistema de Gestión de Contratos
-- Fecha: 2025
-- Descripción: Tabla para gestionar contratos con alertas de vencimiento
-- ============================================================================

-- Crear tipo ENUM para estados de contrato
DO $$ BEGIN
    CREATE TYPE estado_contrato AS ENUM ('vigente', 'proximo_a_vencer', 'vencido');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLA: contratos
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conjunto_id UUID NOT NULL REFERENCES public.conjuntos(id) ON DELETE CASCADE,
    
    -- Información básica
    nombre VARCHAR(255) NOT NULL,
    responsable VARCHAR(255),
    descripcion TEXT,
    
    -- Fechas del contrato
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    
    -- Configuración de notificación
    dias_preaviso INTEGER NOT NULL DEFAULT 30,
    fecha_max_notificacion DATE,
    
    -- Valor del contrato
    valor DECIMAL(15, 2),
    moneda VARCHAR(3) DEFAULT 'COP',
    
    -- Archivos
    archivo_principal_url TEXT,
    archivo_principal_pathname TEXT,
    
    -- Metadatos
    observaciones TEXT,
    estado estado_contrato DEFAULT 'vigente',
    activo BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT fecha_inicio_antes_fin CHECK (fecha_inicio < fecha_fin),
    CONSTRAINT dias_preaviso_positivo CHECK (dias_preaviso >= 0),
    CONSTRAINT valor_positivo CHECK (valor IS NULL OR valor >= 0)
);

-- ============================================================================
-- TABLA: contrato_anexos (Otrosíes y documentos adicionales)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contrato_anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    archivo_url TEXT,
    archivo_pathname TEXT,
    fecha_documento DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contratos_conjunto_id ON public.contratos(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado ON public.contratos(estado);
CREATE INDEX IF NOT EXISTS idx_contratos_fecha_fin ON public.contratos(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_contratos_fecha_max_notificacion ON public.contratos(fecha_max_notificacion);
CREATE INDEX IF NOT EXISTS idx_contrato_anexos_contrato_id ON public.contrato_anexos(contrato_id);

-- ============================================================================
-- FUNCIÓN: Calcular fecha máxima de notificación (días hábiles)
-- Excluye sábados y domingos
-- ============================================================================
CREATE OR REPLACE FUNCTION calcular_fecha_max_notificacion(
    p_fecha_fin DATE,
    p_dias_preaviso INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
    v_fecha_resultado DATE;
    v_dias_contados INTEGER := 0;
BEGIN
    v_fecha_resultado := p_fecha_fin;
    
    WHILE v_dias_contados < p_dias_preaviso LOOP
        v_fecha_resultado := v_fecha_resultado - INTERVAL '1 day';
        
        -- Solo contar días hábiles (lunes a viernes)
        IF EXTRACT(DOW FROM v_fecha_resultado) NOT IN (0, 6) THEN
            v_dias_contados := v_dias_contados + 1;
        END IF;
    END LOOP;
    
    RETURN v_fecha_resultado;
END;
$$;

-- ============================================================================
-- TRIGGER: Calcular fecha_max_notificacion automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_calcular_fecha_notificacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.fecha_max_notificacion := calcular_fecha_max_notificacion(NEW.fecha_fin, NEW.dias_preaviso);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_calcular_notificacion ON public.contratos;
CREATE TRIGGER trg_contratos_calcular_notificacion
    BEFORE INSERT OR UPDATE OF fecha_fin, dias_preaviso
    ON public.contratos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calcular_fecha_notificacion();

-- ============================================================================
-- FUNCIÓN: Actualizar estado del contrato basado en fechas
-- ============================================================================
CREATE OR REPLACE FUNCTION actualizar_estado_contrato(p_contrato_id UUID)
RETURNS estado_contrato
LANGUAGE plpgsql
AS $$
DECLARE
    v_fecha_fin DATE;
    v_nuevo_estado estado_contrato;
    v_hoy DATE := CURRENT_DATE;
BEGIN
    SELECT fecha_fin INTO v_fecha_fin
    FROM public.contratos
    WHERE id = p_contrato_id;
    
    IF v_fecha_fin IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF v_hoy > v_fecha_fin THEN
        v_nuevo_estado := 'vencido';
    ELSIF v_fecha_fin - v_hoy <= 30 THEN
        v_nuevo_estado := 'proximo_a_vencer';
    ELSE
        v_nuevo_estado := 'vigente';
    END IF;
    
    UPDATE public.contratos
    SET estado = v_nuevo_estado, updated_at = NOW()
    WHERE id = p_contrato_id;
    
    RETURN v_nuevo_estado;
END;
$$;

-- ============================================================================
-- FUNCIÓN: Obtener contratos con estado calculado
-- ============================================================================
CREATE OR REPLACE FUNCTION get_contratos_con_estado(p_conjunto_id UUID)
RETURNS TABLE (
    id UUID,
    conjunto_id UUID,
    nombre VARCHAR(255),
    responsable VARCHAR(255),
    descripcion TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    dias_preaviso INTEGER,
    fecha_max_notificacion DATE,
    valor DECIMAL(15, 2),
    moneda VARCHAR(3),
    archivo_principal_url TEXT,
    archivo_principal_pathname TEXT,
    observaciones TEXT,
    estado estado_contrato,
    estado_calculado estado_contrato,
    dias_para_vencer INTEGER,
    dias_para_notificar INTEGER,
    notificacion_vencida BOOLEAN,
    activo BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_hoy DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.conjunto_id,
        c.nombre,
        c.responsable,
        c.descripcion,
        c.fecha_inicio,
        c.fecha_fin,
        c.dias_preaviso,
        c.fecha_max_notificacion,
        c.valor,
        c.moneda,
        c.archivo_principal_url,
        c.archivo_principal_pathname,
        c.observaciones,
        c.estado,
        CASE 
            WHEN v_hoy > c.fecha_fin THEN 'vencido'::estado_contrato
            WHEN c.fecha_fin - v_hoy <= 30 THEN 'proximo_a_vencer'::estado_contrato
            ELSE 'vigente'::estado_contrato
        END AS estado_calculado,
        (c.fecha_fin - v_hoy)::INTEGER AS dias_para_vencer,
        (c.fecha_max_notificacion - v_hoy)::INTEGER AS dias_para_notificar,
        v_hoy > c.fecha_max_notificacion AS notificacion_vencida,
        c.activo,
        c.created_at,
        c.updated_at
    FROM public.contratos c
    WHERE c.conjunto_id = p_conjunto_id
      AND c.activo = true
    ORDER BY 
        CASE 
            WHEN v_hoy > c.fecha_fin THEN 3
            WHEN c.fecha_fin - v_hoy <= 30 THEN 1
            ELSE 2
        END,
        c.fecha_fin ASC;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_anexos ENABLE ROW LEVEL SECURITY;

-- Políticas para contratos
DROP POLICY IF EXISTS "contratos_select_by_conjunto" ON public.contratos;
CREATE POLICY "contratos_select_by_conjunto" ON public.contratos
    FOR SELECT
    USING (
        conjunto_id IN (
            SELECT u.conjunto_id FROM public.usuarios u 
            WHERE u.id = auth.uid() AND u.activo = true
        )
    );

DROP POLICY IF EXISTS "contratos_insert_by_conjunto" ON public.contratos;
CREATE POLICY "contratos_insert_by_conjunto" ON public.contratos
    FOR INSERT
    WITH CHECK (
        conjunto_id IN (
            SELECT u.conjunto_id FROM public.usuarios u 
            WHERE u.id = auth.uid() AND u.activo = true
        )
    );

DROP POLICY IF EXISTS "contratos_update_by_conjunto" ON public.contratos;
CREATE POLICY "contratos_update_by_conjunto" ON public.contratos
    FOR UPDATE
    USING (
        conjunto_id IN (
            SELECT u.conjunto_id FROM public.usuarios u 
            WHERE u.id = auth.uid() AND u.activo = true
        )
    );

DROP POLICY IF EXISTS "contratos_delete_by_conjunto" ON public.contratos;
CREATE POLICY "contratos_delete_by_conjunto" ON public.contratos
    FOR DELETE
    USING (
        conjunto_id IN (
            SELECT u.conjunto_id FROM public.usuarios u 
            WHERE u.id = auth.uid() AND u.activo = true
        )
    );

-- Políticas para anexos (heredan del contrato padre)
DROP POLICY IF EXISTS "contrato_anexos_select" ON public.contrato_anexos;
CREATE POLICY "contrato_anexos_select" ON public.contrato_anexos
    FOR SELECT
    USING (
        contrato_id IN (
            SELECT c.id FROM public.contratos c
            WHERE c.conjunto_id IN (
                SELECT u.conjunto_id FROM public.usuarios u 
                WHERE u.id = auth.uid() AND u.activo = true
            )
        )
    );

DROP POLICY IF EXISTS "contrato_anexos_insert" ON public.contrato_anexos;
CREATE POLICY "contrato_anexos_insert" ON public.contrato_anexos
    FOR INSERT
    WITH CHECK (
        contrato_id IN (
            SELECT c.id FROM public.contratos c
            WHERE c.conjunto_id IN (
                SELECT u.conjunto_id FROM public.usuarios u 
                WHERE u.id = auth.uid() AND u.activo = true
            )
        )
    );

DROP POLICY IF EXISTS "contrato_anexos_update" ON public.contrato_anexos;
CREATE POLICY "contrato_anexos_update" ON public.contrato_anexos
    FOR UPDATE
    USING (
        contrato_id IN (
            SELECT c.id FROM public.contratos c
            WHERE c.conjunto_id IN (
                SELECT u.conjunto_id FROM public.usuarios u 
                WHERE u.id = auth.uid() AND u.activo = true
            )
        )
    );

DROP POLICY IF EXISTS "contrato_anexos_delete" ON public.contrato_anexos;
CREATE POLICY "contrato_anexos_delete" ON public.contrato_anexos
    FOR DELETE
    USING (
        contrato_id IN (
            SELECT c.id FROM public.contratos c
            WHERE c.conjunto_id IN (
                SELECT u.conjunto_id FROM public.usuarios u 
                WHERE u.id = auth.uid() AND u.activo = true
            )
        )
    );

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT USAGE ON TYPE estado_contrato TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_anexos TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_fecha_max_notificacion TO authenticated;
GRANT EXECUTE ON FUNCTION actualizar_estado_contrato TO authenticated;
GRANT EXECUTE ON FUNCTION get_contratos_con_estado TO authenticated;
