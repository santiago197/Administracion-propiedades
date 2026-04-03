import { createClient as createServerClient } from './server'
import { randomBytes } from 'node:crypto'
import type {
  Conjunto,
  Proceso,
  Consejero,
  Propuesta,
  EstadoPropuesta,
  Documento,
  Evaluacion,
  Voto,
  ProcesoStats,
  ResultadoFinal,
  HistorialEstado,
  TransicionEstado,
  CambioEstadoResult,
  PropuestaRutDatos,
  FilaMatrizEvaluacion,
  DetallesCriterio,
  ClasificacionPropuesta,
  Criterio,
  CriterioEvaluacion,
  TipoDocumentoConfig,
  TipoPersona,
} from '../types/index'
import { CRITERIOS_MATRIZ } from '../types/index'
import { normalizeEstadoDocumentoApp, normalizeEstadoDocumentoDb } from './documentos'

// CONJUNTOS
export async function createConjunto(data: Omit<Conjunto, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerClient()
  return supabase.from('conjuntos').insert([data]).select().single()
}

export async function getConjuntos() {
  const supabase = await createServerClient()
  return supabase.from('conjuntos').select('*').eq('estado', 'activo')
}

export async function getConjunto(id: string) {
  const supabase = await createServerClient()
  return supabase.from('conjuntos').select('*').eq('id', id).single()
}

export async function updateConjunto(id: string, data: Partial<Conjunto>) {
  const supabase = await createServerClient()
  return supabase.from('conjuntos').update(data).eq('id', id).select().single()
}

// PROCESOS
export async function createProceso(data: Omit<Proceso, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerClient()
  return supabase.from('procesos').insert([data]).select().single()
}

export async function getProcesos(conjunto_id: string) {
  const supabase = await createServerClient()
  return supabase.from('procesos').select('*').eq('conjunto_id', conjunto_id)
}

export async function getProcesoConjunto(id: string, conjunto_id: string) {
  const supabase = await createServerClient()
  return supabase.from('procesos').select('*').eq('id', id).eq('conjunto_id', conjunto_id).single()
}

export async function getProceso(id: string) {
  const supabase = await createServerClient()
  return supabase.from('procesos').select('*').eq('id', id).single()
}

export async function updateProceso(id: string, data: Partial<Proceso>) {
  const supabase = await createServerClient()
  return supabase.from('procesos').update(data).eq('id', id).select().single()
}

export async function getProcesoStats(proceso_id: string): Promise<ProcesoStats | null> {
  const supabase = await createServerClient()

  const { data: proceso } = await supabase
    .from('procesos')
    .select('conjunto_id')
    .eq('id', proceso_id)
    .single()

  if (!proceso) return null

  const { count: total_consejeros } = await supabase
    .from('consejeros')
    .select('*', { count: 'exact', head: true })
    .eq('conjunto_id', proceso.conjunto_id)
    .eq('activo', true)

  const { count: total_propuestas } = await supabase
    .from('propuestas')
    .select('*', { count: 'exact', head: true })
    .eq('proceso_id', proceso_id)

  // "Activas" para estadísticas = candidatos habilitados o en evaluación
  const { count: propuestas_activas } = await supabase
    .from('propuestas')
    .select('*', { count: 'exact', head: true })
    .eq('proceso_id', proceso_id)
    .or('estado.eq.habilitada,estado.eq.en_evaluacion')

  const { data: evaluaciones } = await supabase.rpc('get_evaluaciones_count', {
    p_proceso_id: proceso_id,
  })

  return {
    total_consejeros: total_consejeros || 0,
    consejeros_evaluados: evaluaciones?.consejeros_evaluados || 0,
    consejeros_votaron: evaluaciones?.consejeros_votaron || 0,
    total_propuestas: total_propuestas || 0,
    propuestas_activas: propuestas_activas || 0,
    evaluaciones_completadas: evaluaciones?.evaluaciones_completadas || 0,
    votaciones_completadas: evaluaciones?.votaciones_completadas || 0,
  }
}

// CONSEJEROS
export async function createConsejero(data: Omit<Consejero, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerClient()
  return supabase.from('consejeros').insert([data]).select().single()
}

export async function getConsejeros(conjunto_id: string, includeInactive = false) {
  const supabase = await createServerClient()
  let query = supabase.from('consejeros').select('*').eq('conjunto_id', conjunto_id)
  
  if (!includeInactive) {
    query = query.eq('activo', true)
  }
  
  return query.order('created_at', { ascending: false })
}

export async function generateUniqueCodigoAcceso(conjuntoNombre?: string): Promise<string> {
  const supabase = await createServerClient()

  // Prefijo = primeras 3 letras del nombre del conjunto (solo letras, mayúsculas)
  const rawPrefix =
    conjuntoNombre?.replace(/[^A-Za-z]/g, '').toUpperCase() || 'CON'
  const prefix = rawPrefix.padEnd(3, 'X').slice(0, 3)

  // Año = últimos 2 dígitos
  const year = new Date().getFullYear().toString().slice(-2)

  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codigoLength = 8
  const randomLength = codigoLength - prefix.length - year.length // Prefijo + Año + Random

  if (randomLength <= 0) {
    throw new Error('Configuración inválida para la generación de códigos')
  }

  let codigo: string
  let attempts = 0
  const maxAttempts = 10

  do {
    const bytes = randomBytes(randomLength)
    const random = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')

    // Final: Prefijo + Año + Random
    codigo = `${prefix}${year}${random}`

    const { data, error } = await supabase
      .from('consejeros')
      .select('id')
      .eq('codigo_acceso', codigo)
      .maybeSingle()

    if (error) throw error

    if (!data) break

    attempts++
  } while (attempts < maxAttempts)

  if (attempts >= maxAttempts) {
    throw new Error('No se pudo generar un código único')
  }

  return codigo
}

export async function getConsejero(id: string) {
  const supabase = await createServerClient()
  return supabase.from('consejeros').select('*').eq('id', id).single()
}

export async function getConsejeroByCodigo(codigo: string) {
  const supabase = await createServerClient()
  return supabase.from('consejeros').select('*').eq('codigo_acceso', codigo).single()
}

export async function updateConsejero(id: string, data: Partial<Consejero>) {
  const supabase = await createServerClient()
  return supabase.from('consejeros').update(data).eq('id', id).select().single()
}

// PROPUESTAS
export type CreatePropuestaInput = Omit<
  Propuesta,
  | 'id'
  | 'estado'
  | 'clasificacion'
  | 'cumple_requisitos_legales'
  | 'observaciones_legales'
  | 'puntaje_legal'
  | 'puntaje_tecnico'
  | 'puntaje_financiero'
  | 'puntaje_referencias'
  | 'puntaje_propuesta'
  | 'puntaje_evaluacion'
  | 'votos_recibidos'
  | 'puntaje_final'
  | 'created_at'
  | 'updated_at'
