export type TipoPersona = 'juridica' | 'natural'

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export type EstadoContrato = 'vigente' | 'proximo_a_vencer' | 'vencido'

export interface Contrato {
  id: string
  conjunto_id: string
  nombre: string
  responsable?: string
  descripcion?: string
  fecha_inicio: string
  fecha_fin: string
  dias_preaviso: number
  fecha_max_notificacion?: string
  valor?: number
  moneda: string
  archivo_principal_url?: string
  archivo_principal_pathname?: string
  observaciones?: string
  estado: EstadoContrato
  activo: boolean
  created_at: string
  updated_at: string
}

export interface ContratoConEstado extends Contrato {
  estado_calculado: EstadoContrato
  dias_para_vencer: number
  dias_para_notificar: number
  notificacion_vencida: boolean
}

export interface ContratoAnexo {
  id: string
  contrato_id: string
  nombre: string
  descripcion?: string
  archivo_url?: string
  archivo_pathname?: string
  fecha_documento?: string
  created_at: string
  updated_at: string
}

export const LABEL_ESTADO_CONTRATO: Record<EstadoContrato, string> = {
  vigente: 'Vigente',
  proximo_a_vencer: 'Próximo a vencer',
  vencido: 'Vencido',
}
export type CargoCohnsejero =
  | 'presidente'
  | 'vicepresidente'
  | 'secretario'
  | 'tesorero'
  | 'vocal_principal'
  | 'consejero'
  | 'consejero_suplente'
export type EstadoConjunto = 'activo' | 'inactivo' | 'archivado'
export type EstadoProceso = 'configuracion' | 'evaluacion' | 'votacion' | 'finalizado' | 'cancelado'
export type EstadoPropuesta =
  // Ingreso y revisión documental
  | 'registro'
  | 'en_revision'
  | 'incompleto'
  | 'en_subsanacion'
  // Validación legal
  | 'en_validacion'
  | 'no_apto_legal'
  // Evaluación
  | 'habilitada'
  | 'en_evaluacion'
  // Resultados de evaluación
  | 'condicionado'
  | 'apto'
  | 'destacado'
  | 'no_apto'
  // Terminales
  | 'adjudicado'
  | 'descalificada'
  | 'retirada'

export type ClasificacionPropuesta = 'destacado' | 'apto' | 'condicionado' | 'no_apto'

/** Estados que indican que el candidato ya no puede avanzar en el flujo */
export const ESTADOS_TERMINALES: EstadoPropuesta[] = [
  'no_apto_legal',
  'no_apto',
  'adjudicado',
  'descalificada',
  'retirada',
]

/** Estados que indican que el candidato está activo en el proceso */
export const ESTADOS_ACTIVOS: EstadoPropuesta[] = [
  'registro',
  'en_revision',
  'incompleto',
  'en_subsanacion',
  'en_validacion',
  'habilitada',
  'en_evaluacion',
  'condicionado',
  'apto',
  'destacado',
]

/** Etiquetas legibles para mostrar en la UI */
export const LABEL_ESTADO: Record<EstadoPropuesta, string> = {
  registro:        'Registrado',
  en_revision:     'En Revisión',
  incompleto:      'Incompleto',
  en_subsanacion:  'En Subsanación',
  en_validacion:   'En Validación Legal',
  no_apto_legal:   'No Apto Legal',
  habilitada:      'Habilitado',
  en_evaluacion:   'En Evaluación',
  condicionado:    'Condicionado',
  apto:            'Apto',
  destacado:       'Destacado',
  no_apto:         'No Apto',
  adjudicado:      'Adjudicado',
  descalificada:   'Descalificado',
  retirada:        'Retirado',
}
export type EstadoDocumento = 'pendiente' | 'completo' | 'incompleto' | 'vencido'
export type TipoDocumento = 'camara_comercio' | 'rut' | 'certificacion' | 'poliza' | 'estados_financieros' | 'referencia' | 'otro'
export type CategoriaDocumento = 'legal' | 'financiero' | 'tecnico' | 'referencia'
export type TipoPersonaDocumento = 'juridica' | 'natural' | 'ambos'
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
  es_publica?: boolean
  slug?: string
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
  puede_votar: boolean
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
  checklist_legal?: ChecklistLegal | null
  puntaje_legal: number
  puntaje_tecnico: number
  puntaje_financiero: number
  puntaje_referencias: number
  puntaje_propuesta: number
  puntaje_evaluacion: number
  votos_recibidos: number
  puntaje_final: number
  created_by?: string
  created_by_nombre?: string
  created_at: string
  updated_at: string
}

