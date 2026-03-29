import { createClient as createServerClient } from './server'
import { createClient as createBrowserClient } from './client'
import type {
  Conjunto,
  Proceso,
  Consejero,
  Propuesta,
<<<<<<< HEAD
  Criterio,
=======
  EstadoPropuesta,
  Documento,
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
  Evaluacion,
  Voto,
  ProcesoStats,
  ResultadoFinal,
<<<<<<< HEAD
=======
  HistorialEstado,
  TransicionEstado,
  CambioEstadoResult,
  PropuestaRutDatos,
  FilaMatrizEvaluacion,
  DetallesCriterio,
  ClasificacionPropuesta,
  TipoDocumentoConfig,
  TipoPersona,
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
} from '../types/index'
import { CRITERIOS_MATRIZ } from '../types/index'

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

  const { count: propuestas_activas } = await supabase
    .from('propuestas')
    .select('*', { count: 'exact', head: true })
    .eq('proceso_id', proceso_id)
    .eq('estado', 'activa')

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
export async function createConsejero(data: Omit<Consejero, 'id' | 'codigo_acceso' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerClient()
  return supabase.from('consejeros').insert([data]).select().single()
}

export async function getConsejeros(conjunto_id: string) {
  const supabase = await createServerClient()
  return supabase.from('consejeros').select('*').eq('conjunto_id', conjunto_id).eq('activo', true)
}

export async function getConsejero(id: string) {
  const supabase = await createServerClient()
  return supabase.from('consejeros').select('*').eq('id', id).single()
}

export async function getConsejeroByCodigo(codigo: string) {
  const supabase = await createBrowserClient()
  return supabase.from('consejeros').select('*').eq('codigo_acceso', codigo).single()
}

export async function updateConsejero(id: string, data: Partial<Consejero>) {
  const supabase = await createServerClient()
  return supabase.from('consejeros').update(data).eq('id', id).select().single()
}