>

export async function createPropuesta(data: CreatePropuestaInput) {
  const supabase = await createServerClient()
  return supabase.from('propuestas').insert([data]).select().single()
}

export async function existePropuestaPorDocumento(proceso_id: string, nit_cedula: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('propuestas')
    .select('id')
    .eq('proceso_id', proceso_id)
    .eq('nit_cedula', nit_cedula)
    .neq('estado', 'retirada')
    .maybeSingle()
  return { existe: !!data, error }
}

export async function getPropuestas(proceso_id: string) {
  const supabase = await createServerClient()
  return supabase.from('propuestas').select('*').eq('proceso_id', proceso_id)
}

export async function getPropuestaConjunto(id: string, conjunto_id: string) {
  const supabase = await createServerClient()

  const { data: propuesta, error: propError } = await supabase
    .from('propuestas')
    .select('id, proceso_id, estado, tipo_persona, razon_social')
    .eq('id', id)
    .single()

  if (propError || !propuesta) {
    return { data: null, error: propError }
  }

  const { data: proceso, error: procError } = await supabase
    .from('procesos')
    .select('conjunto_id')
    .eq('id', propuesta.proceso_id)
    .single()

  if (procError || !proceso || proceso.conjunto_id !== conjunto_id) {
    return { data: null, error: procError ?? { message: 'FORBIDDEN' } }
  }

  return { data: propuesta, error: null }
}

export async function getPropuesta(id: string) {
  const supabase = await createServerClient()
  return supabase.from('propuestas').select('*').eq('id', id).single()
}

export async function updatePropuesta(id: string, data: Partial<Propuesta>) {
  const supabase = await createServerClient()
  return supabase.from('propuestas').update(data).eq('id', id).select().single()
}

/**
 * Cuenta propuestas en estados "activos" (no terminales) de un proceso.
 * Para la evaluación, solo considera las que están en 'en_evaluacion'.
 */
export async function contarPropuestasActivas(proceso_id: string) {
  const supabase = await createServerClient()
  const { count } = await supabase
    .from('propuestas')
    .select('*', { count: 'exact', head: true })
    .eq('proceso_id', proceso_id)
    .eq('estado', 'en_evaluacion')
  return count || 0
}

export async function contarPropuestasTotales(proceso_id: string) {
  const supabase = await createServerClient()
  const { count } = await supabase
    .from('propuestas')
    .select('*', { count: 'exact', head: true })
    .eq('proceso_id', proceso_id)
  return count || 0
}

// DOCUMENTOS
export async function createDocumento(
  data: Omit<Documento, 'id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerClient()
  const payload = {
    ...data,
    estado: normalizeEstadoDocumentoDb(data.estado),
  }
  return supabase.from('documentos').insert([payload]).select().single()
}

export async function getDocumentos(propuesta_id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('propuesta_id', propuesta_id)

  return {
    data: (data ?? []).map((doc) => ({
      ...doc,
      estado: normalizeEstadoDocumentoApp(doc.estado),
    })),
    error,
  }
}

export async function updateDocumento(id: string, data: Partial<Documento>) {
  const supabase = await createServerClient()
  const payload = {
    ...data,
    ...(data.estado ? { estado: normalizeEstadoDocumentoDb(data.estado) } : {}),
  }
  return supabase.from('documentos').update(payload).eq('id', id).select().single()
}

export async function deleteDocumento(id: string) {
  const supabase = await createServerClient()
  return supabase.from('documentos').delete().eq('id', id)
}

export async function validarDocumentacionObligatoria(propuesta_id: string) {
  const supabase = await createServerClient()
  const { data: documentos, error } = await supabase
    .from('documentos')
    .select('es_obligatorio, estado, nombre')
    .eq('propuesta_id', propuesta_id)

  if (error) throw error

  const incompletos =
    documentos?.filter(
      (d) => d.es_obligatorio && normalizeEstadoDocumentoApp(d.estado) !== 'completo'
    ) ?? []

  return {
    completa: incompletos.length === 0,
    faltantes: incompletos.length,
    documentos_faltantes: incompletos.map((d) => d.nombre as string),
  }
}

export async function getDocumentoConjunto(id: string, conjunto_id: string) {
  const supabase = await createServerClient()

  const { data: documento, error: docError } = await supabase
    .from('documentos')
    .select('id, propuesta_id')
    .eq('id', id)
    .single()

  if (docError || !documento) {
    return { data: null, error: docError }
  }

  const { data: propuesta, error: propError } = await supabase
    .from('propuestas')
    .select('proceso_id')
    .eq('id', documento.propuesta_id)
    .single()

  if (propError || !propuesta) {
    return { data: null, error: propError }
  }

  const { data: proceso, error: procError } = await supabase
    .from('procesos')
    .select('conjunto_id')
    .eq('id', propuesta.proceso_id)
    .single()

  if (procError || !proceso || proceso.conjunto_id !== conjunto_id) {
    return { data: null, error: procError ?? { message: 'FORBIDDEN' } }
  }

  return { data: documento, error: null }
}

// EVALUACIONES
export async function createEvaluacion(data: Omit<Evaluacion, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerClient()
  return supabase.from('evaluaciones').insert([data]).select().single()
}

export async function getEvaluacionesConsejero(consejero_id: string, proceso_id: string) {
  const supabase = await createServerClient()
  return supabase
    .from('evaluaciones')
    .select('*')
    .eq('consejero_id', consejero_id)
    .eq('proceso_id', proceso_id)
}

/**
 * Valida si la documentación de una propuesta está completa.
 * Usa la máquina de estados para la transición — no hace UPDATE directo.
 * La propuesta debe estar en 'en_revision' para llamar esta función.
 *
 * Transiciones posibles:
 *   en_revision → incompleto  (falta algún documento obligatorio)
 *   en_revision → en_validacion (documentación completa)
 */
export async function validarDocumentacionPropuesta(
  propuesta_id: string,
  usuario_id: string | null = null
) {
  const supabase = await createServerClient()

  const { data: documentos, error: docsError } = await supabase
    .from('documentos')
    .select('es_obligatorio, estado')
    .eq('propuesta_id', propuesta_id)

  if (docsError) throw docsError

  const hayObligatoriosFaltantes = documentos?.some(
    (d) => d.es_obligatorio && normalizeEstadoDocumentoApp(d.estado) !== 'completo'
  )

  if (hayObligatoriosFaltantes) {
    const { data, error } = await supabase.rpc('cambiar_estado_propuesta', {
      p_propuesta_id: propuesta_id,
      p_estado_nuevo: 'incompleto',
      p_usuario_id: usuario_id,
      p_observacion: 'Documentación obligatoria incompleta detectada en revisión automática',
      p_metadata: { origen: 'validarDocumentacionPropuesta' },
    })
    if (error) throw error
    return { success: true, estado: 'incompleto' as EstadoPropuesta, detalle: data }
  }

  const { data, error } = await supabase.rpc('cambiar_estado_propuesta', {
    p_propuesta_id: propuesta_id,
    p_estado_nuevo: 'en_validacion',
    p_usuario_id: usuario_id,
    p_observacion: null,
    p_metadata: { origen: 'validarDocumentacionPropuesta' },
  })
  if (error) throw error
  return { success: true, estado: 'en_validacion' as EstadoPropuesta, detalle: data }
}

