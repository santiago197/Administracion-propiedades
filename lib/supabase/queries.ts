import { createClient as createServerClient } from './server'
import { createClient as createBrowserClient } from './client'
import type {
  Conjunto,
  Proceso,
  Consejero,
  Propuesta,
  Criterio,
  Evaluacion,
  Voto,
  ProcesoStats,
  ResultadoFinal,
} from '../types/index'

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
export type CreatePropuestaInput = Omit<
  Propuesta,
  'id' | 'estado' | 'puntaje_evaluacion' | 'votos_recibidos' | 'puntaje_final' | 'created_at' | 'updated_at'
>

export async function createPropuesta(data: CreatePropuestaInput) {
  const supabase = await createServerClient()
  return supabase.from('propuestas').insert([data]).select().single()
}

export async function getPropuestas(proceso_id: string) {
  const supabase = await createServerClient()
  return supabase.from('propuestas').select('*').eq('proceso_id', proceso_id)
}

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