// PROPUESTAS
export async function createPropuesta(data: Omit<Propuesta, 'id' | 'puntaje_evaluacion' | 'votos_recibidos' | 'puntaje_final' | 'created_at' | 'updated_at'>) {
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

<<<<<<< HEAD
=======
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

>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
export async function getPropuesta(id: string) {
  const supabase = await createServerClient()
  return supabase.from('propuestas').select('*').eq('id', id).single()
}

export async function updatePropuesta(id: string, data: Partial<Propuesta>) {
  const supabase = await createServerClient()
  return supabase.from('propuestas').update(data).eq('id', id).select().single()
}

export async function contarPropuestasActivas(proceso_id: string) {
  const supabase = await createServerClient()
  const { count } = await supabase
    .from('propuestas')
    .select('*', { count: 'exact', head: true })
    .eq('proceso_id', proceso_id)
    .eq('estado', 'activa')
  return count || 0
}

<<<<<<< HEAD
// CRITERIOS
export async function createCriterio(data: Omit<Criterio, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerClient()
  return supabase.from('criterios').insert([data]).select().single()
}

export async function getCriterios(proceso_id: string) {
  const supabase = await createServerClient()
  return supabase
    .from('criterios')
    .select('*')
    .eq('proceso_id', proceso_id)
    .eq('activo', true)
    .order('orden', { ascending: true })
}

export async function updateCriterio(id: string, data: Partial<Criterio>) {
  const supabase = await createServerClient()
  return supabase.from('criterios').update(data).eq('id', id).select().single()
}

export async function validarSumaPesos(proceso_id: string) {
  const supabase = await createServerClient()
  const { data: criterios } = await supabase
    .from('criterios')
    .select('peso')
    .eq('proceso_id', proceso_id)
    .eq('activo', true)

  const sumaTotal = criterios?.reduce((sum, c) => sum + (c.peso || 0), 0) || 0
  return Math.abs(sumaTotal - 100) < 0.01 // Permitir pequeños errores de redondeo
=======
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
  return supabase.from('documentos').insert([data]).select().single()
}

export async function getDocumentos(propuesta_id: string) {
  const supabase = await createServerClient()
  return supabase.from('documentos').select('*').eq('propuesta_id', propuesta_id)
}

export async function updateDocumento(id: string, data: Partial<Documento>) {
  const supabase = await createServerClient()
  return supabase.from('documentos').update(data).eq('id', id).select().single()
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
    documentos?.filter((d) => d.es_obligatorio && d.estado !== 'completo') ?? []

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
>>>>>>> 585e5503f8a591ab7815de1ba15ad10d0456f449
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
 * Si está incompleta, cambia el estado a 'incompleto'.
 * Si está completa, cambia el estado a 'habilitada'.
 */
export async function validarDocumentacionPropuesta(propuesta_id: string) {
  const supabase = await createServerClient()

  // 1. Obtener documentos requeridos y cargados
  const { data: documentos, error: docsError } = await supabase
    .from('documentos')
    .select('es_obligatorio, estado')
    .eq('propuesta_id', propuesta_id)

  if (docsError) throw docsError

  const obligatorioFaltante = documentos?.some(d => d.es_obligatorio && d.estado !== 'completo')

  const nuevoEstado = obligatorioFaltante ? 'incompleto' : 'habilitada'

  const { error: updError } = await supabase
    .from('propuestas')
    .update({ estado: nuevoEstado })
    .eq('id', propuesta_id)

  if (updError) throw updError

  return { success: true, estado: nuevoEstado }
}

/**
 * Procesa la validación legal de un candidato.
 * Si no cumple, el estado cambia a 'no_apto_legal' (rechazo automático).
 */
export async function procesarValidacionLegal(propuesta_id: string, cumple: boolean, observaciones: string) {
  const supabase = await createServerClient()

  const nuevoEstado = cumple ? 'en_evaluacion' : 'no_apto_legal'

  const { error: updError } = await supabase
    .from('propuestas')
    .update({
      estado: nuevoEstado,
      cumple_requisitos_legales: cumple,
      observaciones_legales: observaciones
    })
    .eq('id', propuesta_id)

  if (updError) throw updError

  return { success: true, estado: nuevoEstado }
}

export async function validarDocumento(id: string, estado: string, observaciones: string, userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('documentos')
    .update({
      estado,
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
    accion: estado === 'APROBADO' ? 'APROBACION_DOCUMENTO' : 'RECHAZO_DOCUMENTO',
    entidad: 'documentos',
    entidad_id: id,
    datos_nuevos: { estado, observaciones },
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

  // Obtener total de propuestas activas
  const { count: total_propuestas } = await supabase
    .from('propuestas')
    .select('*', { count: 'exact', head: true })
    .eq('proceso_id', proceso_id)
    .eq('estado', 'activa')

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

// RESULTADOS
export async function getResultadosFinales(proceso_id: string): Promise<ResultadoFinal[]> {
  const supabase = await createServerClient()

  const { data: propuestas } = await supabase
    .from('vista_propuestas_resumen')
    .select('*')
    .eq('proceso_id', proceso_id)
    .eq('estado', 'activa')
    .order('puntaje_final', { ascending: false })

  if (!propuestas) return []

  // Clasificar por semáforo
  return propuestas.map((p, index) => {
    let estado_semaforo: 'verde' | 'amarillo' | 'rojo'

    if (p.puntaje_final >= 4) {
      estado_semaforo = 'verde'
    } else if (p.puntaje_final >= 3) {
      estado_semaforo = 'amarillo'
    } else {
      estado_semaforo = 'rojo'
    }

    return {
      propuesta_id: p.id,
      razon_social: p.razon_social,
      puntaje_evaluacion: p.puntaje_evaluacion,
      votos_recibidos: p.votos_recibidos,
      puntaje_final: p.puntaje_final,
      posicion: index + 1,
      estado_semaforo,
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
    .select('tipo_documento_id')
    .eq('propuesta_id', propuesta_id)
    .not('tipo_documento_id', 'is', null)

  const tiposCubiertos = new Set((documentos ?? []).map((d) => d.tipo_documento_id as string))

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
      conjunto:conjuntos(id, nombre)
    `)
    .order('created_at', { ascending: false })

  if (conjunto_id) {
    query = query.eq('conjunto_id', conjunto_id)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as UsuarioConConjunto[]
}

export async function getUsuario(id: string): Promise<UsuarioConConjunto | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      *,
      conjunto:conjuntos(id, nombre)
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as UsuarioConConjunto
}

export async function updateUsuario(
  id: string,
  data: {
    nombre?: string
    rol?: RolUsuario
    activo?: boolean
    conjunto_id?: string | null
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
  return updated as Usuario
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
import type { CriterioEvaluacion } from '../types/index'

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

export async function getPesoTotalCriterios(): Promise<number> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('criterios_evaluacion')
    .select('peso')
    .eq('activo', true)

  if (error) throw error
  return (data ?? []).reduce((sum, c) => sum + (c.peso ?? 0), 0)
}