/**
 * Registra el resultado de la validación legal (SARLAFT, antecedentes, etc.).
 * Usa la máquina de estados — no hace UPDATE directo.
 * La propuesta debe estar en 'en_validacion'.
 *
 * Transiciones posibles:
 *   en_validacion → habilitada     (cumple todos los requisitos)
 *   en_validacion → no_apto_legal  (ELIMINATORIO)
 */
export async function procesarValidacionLegal(
  propuesta_id: string,
  cumple: boolean,
  observaciones: string,
  usuario_id: string | null = null
) {
  const supabase = await createServerClient()

  const nuevoEstado: EstadoPropuesta = cumple ? 'habilitada' : 'no_apto_legal'

  // Actualizar campos legales en la misma transacción lógica
  await supabase
    .from('propuestas')
    .update({
      cumple_requisitos_legales: cumple,
      observaciones_legales: observaciones,
    })
    .eq('id', propuesta_id)

  const { data, error } = await supabase.rpc('cambiar_estado_propuesta', {
    p_propuesta_id: propuesta_id,
    p_estado_nuevo: nuevoEstado,
    p_usuario_id: usuario_id,
    p_observacion: observaciones,
    p_metadata: { origen: 'procesarValidacionLegal', cumple_requisitos: cumple },
  })

  if (error) throw error
  return { success: true, estado: nuevoEstado, detalle: data }
}