export interface Documento {
  id: string
  propuesta_id: string
  tipo_documento_id?: string
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

export interface TipoDocumentoConfig {
  id: string
  codigo: string
  nombre: string
  categoria: CategoriaDocumento
  es_obligatorio: boolean
  tipo_persona: TipoPersonaDocumento
  dias_vigencia: number
  activo: boolean
  created_at: string
  updated_at: string
}

export const LABEL_CATEGORIA_DOCUMENTO: Record<CategoriaDocumento, string> = {
  legal:      'Legal',
  financiero: 'Financiero',
  tecnico:    'Técnico',
  referencia: 'Referencias',
}

export const LABEL_TIPO_PERSONA_DOCUMENTO: Record<TipoPersonaDocumento, string> = {
  ambos:    'General',
  natural:  'Persona Natural',
  juridica: 'Persona Jurídica',
}

export interface Criterio {
  id: string
  proceso_id: string
  criterio_evaluacion_id: string
  codigo: string
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
  clasificacion?: string | null
}

/** Detalle de un criterio de la matriz de evaluación para una propuesta */
export interface DetallesCriterio {
  criterio_codigo: string
  nombre: string
  descripcion: string
  /** true = Sí cumple, false = No cumple */
  respuesta: boolean
  /** Peso del criterio en puntos (= porcentaje sobre 100) */
  peso: number
  /** Puntaje obtenido: igual a peso si cumple, 0 si no cumple */
  puntaje: number
}

/** Fila completa de la matriz por candidato */
export interface FilaMatrizEvaluacion {
  propuesta_id: string
  razon_social: string
  puntaje_total: number
  clasificacion: ClasificacionPropuesta | null
  fecha_evaluacion: string | null
  criterios: DetallesCriterio[]
}

/** Definición canónica de los 9 criterios de la matriz de aprobación */
export const CRITERIOS_MATRIZ = [
  { codigo: 'expPH',                   nombre: 'Experiencia en Propiedad Horizontal',       descripcion: 'Mínimo 5 años certificados en administración de propiedad horizontal.',                                     peso: 20 },
  { codigo: 'expDensidad',             nombre: 'Experiencia en Conjuntos de Alta Densidad', descripcion: 'Experiencia en conjuntos >500 unidades, con retos de seguridad, convivencia y parqueaderos.',             peso: 15 },
  { codigo: 'capacidadOperativa',      nombre: 'Capacidad Operativa / Equipo de Apoyo',     descripcion: 'Recursos humanos y técnicos disponibles para la gestión.',                                                 peso: 15 },
  { codigo: 'propuestaTecnica',        nombre: 'Propuesta Técnica / Plan de Gestión',       descripcion: 'Claridad, organización y viabilidad del plan administrativo.',                                            peso: 15 },
  { codigo: 'formacionAcademica',      nombre: 'Formación Académica',                       descripcion: 'Profesional en áreas administrativas, contables, económicas, ingeniería, derecho o afines.',             peso: 10 },
  { codigo: 'conocimientosNormativos', nombre: 'Conocimientos Normativos y Técnicos',       descripcion: 'Ley 675, Ley 1801, SST, manejo presupuestal y financiero.',                                              peso: 10 },
  { codigo: 'referencias',             nombre: 'Referencias Verificables',                  descripcion: 'Calidad y confiabilidad de referencias.',                                                                  peso:  5 },
  { codigo: 'economica',               nombre: 'Propuesta Económica',                       descripcion: 'Honorarios y condiciones económicas.',                                                                      peso:  5 },
  { codigo: 'competenciasPersonales',  nombre: 'Competencias Personales',                   descripcion: 'Liderazgo, ética, comunicación, manejo de conflictos.',                                                    peso:  5 },
] as const

/** Etiquetas de la matriz de aprobación para mostrar en resultados */
export const LABEL_CLASIFICACION: Record<ClasificacionPropuesta, string> = {
  destacado:    'Cumple',
  apto:         'Cumple, con observaciones',
  condicionado: 'Cumple, con observaciones',
  no_apto:      'Rechazado',
}

/** Registro inmutable de un cambio de estado de una propuesta */
export interface HistorialEstado {
  id: string
  propuesta_id: string
  estado_anterior: EstadoPropuesta | null   // null = primer estado registrado
  estado_nuevo: EstadoPropuesta
  usuario_id: string | null                 // null = transición automática del sistema
  observacion: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

/** Definición de una transición válida entre estados */
export interface TransicionEstado {
  estado_destino: EstadoPropuesta
  requiere_observacion: boolean
  descripcion: string
}

// ---------------------------------------------------------------------------
// Datos extendidos del RUT vinculados a una propuesta
// Corresponde a la tabla propuesta_rut_datos (005_rut_metadata.sql)
// ---------------------------------------------------------------------------

export interface RepresentanteLegalResumen {
  tipoRepresentacion: string
  tipoDocumento: string
  numeroIdentificacion: string
  primerNombre: string
  primerApellido: string
  segundoApellido: string | null
  otrosNombres: string | null
  fechaInicioVinculacion: string | null
  isPep: boolean
  hasVinculoPep: boolean
}

export interface SocioResumen {
  tipoDocumento: string
  numeroIdentificacion: string
  primerNombre: string | null
  primerApellido: string | null
  razonSocial: string | null
  porcentajeParticipacion: string | null
  isPep: boolean
  hasVinculoPep: boolean
}

export interface ResponsabilidadResumen {
  codigo: string
  nombre: string
}

export interface PropuestaRutDatos {
  id: string
  propuesta_id: string
  nit_extraido: string | null
  dv_extraido: string | null
  razon_social_extraida: string | null
  tipo_contribuyente: string | null
  representantes_legales: RepresentanteLegalResumen[]
  socios: SocioResumen[]
  revisor_fiscal_principal: Record<string, unknown> | null
  revisor_fiscal_suplente: Record<string, unknown> | null
  contador: Record<string, unknown> | null
  responsabilidades: ResponsabilidadResumen[]
  hay_alerta_pep: boolean
  nit_coincide: boolean | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Checklist de validación legal — guardado como JSONB en propuestas.checklist_legal
// ---------------------------------------------------------------------------

export type EstadoItemChecklist = 'pendiente' | 'cumple' | 'no_cumple'
export type CriticidadItem = 'critico' | 'importante' | 'condicionante' | 'informativo'
export type AplicaAItemChecklist = 'ambos' | 'juridica' | 'natural'

export interface ItemChecklistLegal {
  id: string
  estado: EstadoItemChecklist
  observacion: string
}

/** Record completo por propuesta: clave = id del ítem */
export type ChecklistLegal = Record<string, ItemChecklistLegal>

/** Definición estática de un ítem del checklist */
export interface DefinicionItemChecklist {
  id: string
  seccion: string
  label: string
  descripcion: string
  criticidad: CriticidadItem
  aplica_a: AplicaAItemChecklist
  obligatorio?: boolean
}

export interface ValidacionLegalItemConfig {
  id: string
  codigo: string
  seccion: string
  nombre: string
  categoria: CriticidadItem
  descripcion: string
  aplica_a: AplicaAItemChecklist
  activo: boolean
  obligatorio: boolean
  orden: number
  created_at: string
  updated_at: string
}

export const ITEMS_VALIDACION_LEGAL: DefinicionItemChecklist[] = [
  // ── Antecedentes ────────────────────────────────────────────────────────────
  { id: 'procuraduria',    seccion: 'Antecedentes',           label: 'Procuraduría',                         descripcion: 'Sin antecedentes disciplinarios activos.',            criticidad: 'critico',       aplica_a: 'ambos'     },
  { id: 'contraloria',     seccion: 'Antecedentes',           label: 'Contraloría',                          descripcion: 'Sin antecedentes fiscales activos.',                  criticidad: 'critico',       aplica_a: 'ambos'     },
  { id: 'policia',         seccion: 'Antecedentes',           label: 'Policía Nacional',                     descripcion: 'Sin antecedentes judiciales.',                        criticidad: 'critico',       aplica_a: 'ambos'     },
  { id: 'personeria',      seccion: 'Antecedentes',           label: 'Personería',                           descripcion: 'Sin antecedentes ante la Personería.',                criticidad: 'importante',    aplica_a: 'ambos',    obligatorio: false },
  { id: 'medidas',         seccion: 'Antecedentes',           label: 'Medidas correctivas',                  descripcion: 'Sin medidas correctivas vigentes.',                   criticidad: 'critico',       aplica_a: 'ambos'     },
  { id: 'redam',           seccion: 'Antecedentes',           label: 'REDAM',                                descripcion: 'No inscrito en el Registro de Deudores Alimentarios Morosos.', criticidad: 'critico', aplica_a: 'ambos'   },
  { id: 'delitos_sexuales',seccion: 'Antecedentes',           label: 'Inhabilidades por delitos sexuales',   descripcion: 'Sin inhabilidades por delitos sexuales o contra menores.', criticidad: 'importante', aplica_a: 'ambos', obligatorio: false },
  { id: 'procesos_legales',seccion: 'Antecedentes',           label: 'Sin procesos legales activos',         descripcion: 'No se encuentra incurso en procesos legales (penales, civiles o administrativos) vigentes que comprometan su idoneidad. Soportar con declaración bajo juramento o certificación de secretaría de juzgados.', criticidad: 'importante', aplica_a: 'ambos', obligatorio: false },
  // ── SARLAFT y documentación básica ──────────────────────────────────────────
  { id: 'sarlaft',         seccion: 'SARLAFT y documentación',label: 'SARLAFT / Listas restrictivas',        descripcion: 'No aparece en listas Clinton, OFACs ni UIAF.',       criticidad: 'critico',       aplica_a: 'ambos'     },
  { id: 'rut',             seccion: 'SARLAFT y documentación',label: 'RUT actualizado',                      descripcion: 'RUT vigente y coincidente con datos registrados.',    criticidad: 'critico',       aplica_a: 'ambos'     },
  { id: 'camara_comercio', seccion: 'SARLAFT y documentación',label: 'Cámara de Comercio vigente',           descripcion: 'Certificado de existencia y representación legal vigente.', criticidad: 'critico', aplica_a: 'juridica'  },
  { id: 'cedula',          seccion: 'SARLAFT y documentación',label: 'Copia de cédula',                      descripcion: 'Cédula de ciudadanía vigente.',                       criticidad: 'critico',       aplica_a: 'natural'   },
  // ── Requisitos operativos ────────────────────────────────────────────────────
  { id: 'parafiscales',    seccion: 'Requisitos operativos',  label: 'Pago de parafiscales',                 descripcion: 'Certificación de pago de aportes parafiscales al día.', criticidad: 'importante',  aplica_a: 'juridica'  },
  { id: 'sst',             seccion: 'Requisitos operativos',  label: 'Certificación SST vigente',            descripcion: 'Sistema de Seguridad y Salud en el Trabajo activo.', criticidad: 'importante',    aplica_a: 'juridica'  },
  { id: 'estados_fin',     seccion: 'Requisitos operativos',  label: 'Estados financieros (2 años)',         descripcion: 'Estados financieros de los últimos dos años presentados.', criticidad: 'importante', aplica_a: 'juridica' },
  { id: 'experiencia',     seccion: 'Requisitos operativos',  label: 'Certificados de experiencia',          descripcion: 'Certificados con NIT, funciones, fechas y cargo desempeñado.', criticidad: 'importante', aplica_a: 'ambos' },
  // ── Pólizas ─────────────────────────────────────────────────────────────────
  { id: 'poliza_rc',       seccion: 'Pólizas',                label: 'Póliza Resp. Civil Profesional',       descripcion: 'Póliza vigente. Exigible previo a firma del contrato.',criticidad: 'condicionante', aplica_a: 'ambos'     },
  { id: 'poliza_do',       seccion: 'Pólizas',                label: 'Póliza D&O para el Consejo',           descripcion: 'A gestionar dentro del primer mes de gestión.',       criticidad: 'informativo',   aplica_a: 'ambos'     },
]

/** Resultado de la función RPC cambiar_estado_propuesta */
export interface CambioEstadoResult {
  success: boolean
  propuesta_id: string
  estado_anterior: EstadoPropuesta
  estado_nuevo: EstadoPropuesta
  razon_social: string
}

// ---------------------------------------------------------------------------
// Roles y Permisos configurables
// ---------------------------------------------------------------------------

export type CategoriaPermiso = 'procesos' | 'consejeros' | 'documentos' | 'evaluacion' | 'votacion' | 'reportes' | 'finanzas' | 'auditoria' | 'configuracion' | 'general'

export interface Permiso {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  categoria: CategoriaPermiso
  created_at: string
}

export interface Rol {
  id: string
  conjunto_id: string | null
  nombre: string
  descripcion?: string
  es_sistema: boolean
  activo: boolean
  created_at: string
  updated_at: string
}

export interface RolPermiso {
  id: string
  rol_id: string
  permiso_id: string
  created_at: string
}

export interface RolConPermisos extends Rol {
  permisos: Pick<Permiso, 'id' | 'codigo' | 'nombre' | 'categoria'>[]
}

export const LABEL_CATEGORIA_PERMISO: Record<CategoriaPermiso, string> = {
  procesos:      'Procesos',
  consejeros:    'Consejeros',
  documentos:    'Documentos',
  evaluacion:    'Evaluación',
  votacion:      'Votación',
  reportes:      'Reportes',
  finanzas:      'Finanzas',
  auditoria:     'Auditoría',
  configuracion: 'Configuración',
  general:       'General',
}

// ---------------------------------------------------------------------------
// Usuarios del sistema
// ---------------------------------------------------------------------------

export type RolUsuario = 'superadmin' | 'admin' | 'evaluador' | 'consejero'

export interface Usuario {
  id: string
  email: string
  nombre?: string
  rol: RolUsuario
  conjunto_id: string | null
  activo: boolean
  ultimo_acceso?: string
  created_at: string
  updated_at: string
}

export interface UsuarioConConjunto extends Usuario {
  conjunto?: {
    id: string
    nombre: string
  } | null
  permisos?: Permiso[]
}

export const LABEL_ROL_USUARIO: Record<RolUsuario, string> = {
  superadmin: 'Super Administrador',
  admin:      'Administrador',
  evaluador:  'Evaluador',
  consejero:  'Consejero',
}

// ---------------------------------------------------------------------------
// Criterios de evaluación (dinámicos desde BD)
// ---------------------------------------------------------------------------

export interface CriterioEvaluacion {
  id: string
  nombre: string
  descripcion: string | null
  tipo: TipoCriterio
  activo: boolean
  orden: number
  created_at: string
  updated_at: string
}
