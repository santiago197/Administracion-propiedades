export type TipoPersona = 'juridica' | 'natural'
export type CargoCohnsejero = 'presidente' | 'vicepresidente' | 'secretario' | 'vocal' | 'fiscal'
export type EstadoConjunto = 'activo' | 'inactivo' | 'archivado'
export type EstadoProceso = 'configuracion' | 'evaluacion' | 'votacion' | 'finalizado' | 'cancelado'
export type EstadoPropuesta = 'registro' | 'incompleto' | 'no_apto_legal' | 'habilitada' | 'en_evaluacion' | 'no_apto' | 'adjudicado' | 'descalificada' | 'retirada'
export type ClasificacionPropuesta = 'destacado' | 'apto' | 'condicionado' | 'no_apto'
export type EstadoDocumento = 'pendiente' | 'completo' | 'incompleto' | 'vencido'
export type TipoDocumento = 'camara_comercio' | 'rut' | 'certificacion' | 'poliza' | 'estados_financieros' | 'referencia' | 'otro'
export type TipoCriterio = 'numerico' | 'booleano' | 'escala'

export interface Conjunto {
  id: string
  nombre: string
  direccion: string
  ciudad: string
  anio: number
  logo_url?: string
  estado: EstadoConjunto
  created_at: string
  updated_at: string
}

export interface Proceso {
  id: string
  conjunto_id: string
  nombre: string
  descripcion?: string
  fecha_inicio: string
  fecha_fin?: string
  peso_evaluacion: number
  peso_votacion: number
  estado: EstadoProceso
  created_at: string
  updated_at: string
}

export interface Consejero {
  id: string
  conjunto_id: string
  nombre_completo: string
  cargo: CargoCohnsejero
  torre?: string
  apartamento: string
  email?: string
  telefono?: string
  codigo_acceso: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Propuesta {
  id: string
  proceso_id: string
  tipo_persona: TipoPersona
  razon_social: string
  nit_cedula: string
  representante_legal?: string
  anios_experiencia: number
  unidades_administradas: number
  telefono?: string
  email?: string
  direccion?: string
  valor_honorarios?: number
  observaciones?: string
  estado: EstadoPropuesta
  clasificacion?: ClasificacionPropuesta
  cumple_requisitos_legales: boolean
  observaciones_legales?: string
  puntaje_legal: number
  puntaje_tecnico: number
  puntaje_financiero: number
  puntaje_referencias: number
  puntaje_propuesta: number
  puntaje_evaluacion: number
  votos_recibidos: number
  puntaje_final: number
  created_at: string
  updated_at: string
}

export interface Documento {
  id: string
  propuesta_id: string
  tipo: TipoDocumento
  nombre: string
  archivo_url?: string
  archivo_pathname?: string
  es_obligatorio: boolean
  estado: EstadoDocumento
  fecha_vencimiento?: string
  observaciones?: string
  created_at: string
  updated_at: string
}

export interface Criterio {
  id: string
  proceso_id: string
  nombre: string
  descripcion?: string
  peso: number
  tipo: TipoCriterio
  valor_minimo: number
  valor_maximo: number
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Evaluacion {
  id: string
  proceso_id: string
  consejero_id: string
  propuesta_id: string
  criterio_id: string
  valor: number
  comentario?: string
  created_at: string
  updated_at: string
}

export interface Voto {
  id: string
  proceso_id: string
  consejero_id: string
  propuesta_id: string
  justificacion?: string
  created_at: string
}

export interface AuditLog {
  id: string
  conjunto_id?: string
  proceso_id?: string
  consejero_id?: string
  accion: string
  entidad: string
  entidad_id?: string
  datos_anteriores?: Record<string, any>
  datos_nuevos?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface ProcesoStats {
  total_consejeros: number
  consejeros_evaluados: number
  consejeros_votaron: number
  total_propuestas: number
  propuestas_activas: number
  evaluaciones_completadas: number
  votaciones_completadas: number
}

export interface ResultadoFinal {
  propuesta_id: string
  razon_social: string
  puntaje_evaluacion: number
  votos_recibidos: number
  puntaje_final: number
  posicion: number
  estado_semaforo: 'verde' | 'amarillo' | 'rojo'
}