export async function validarDocumento(id: string, estado: string, observaciones: string, userId: string) {
  const supabase = await createServerClient()
  const estadoNormalizado = normalizeEstadoDocumentoDb(estado)

  const { data, error } = await supabase
    .from('documentos')
    .update({
      estado: estadoNormalizado,
      observaciones,
      validado_por: userId,
      fecha_validacion: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Registrar auditoría
  await supabase.from('audit_log').insert({
    accion: estadoNormalizado === 'APROBADO' ? 'APROBACION_DOCUMENTO' : 'RECHAZO_DOCUMENTO',
    entidad: 'documentos',
    entidad_id: id,
    datos_nuevos: { estado: estadoNormalizado, observaciones },
    consejero_id: userId // Usar como responsable genérico si aplica
  })

  return data
}

export async function getTiposDocumento() {
  const supabase = await createServerClient()
  return supabase.from('tipos_documento').select('*').eq('activo', true)
}

export async function verificarEvaluacionCompleta(consejero_id: string, proceso_id: string) {
  const supabase = await createServerClient()

  // Solo las propuestas en 'en_evaluacion' requieren ser evaluadas
  const { count: total_propuestas } = await supabase
    .from('propuestas')
    .select('*', { count: 'exact', head: true })
    .eq('proceso_id', proceso_id)
    .eq('estado', 'en_evaluacion')

  // Obtener propuestas evaluadas por consejero
  const { data: propuestas_evaluadas } = await supabase
    .from('evaluaciones')
    .select('propuesta_id', { count: 'exact' })
    .eq('consejero_id', consejero_id)
    .eq('proceso_id', proceso_id)

  const propuestas_unicas = new Set(propuestas_evaluadas?.map((e) => e.propuesta_id))

  return propuestas_unicas.size >= (total_propuestas || 0)
}

// VOTOS
export async function createVoto(data: Omit<Voto, 'id' | 'created_at'>) {
  const supabase = await createServerClient()
  return supabase.from('votos').insert([data]).select().single()
}

export async function getVotoConsejero(proceso_id: string, consejero_id: string) {
  const supabase = await createServerClient()
  return supabase
    .from('votos')
    .select('*')
    .eq('proceso_id', proceso_id)
    .eq('consejero_id', consejero_id)
    .single()
}

export async function verificarYaVoto(proceso_id: string, consejero_id: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('votos')
    .select('id', { count: 'exact', head: true })
    .eq('proceso_id', proceso_id)
    .eq('consejero_id', consejero_id)
  return (data?.length || 0) > 0
}

// MÁQUINA DE ESTADOS

/**
 * Ejecuta un cambio de estado validado a través de la función Postgres
 * `cambiar_estado_propuesta`. Registra historial y audit_log automáticamente.
 *
 * Errores con prefijo conocido:
 *   PROPUESTA_NOT_FOUND  → 404
 *   INVALID_TRANSITION   → 422
 *   OBSERVACION_REQUERIDA → 400
 */
export async function cambiarEstadoPropuesta(
  propuesta_id: string,
  estado_nuevo: EstadoPropuesta,
  usuario_id: string | null,
  observacion: string | null,
  metadata?: Record<string, unknown>
) {
  const supabase = await createServerClient()
  return supabase.rpc('cambiar_estado_propuesta', {
    p_propuesta_id: propuesta_id,
    p_estado_nuevo: estado_nuevo,
    p_usuario_id:   usuario_id,
    p_observacion:  observacion,
    p_metadata:     metadata ?? null,
  }) as Promise<{ data: CambioEstadoResult | null; error: { message: string } | null }>
}

/**
 * Devuelve el historial completo de estados de una propuesta,
 * ordenado cronológicamente (más antiguo primero).
 */
export async function getHistorialEstados(propuesta_id: string) {
  const supabase = await createServerClient()
      return supabase
        .from('historial_estados_propuesta')
        .select('*')
        .eq('propuesta_id', propuesta_id)
        .order('created_at', { ascending: true }) as Promise<{
      data: HistorialEstado[] | null
      error: { message: string } | null
    }>
}

/**
 * Consulta la tabla transiciones_estado para devolver
 * las transiciones disponibles desde el estado actual.
 * Usado por el frontend para renderizar solo opciones válidas.
 */
export async function getTransicionesDisponibles(estado_actual: EstadoPropuesta) {
  const supabase = await createServerClient()
  return supabase.rpc('get_transiciones_disponibles', {
    p_estado_actual: estado_actual,
  }) as Promise<{
    data: TransicionEstado[] | null
    error: { message: string } | null
  }>
}

// RESULTADOS
export async function getResultadosFinales(proceso_id: string): Promise<ResultadoFinal[]> {
  const supabase = await createServerClient()

  // Leer directamente de propuestas para incluir clasificacion (la vista no la expone)
  const { data: propuestas } = await supabase
    .from('propuestas')
    .select('id, razon_social, tipo_persona, nit_cedula, estado, puntaje_evaluacion, votos_recibidos, puntaje_final, clasificacion')
    .eq('proceso_id', proceso_id)
    .in('estado', ['en_evaluacion', 'condicionado', 'apto', 'destacado', 'no_apto', 'adjudicado'])
    .order('puntaje_final', { ascending: false, nullsFirst: false })

  if (!propuestas) return []

  return propuestas.map((p, index) => {
    let estado_semaforo: 'verde' | 'amarillo' | 'rojo'
    const pf = Number(p.puntaje_final ?? 0)

    if (pf >= 70) {
      estado_semaforo = 'verde'
    } else if (pf >= 55) {
      estado_semaforo = 'amarillo'
    } else {
      estado_semaforo = 'rojo'
    }

    return {
      propuesta_id: p.id,
      razon_social: p.razon_social,
      puntaje_evaluacion: Number(p.puntaje_evaluacion ?? 0),
      votos_recibidos: Number(p.votos_recibidos ?? 0),
      puntaje_final: pf,
      posicion: index + 1,
      estado_semaforo,
      clasificacion: p.clasificacion ?? null,
    }
  })
}

// MATRIZ DE EVALUACIÓN ADMIN

type EvaluacionAdminRow = {
  id: string
  propuesta_id: string
  puntaje_total: number
  clasificacion: string
  created_at: string
  puntajes_criterio: Array<{ criterio_codigo: string; puntaje: number }>
}

/**
 * Retorna la matriz de evaluación del admin por propuesta para un proceso.
 * Incluye el desglose por los 9 criterios con respuesta (Sí/No), peso y puntaje.
 */
export async function getMatrizEvaluacionAdmin(proceso_id: string): Promise<FilaMatrizEvaluacion[]> {
  const supabase = await createServerClient()

  const { data: propuestas } = await supabase
    .from('propuestas')
    .select('id, razon_social, clasificacion')
    .eq('proceso_id', proceso_id)
    .in('estado', ['en_evaluacion', 'condicionado', 'apto', 'destacado', 'no_apto', 'adjudicado'])
    .order('razon_social', { ascending: true })

  if (!propuestas || propuestas.length === 0) return []

  const propuestaIds = propuestas.map((p) => p.id)

  const { data: evaluaciones } = await supabase
    .from('evaluaciones_admin')
    .select('id, propuesta_id, puntaje_total, clasificacion, created_at, puntajes_criterio(criterio_codigo, puntaje)')
    .in('propuesta_id', propuestaIds)
    .order('created_at', { ascending: false })

  // Más reciente por propuesta
  const evalByPropuesta = new Map<string, EvaluacionAdminRow>()
  for (const ev of ((evaluaciones ?? []) as EvaluacionAdminRow[])) {
    if (!evalByPropuesta.has(ev.propuesta_id)) {
      evalByPropuesta.set(ev.propuesta_id, ev)
    }
  }

  return propuestas.map((p) => {
    const ev = evalByPropuesta.get(p.id)

    const puntajeMap = new Map<string, number>()
    for (const pc of (ev?.puntajes_criterio ?? [])) {
      puntajeMap.set(pc.criterio_codigo, pc.puntaje)
    }

    const criterios: DetallesCriterio[] = CRITERIOS_MATRIZ.map((c) => {
      const puntaje = puntajeMap.get(c.codigo) ?? 0
      return {
        criterio_codigo: c.codigo,
        nombre: c.nombre,
        descripcion: c.descripcion,
        respuesta: puntaje > 0,
        peso: c.peso,
        puntaje,
      }
    })

    return {
      propuesta_id: p.id,
      razon_social: p.razon_social,
      puntaje_total: ev?.puntaje_total ?? 0,
      clasificacion: ((ev?.clasificacion ?? p.clasificacion) as ClasificacionPropuesta) ?? null,
      fecha_evaluacion: ev?.created_at ?? null,
      criterios: ev ? criterios : [],
    }
  })
}

// DATOS COMPLETOS PARA ACTA PDF
export interface VotoDetallado {
  consejero_nombre: string
  consejero_cargo: string
  consejero_apartamento: string
  propuesta_votada: string
  puntaje_final_propuesta: number
}

export interface DatosActa {
  proceso: { nombre: string; fecha_inicio: string; fecha_fin?: string; peso_evaluacion: number; peso_votacion: number }
  conjunto: { nombre: string; direccion: string; ciudad: string; logo_url?: string }
  candidatos: Array<{ razon_social: string; tipo_persona: string; estado: string; clasificacion?: string | null }>
  matriz: FilaMatrizEvaluacion[]
  ranking: ResultadoFinal[]
  votos: VotoDetallado[]
  fecha_generacion: string
  numero_acta?: string
}

export async function getDatosActa(proceso_id: string): Promise<DatosActa> {
  const supabase = await createServerClient()

  // Proceso + conjunto
  const { data: proceso } = await supabase
    .from('procesos')
    .select('nombre, fecha_inicio, fecha_fin, peso_evaluacion, peso_votacion, conjunto_id, conjuntos(nombre, direccion, ciudad, logo_url)')
    .eq('id', proceso_id)
    .single()

  // Candidatos del proceso
  const { data: propuestas } = await supabase
    .from('propuestas')
    .select('razon_social, tipo_persona, estado, clasificacion')
    .eq('proceso_id', proceso_id)
    .order('razon_social', { ascending: true })

  // Votos con detalle de consejero y propuesta votada
  const { data: votosRaw } = await supabase
    .from('votos')
    .select('consejeros(nombre_completo, cargo, apartamento), propuestas(razon_social, puntaje_final)')
    .eq('proceso_id', proceso_id)

  const votos: VotoDetallado[] = (votosRaw ?? []).map((v: any) => ({
    consejero_nombre: v.consejeros?.nombre_completo ?? '—',
    consejero_cargo: v.consejeros?.cargo ?? '—',
    consejero_apartamento: v.consejeros?.apartamento ?? '—',
    propuesta_votada: v.propuestas?.razon_social ?? '—',
    puntaje_final_propuesta: Number(v.propuestas?.puntaje_final ?? 0),
  })).sort((a, b) => b.puntaje_final_propuesta - a.puntaje_final_propuesta)

  const [matriz, ranking] = await Promise.all([
    getMatrizEvaluacionAdmin(proceso_id),
    getResultadosFinales(proceso_id),
  ])

  const conjunto = (proceso as any)?.conjuntos

  return {
    proceso: {
      nombre: proceso?.nombre ?? '',
      fecha_inicio: proceso?.fecha_inicio ?? '',
      fecha_fin: proceso?.fecha_fin ?? undefined,
      peso_evaluacion: proceso?.peso_evaluacion ?? 0,
      peso_votacion: proceso?.peso_votacion ?? 0,
    },
    conjunto: {
      nombre: conjunto?.nombre ?? '',
      direccion: conjunto?.direccion ?? '',
      ciudad: conjunto?.ciudad ?? '',
      logo_url: (conjunto as any)?.logo_url ?? undefined,
    },
    candidatos: (propuestas ?? []).map((p: any) => ({
      razon_social: p.razon_social,
      tipo_persona: p.tipo_persona,
      estado: p.estado,
      clasificacion: p.clasificacion ?? null,
    })),
    matriz,
    ranking,
    votos,
    fecha_generacion: new Date().toISOString(),
  }
}

// PROPUESTA RUT DATOS
export async function upsertPropuestaRutDatos(
  data: Omit<PropuestaRutDatos, 'id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerClient()
  return supabase
    .from('propuesta_rut_datos')
    .upsert(data, { onConflict: 'propuesta_id' })
    .select()
    .single()
}

export async function getPropuestaRutDatos(propuesta_id: string) {
  const supabase = await createServerClient()
  return supabase
    .from('propuesta_rut_datos')
    .select('*')
    .eq('propuesta_id', propuesta_id)
    .maybeSingle()
}

// TIPOS DOCUMENTO — CRUD
export async function createTipoDocumento(
  data: Omit<TipoDocumentoConfig, 'id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerClient()
  return supabase.from('tipos_documento').insert([data]).select().single()
}

export async function updateTipoDocumento(
  id: string,
  data: Partial<Omit<TipoDocumentoConfig, 'id' | 'created_at' | 'updated_at'>>
) {
  const supabase = await createServerClient()
  return supabase.from('tipos_documento').update(data).eq('id', id).select().single()
}

export async function deleteTipoDocumento(id: string) {
  const supabase = await createServerClient()
  return supabase.from('tipos_documento').delete().eq('id', id)
}

/**
 * Retorna los tipos de documento requeridos que no han sido cubiertos por la propuesta.
 * Considera todos los tipos activos aplicables al tipo_persona de la propuesta.
 */
export async function getDocumentosFaltantes(propuesta_id: string): Promise<{
  faltantes: TipoDocumentoConfig[]
  cubiertos: TipoDocumentoConfig[]
  tipoPersona: TipoPersona | null
}> {
  const supabase = await createServerClient()

  const { data: propuesta, error: propError } = await supabase
    .from('propuestas')
    .select('tipo_persona')
    .eq('id', propuesta_id)
    .single()

  if (propError || !propuesta) return { faltantes: [], cubiertos: [], tipoPersona: null }

  const tipoPersona = propuesta.tipo_persona as TipoPersona

  const { data: tipos } = await supabase
    .from('tipos_documento')
    .select('*')
    .eq('activo', true)
    .in('tipo_persona', [tipoPersona, 'ambos'])
    .order('es_obligatorio', { ascending: false })

  if (!tipos || tipos.length === 0) return { faltantes: [], cubiertos: [], tipoPersona }

  const { data: documentos } = await supabase
    .from('documentos')
    .select('tipo_documento_id, tipo')
    .eq('propuesta_id', propuesta_id)
 
  const tiposCubiertos = new Set<string>()
  const codigoToId = new Map(
    (tipos as TipoDocumentoConfig[]).map((t) => [t.codigo, t.id])
  )
  ;(documentos ?? []).forEach((doc) => {
    if (doc.tipo_documento_id) {
      tiposCubiertos.add(doc.tipo_documento_id as string)
      return
    }
    if (doc.tipo && codigoToId.has(doc.tipo as string)) {
      tiposCubiertos.add(codigoToId.get(doc.tipo as string)!)
    }
  })

  const faltantes = (tipos as TipoDocumentoConfig[]).filter(
    (t) => t.es_obligatorio && !tiposCubiertos.has(t.id)
  )
  const cubiertos = (tipos as TipoDocumentoConfig[]).filter((t) => tiposCubiertos.has(t.id))

  return { faltantes, cubiertos, tipoPersona }
}

// ROLES Y PERMISOS — CRUD
import type { Rol, Permiso, RolConPermisos } from '../types/index'

export async function getPermisos(): Promise<Permiso[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('permisos')
    .select('*')
    .order('categoria', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) throw error
  return (data ?? []) as Permiso[]
}

export async function getRoles(conjunto_id?: string | null): Promise<RolConPermisos[]> {
  const supabase = await createServerClient()

  let query = supabase.from('vista_roles_permisos').select('*')

  if (conjunto_id) {
    query = query.or(`es_sistema.eq.true,conjunto_id.eq.${conjunto_id}`)
  }

  const { data, error } = await query.order('es_sistema', { ascending: false }).order('nombre', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.rol_id as string,
    conjunto_id: row.conjunto_id as string | null,
    nombre: row.rol_nombre as string,
    descripcion: row.rol_descripcion as string | undefined,
    es_sistema: row.es_sistema as boolean,
    activo: row.activo as boolean,
    permisos: row.permisos as RolConPermisos['permisos'],
    created_at: '',
    updated_at: '',
  }))
}

export async function getRol(id: string): Promise<RolConPermisos | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('vista_roles_permisos')
    .select('*')
    .eq('rol_id', id)
    .single()

  if (error || !data) return null

  const row = data as Record<string, unknown>
  return {
    id: row.rol_id as string,
    conjunto_id: row.conjunto_id as string | null,
    nombre: row.rol_nombre as string,
    descripcion: row.rol_descripcion as string | undefined,
    es_sistema: row.es_sistema as boolean,
    activo: row.activo as boolean,
    permisos: row.permisos as RolConPermisos['permisos'],
    created_at: '',
    updated_at: '',
  }
}

export async function createRol(data: {
  nombre: string
  descripcion?: string
  conjunto_id: string
  permisos_ids?: string[]
}) {
  const supabase = await createServerClient()

  const { data: rol, error: rolError } = await supabase
    .from('roles')
    .insert([{
      nombre: data.nombre,
      descripcion: data.descripcion,
      conjunto_id: data.conjunto_id,
      es_sistema: false,
      activo: true,
    }])
    .select()
    .single()

  if (rolError) throw rolError

  if (data.permisos_ids && data.permisos_ids.length > 0) {
    const rolesPermisos = data.permisos_ids.map((permiso_id) => ({
      rol_id: rol.id,
      permiso_id,
    }))

    const { error: rpError } = await supabase.from('roles_permisos').insert(rolesPermisos)
    if (rpError) throw rpError
  }

  return rol as Rol
}

export async function updateRol(
  id: string,
  data: {
    nombre?: string
    descripcion?: string
    activo?: boolean
    permisos_ids?: string[]
  }
) {
  const supabase = await createServerClient()

  const updateData: Partial<Rol> = {}
  if (data.nombre !== undefined) updateData.nombre = data.nombre
  if (data.descripcion !== undefined) updateData.descripcion = data.descripcion
  if (data.activo !== undefined) updateData.activo = data.activo

  if (Object.keys(updateData).length > 0) {
    const { error: rolError } = await supabase.from('roles').update(updateData).eq('id', id)
    if (rolError) throw rolError
  }

  if (data.permisos_ids !== undefined) {
    const { error: deleteError } = await supabase.from('roles_permisos').delete().eq('rol_id', id)
    if (deleteError) throw deleteError

    if (data.permisos_ids.length > 0) {
      const rolesPermisos = data.permisos_ids.map((permiso_id) => ({
        rol_id: id,
        permiso_id,
      }))
      const { error: insertError } = await supabase.from('roles_permisos').insert(rolesPermisos)
      if (insertError) throw insertError
    }
  }

  return getRol(id)
}

export async function deleteRol(id: string) {
  const supabase = await createServerClient()

  // Primero verificar que no es de sistema
  const { data: rol, error: checkError } = await supabase
    .from('roles')
    .select('es_sistema')
    .eq('id', id)
    .single()

  if (checkError) throw checkError
  if (rol?.es_sistema) throw new Error('No se puede eliminar un rol de sistema')

  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw error

  return { success: true }
}

// USUARIOS — CRUD
import type { Usuario, UsuarioConConjunto, RolUsuario } from '../types/index'

export async function getUsuarios(conjunto_id?: string | null): Promise<UsuarioConConjunto[]> {
  const supabase = await createServerClient()

  let query = supabase
    .from('usuarios')
    .select(`
      *,
      conjunto:conjuntos(id, nombre),
      usuarios_permisos(permiso:permisos(id, codigo, nombre, categoria))
    `)
    .order('created_at', { ascending: false })

  if (conjunto_id) {
    query = query.eq('conjunto_id', conjunto_id)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>
    const permisosRaw = (record.usuarios_permisos ?? []) as Array<{ permiso?: unknown }>
    const permisos = permisosRaw
      .map((item) => item.permiso)
      .filter(Boolean) as UsuarioConConjunto['permisos']
    const { usuarios_permisos: _ignored, ...rest } = record
    return {
      ...(rest as UsuarioConConjunto),
      permisos,
    }
  })
}

export async function getUsuario(id: string): Promise<UsuarioConConjunto | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      *,
      conjunto:conjuntos(id, nombre),
      usuarios_permisos(permiso:permisos(id, codigo, nombre, categoria))
    `)
    .eq('id', id)
    .single()

  if (error) return null
  const record = data as Record<string, unknown>
  const permisosRaw = (record.usuarios_permisos ?? []) as Array<{ permiso?: unknown }>
  const permisos = permisosRaw
    .map((item) => item.permiso)
    .filter(Boolean) as UsuarioConConjunto['permisos']
  const { usuarios_permisos: _ignored, ...rest } = record
  return {
    ...(rest as UsuarioConConjunto),
    permisos,
  }
}

export async function updateUsuario(
  id: string,
  data: {
    nombre?: string
    rol?: RolUsuario
    activo?: boolean
    conjunto_id?: string | null
    permisos_ids?: string[]
  }
) {
  const supabase = await createServerClient()

  const updateData: Partial<Usuario> = {}
  if (data.nombre !== undefined) updateData.nombre = data.nombre
  if (data.rol !== undefined) updateData.rol = data.rol
  if (data.activo !== undefined) updateData.activo = data.activo
  if (data.conjunto_id !== undefined) updateData.conjunto_id = data.conjunto_id

  const { data: updated, error } = await supabase
    .from('usuarios')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (data.permisos_ids !== undefined) {
    const { error: deleteError } = await supabase
      .from('usuarios_permisos')
      .delete()
      .eq('usuario_id', id)
    if (deleteError) throw deleteError

    if (data.permisos_ids.length > 0) {
      const usuariosPermisos = data.permisos_ids.map((permiso_id) => ({
        usuario_id: id,
        permiso_id,
      }))
      const { error: insertError } = await supabase
        .from('usuarios_permisos')
        .insert(usuariosPermisos)
      if (insertError) throw insertError
    }
  }

  return (await getUsuario(id)) ?? (updated as Usuario)
}

export async function deleteUsuario(id: string) {
  const supabase = await createServerClient()

  // No permitir eliminar el propio usuario
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === id) {
    throw new Error('No puedes eliminar tu propio usuario')
  }

  // Eliminar de la tabla usuarios (auth.users se maneja por separado)
  const { error } = await supabase.from('usuarios').delete().eq('id', id)
  if (error) throw error

  return { success: true }
}

// CRITERIOS DE EVALUACIÓN — CRUD
export async function getCriterios(soloActivos = false): Promise<CriterioEvaluacion[]> {
  const supabase = await createServerClient()

  let query = supabase
    .from('criterios_evaluacion')
    .select('*')
    .order('orden', { ascending: true })

  if (soloActivos) {
    query = query.eq('activo', true)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as CriterioEvaluacion[]
}

export async function getCriteriosProceso(procesoId: string): Promise<Criterio[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('criterios')
    .select(
      'id, proceso_id, criterio_evaluacion_id, peso, valor_minimo, valor_maximo, orden, activo, criterios_evaluacion:criterio_evaluacion_id (id, nombre, descripcion, tipo, orden, activo)'
    )
    .eq('proceso_id', procesoId)
    .order('orden', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => {
    const catalogo = row.criterios_evaluacion
    return {
      id: row.id,
      proceso_id: row.proceso_id,
      criterio_evaluacion_id: row.criterio_evaluacion_id,
      nombre: catalogo?.nombre ?? 'Criterio',
      descripcion: catalogo?.descripcion ?? null,
      tipo: catalogo?.tipo ?? 'escala',
      peso: row.peso,
      valor_minimo: row.valor_minimo,
      valor_maximo: row.valor_maximo,
      orden: row.orden ?? 0,
      activo: row.activo ?? true,
    }
  })
}

export async function createCriterioProceso(data: {
  proceso_id: string
  criterio_evaluacion_id: string
  peso: number
  valor_minimo: number
  valor_maximo: number
  orden?: number
  activo?: boolean
}): Promise<Criterio> {
  const supabase = await createServerClient()

  const { data: catalogoData } = await supabase
    .from('criterios_evaluacion')
    .select('nombre, descripcion, tipo')
    .eq('id', data.criterio_evaluacion_id)
    .maybeSingle()

  try {
    const insertPayload = {
      proceso_id: data.proceso_id,
      criterio_evaluacion_id: data.criterio_evaluacion_id,
      peso: data.peso,
      valor_minimo: data.valor_minimo,
      valor_maximo: data.valor_maximo,
      orden: data.orden ?? 0,
      activo: data.activo ?? true,
    }

    const { data: created, error } = await supabase
      .from('criterios')
      .insert([insertPayload])
      .select('id, proceso_id, criterio_evaluacion_id, peso, valor_minimo, valor_maximo, orden, activo')
      .single()

    if (error) throw error

    return {
      id: created.id,
      proceso_id: created.proceso_id,
      criterio_evaluacion_id: created.criterio_evaluacion_id,
      nombre: catalogoData?.nombre ?? 'Criterio',
      descripcion: catalogoData?.descripcion ?? null,
      tipo: catalogoData?.tipo ?? 'escala',
      peso: created.peso,
      valor_minimo: created.valor_minimo,
      valor_maximo: created.valor_maximo,
      orden: created.orden ?? 0,
      activo: created.activo ?? true,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message)
          : ''
    const details =
      typeof error === 'object' && error && 'details' in error
        ? String((error as { details?: unknown }).details)
        : ''
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code)
        : ''
    const lowerMessage = `${message} ${details}`.toLowerCase()
    const missingColumn =
      code === 'PGRST204' ||
      lowerMessage.includes('criterio_evaluacion_id') ||
      lowerMessage.includes('column') ||
      lowerMessage.includes('does not exist')

    if (!missingColumn) throw error

    const legacyPayload = {
      proceso_id: data.proceso_id,
      nombre: catalogoData?.nombre ?? 'Criterio',
      descripcion: catalogoData?.descripcion ?? null,
      tipo: catalogoData?.tipo ?? 'escala',
      peso: data.peso,
      valor_minimo: data.valor_minimo,
      valor_maximo: data.valor_maximo,
      orden: data.orden ?? 0,
      activo: data.activo ?? true,
    }

    const { data: createdLegacy, error: legacyError } = await supabase
      .from('criterios')
      .insert([legacyPayload])
      .select('id, proceso_id, nombre, descripcion, tipo, peso, valor_minimo, valor_maximo, orden, activo')
      .single()

    if (legacyError) throw legacyError

    return {
      id: createdLegacy.id,
      proceso_id: createdLegacy.proceso_id,
      criterio_evaluacion_id: data.criterio_evaluacion_id,
      nombre: createdLegacy.nombre ?? 'Criterio',
      descripcion: createdLegacy.descripcion ?? null,
      tipo: createdLegacy.tipo ?? 'escala',
      peso: createdLegacy.peso,
      valor_minimo: createdLegacy.valor_minimo,
      valor_maximo: createdLegacy.valor_maximo,
      orden: createdLegacy.orden ?? 0,
      activo: createdLegacy.activo ?? true,
    }
  }
}

export async function getCriterio(id: string): Promise<CriterioEvaluacion | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('criterios_evaluacion')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as CriterioEvaluacion
}

export async function createCriterio(
  data: Omit<CriterioEvaluacion, 'id' | 'created_at' | 'updated_at'>
): Promise<CriterioEvaluacion> {
  const supabase = await createServerClient()

  const { data: created, error } = await supabase
    .from('criterios_evaluacion')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return created as CriterioEvaluacion
}

export async function updateCriterio(
  id: string,
  data: Partial<Omit<CriterioEvaluacion, 'id' | 'created_at' | 'updated_at'>>
): Promise<CriterioEvaluacion> {
  const supabase = await createServerClient()

  const { data: updated, error } = await supabase
    .from('criterios_evaluacion')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as CriterioEvaluacion
}

export async function deleteCriterio(id: string): Promise<{ success: boolean }> {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('criterios_evaluacion')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { success: true }
}

// ============================================================
// ACCESO PROPONENTES
// ============================================================

/**
 * Valida un código de acceso de proponente
 * Retorna la propuesta y el estado de documentación
 */
export async function validarCodigoProponente(codigo: string) {
  const supabase = await createServerClient()

  // Obtener acceso
  const { data: acceso, error: accesoError } = await supabase
    .from('acceso_proponentes')
    .select(`
      *,
      propuestas:propuesta_id(
        id, razon_social, nit_cedula, email, proceso_id
      )
    `)
    .eq('codigo', codigo)
    .eq('activo', true)
    .single()

  if (accesoError || !acceso) {
    return { data: null, error: new Error(accesoError?.message ?? 'Código inválido o inactivo') }
  }

  // Validar fecha límite
  if (acceso.fecha_limite && new Date() > new Date(acceso.fecha_limite)) {
    return { data: null, error: new Error('Código expirado') }
  }

  // Obtener documentos y tipos faltantes
  const { faltantes, cubiertos } = await getDocumentosFaltantes(acceso.propuesta_id)
  const { data: documentos } = await getDocumentos(acceso.propuesta_id)

  // Calcular estadísticas
  const totalObligatorios = faltantes.length + cubiertos.filter(t => t.es_obligatorio).length
  const completados = cubiertos.filter(t => t.es_obligatorio).length
  const porcentaje = totalObligatorios > 0 
    ? Math.round((completados / totalObligatorios) * 100)
    : 100

  // Verificar documentos vencidos
  const hoy = new Date()
  const vencidos = (documentos ?? []).filter(d => {
    if (!d.fecha_vencimiento) return false
    return new Date(d.fecha_vencimiento) < hoy
  }).length

  return {
    data: {
      propuesta_id: acceso.propuesta_id,
      razon_social: acceso.propuestas.razon_social,
      nit_cedula: acceso.propuestas.nit_cedula,
      email: acceso.propuestas.email,
      estadisticas: {
        total_obligatorios: totalObligatorios,
        completados,
        faltantes: faltantes.length,
        porcentaje,
        vencidos,
      },
      tipos_faltantes: faltantes,
      tipos_cubiertos: cubiertos,
      documentos: documentos ?? [],
    },
    error: null,
  }
}

/**
 * Genera un nuevo código de acceso para una propuesta
 */
export async function generarCodigoAccesoProponente(
  propuesta_id: string,
  usuario_id: string,
  fecha_limite?: Date
) {
  const supabase = await createServerClient()

  const fechaLimite = fecha_limite || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // Verificar si ya existe un acceso para esta propuesta
  const { data: existing } = await supabase
    .from('acceso_proponentes')
    .select('id')
    .eq('propuesta_id', propuesta_id)
    .maybeSingle()

  if (existing) {
    // Ya existe → regenerar código y reactivar
    const codigo = generarCodigoUnico()
    const { data, error } = await supabase
      .from('acceso_proponentes')
      .update({
        codigo,
        activo: true,
        fecha_limite: fechaLimite.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('propuesta_id', propuesta_id)
      .select()
      .single()
    return { data, error }
  }

  // No existe → insertar
  const codigo = generarCodigoUnico()
  const { data, error } = await supabase
    .from('acceso_proponentes')
    .insert({
      propuesta_id,
      codigo,
      activo: true,
      fecha_limite: fechaLimite.toISOString(),
      created_by: usuario_id,
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Actualiza configuración de acceso de proponente
 */
export async function actualizarAccesoProponente(
  propuesta_id: string,
  activo: boolean,
  fecha_limite: Date | null
) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('acceso_proponentes')
    .update({
      activo,
      fecha_limite: fecha_limite?.toISOString() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('propuesta_id', propuesta_id)
    .select()
    .single()

  return { data, error }
}

/**
 * Revoca el acceso de un proponente
 */
export async function revocarAccesoProponente(propuesta_id: string) {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('acceso_proponentes')
    .delete()
    .eq('propuesta_id', propuesta_id)

  return { error }
}

/**
 * Obtiene el estado actual de acceso de una propuesta
 */
export async function obtenerAccesoProponente(propuesta_id: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('acceso_proponentes')
    .select('*')
    .eq('propuesta_id', propuesta_id)
    .single()

  return { data, error }
}

/**
 * Genera código único (3 letras + 5 números)
 */
function generarCodigoUnico(): string {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const codigoLetras = Array(3)
    .fill(0)
    .map(() => letras[Math.floor(Math.random() * letras.length)])
    .join('')
  const codigoNumeros = Math.floor(10000 + Math.random() * 90000).toString()
  return codigoLetras + codigoNumeros
}

// ---------------------------------------------------------------------------
// CONTRATOS
// ---------------------------------------------------------------------------

import type { Contrato, ContratoConEstado, ContratoAnexo } from '../types/index'

export type CreateContratoInput = Omit<
  Contrato,
  'id' | 'estado' | 'fecha_max_notificacion' | 'created_at' | 'updated_at'
>

export type UpdateContratoInput = Partial<Omit<Contrato, 'id' | 'conjunto_id' | 'created_at' | 'updated_at'>>

/**
 * Obtiene todos los contratos de un conjunto con estado calculado
 */
export async function getContratosConEstado(conjunto_id: string) {
  const supabase = await createServerClient()
  return supabase.rpc('get_contratos_con_estado', {
    p_conjunto_id: conjunto_id,
  }) as Promise<{ data: ContratoConEstado[] | null; error: { message: string } | null }>
}

/**
 * Obtiene todos los contratos de un conjunto (simple)
 */
export async function getContratos(conjunto_id: string) {
  const supabase = await createServerClient()
  return supabase
    .from('contratos')
    .select('*')
    .eq('conjunto_id', conjunto_id)
    .eq('activo', true)
    .order('fecha_fin', { ascending: true })
}

/**
 * Obtiene un contrato por ID
 */
export async function getContrato(id: string) {
  const supabase = await createServerClient()
  return supabase.from('contratos').select('*').eq('id', id).single()
}

/**
 * Crea un nuevo contrato
 */
export async function createContrato(data: CreateContratoInput) {
  const supabase = await createServerClient()
  return supabase.from('contratos').insert([data]).select().single()
}

/**
 * Actualiza un contrato existente
 */
export async function updateContrato(id: string, data: UpdateContratoInput) {
  const supabase = await createServerClient()
  return supabase.from('contratos').update(data).eq('id', id).select().single()
}

/**
 * Elimina (soft delete) un contrato
 */
export async function deleteContrato(id: string) {
  const supabase = await createServerClient()
  return supabase.from('contratos').update({ activo: false }).eq('id', id).select().single()
}

/**
 * Elimina permanentemente un contrato (hard delete)
 */
export async function hardDeleteContrato(id: string) {
  const supabase = await createServerClient()
  return supabase.from('contratos').delete().eq('id', id)
}

// ---------------------------------------------------------------------------
// CONTRATO ANEXOS (Otrosíes)
// ---------------------------------------------------------------------------

export type CreateContratoAnexoInput = Omit<ContratoAnexo, 'id' | 'created_at' | 'updated_at'>

/**
 * Obtiene todos los anexos de un contrato
 */
export async function getContratoAnexos(contrato_id: string) {
  const supabase = await createServerClient()
  return supabase
    .from('contrato_anexos')
    .select('*')
    .eq('contrato_id', contrato_id)
    .order('fecha_documento', { ascending: false })
}

/**
 * Crea un nuevo anexo de contrato
 */
export async function createContratoAnexo(data: CreateContratoAnexoInput) {
  const supabase = await createServerClient()
  return supabase.from('contrato_anexos').insert([data]).select().single()
}

/**
 * Actualiza un anexo de contrato
 */
export async function updateContratoAnexo(id: string, data: Partial<ContratoAnexo>) {
  const supabase = await createServerClient()
  return supabase.from('contrato_anexos').update(data).eq('id', id).select().single()
}

/**
 * Elimina un anexo de contrato
 */
export async function deleteContratoAnexo(id: string) {
  const supabase = await createServerClient()
  return supabase.from('contrato_anexos').delete().eq('id', id)
}

/**
 * Obtiene contratos próximos a vencer (para alertas)
 */
export async function getContratosProximosAVencer(conjunto_id: string, dias: number = 30) {
  const supabase = await createServerClient()
  const fechaLimite = new Date()
  fechaLimite.setDate(fechaLimite.getDate() + dias)
  
  return supabase
    .from('contratos')
    .select('*')
    .eq('conjunto_id', conjunto_id)
    .eq('activo', true)
    .lte('fecha_fin', fechaLimite.toISOString().split('T')[0])
    .gte('fecha_fin', new Date().toISOString().split('T')[0])
    .order('fecha_fin', { ascending: true })
}

/**
 * Obtiene estadísticas de contratos de un conjunto
 */
export async function getContratosStats(conjunto_id: string) {
  const supabase = await createServerClient()
  
  const { data: contratos, error } = await supabase
    .from('contratos')
    .select('id, fecha_fin, estado')
    .eq('conjunto_id', conjunto_id)
    .eq('activo', true)

  if (error || !contratos) {
    return { data: null, error }
  }

  const hoy = new Date()
  const en30Dias = new Date()
  en30Dias.setDate(en30Dias.getDate() + 30)

  const stats = {
    total: contratos.length,
    vigentes: 0,
    proximos_a_vencer: 0,
    vencidos: 0,
  }

  for (const contrato of contratos) {
    const fechaFin = new Date(contrato.fecha_fin)
    if (fechaFin < hoy) {
      stats.vencidos++
    } else if (fechaFin <= en30Dias) {
      stats.proximos_a_vencer++
    } else {
      stats.vigentes++
    }
  }

  return { data: stats, error: null }
}
