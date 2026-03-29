// Interfaces para la respuesta del servicio OCR de extracción de RUT
import { CamaracomercioDTO } from "../../CamaraComercio/model/camaraComercio.model";

export interface OCRServiceResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data: OCRData;
  traceId: string;
}

export interface OCRData {
  fileName: string;
  data: RUTData;
  processingTimeMs: number;
  error: string | null;
  pagesProcessed: number;
}

export interface RUTData {
  header: HeaderData;
  identificacion: IdentificacionData;
  ubicacion: UbicacionData;
  clasificacion: ClasificacionData;
  responsabilidades: ResponsabilidadesData;
  representantesLegales: RepresentanteLegalData[];
  socios: SocioData[];
  revisorFiscalPrincipal: RevisorFiscalData | null;
  revisorFiscalSuplente: RevisorFiscalData | null;
  contador: ContadorData | null;
}

// Header - Información del formulario
export interface HeaderData {
  concepto: string;
  numeroFormulario: string;
  nit: string;
  dv: string;
  direccionSeccional: string;
  codDireccionSeccional?: string | null;
}

// Identificación - Información General
export interface IdentificacionData {
  tipoContribuyente: string;
  tipoDocumento: string | null;
  tipoDocCodigo?: string | null; // Código de tipo de documento (2 dígitos) - solo persona natural
  numeroIdentificacion: string | null;
  dv: string | null;
  fechaExpedicion: string | null;
  lugarExpedicionPais: string | null;
  lugarExpedicionDepartamento: string | null;
  lugarExpedicionCiudad: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  primerNombre: string | null;
  otrosNombres: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
  sigla: string | null;
}

// Ubicación - Información General (Contacto)
export interface UbicacionData {
  pais: string;
  codigoPais?: string | null;
  departamento: string;
  codigoDepartamento?: string | null;
  ciudad: string;
  codigoMunicipio?: string | null;
  direccion: string;
  email: string;
  codigoPostal: string | null;
  telefono1: string;
  telefono2: string | null;
}

// Clasificación - Información General (Actividad económica)
export interface ClasificacionData {
  actividadPrincipal: string;
  fechaInicioActividadPrincipal: string;
  actividadSecundaria: string | null;
  fechaInicioActividadSecundaria: string | null;
  otraActividad1: string | null;
  otraActividad2: string | null;
  ocupacion: string | null;
}

// Responsabilidades - Información Tributaria
export interface ResponsabilidadItem {
  codigo: string;
  nombre: string;
}

export interface ResponsabilidadesData {
  codigos: ResponsabilidadItem[];
}
// Representante Legal
export interface RepresentanteLegalData {
  tipoRepresentacion: string; // "Principal", "Suplente", "Apoderado"
  codRepresentante?: string; // Código de 2 dígitos
  tipoDocumento: string;
  tipoDocCodigo?: string; // Código de tipo documento (2 dígitos)
  numeroIdentificacion: string;
  dv?: string; // Dígito de verificación
  fechaExpedicion: string | null;
  lugarExpedicionPais: string | null;
  lugarExpedicionDepartamento: string | null;
  lugarExpedicionCiudad: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  primerNombre: string;
  otrosNombres: string | null;
  razonSocial: string | null;
  fechaInicioVinculacion: string | null; // Fecha inicio ejercicio representación (8 dígitos)
  fechaNacimiento?: string | null;
  lugarNacimiento?: string | null;
  lugarResidencia?: string | null;
  direccion?: string | null;
  paisResidencia?: string | null;
  nacionalidad?: string | null;
  isPep?: boolean;
  hasVinculoPep?: boolean;
}

// Socio
export interface SocioData {
  tipoDocCodigo?: string | null;
  tipoDocumento: string;
  numeroIdentificacion: string;
  dv?: string | null;
  fechaExpedicion: string | null;
  lugarExpedicionPais: string | null;
  lugarExpedicionDepartamento: string | null;
  lugarExpedicionCiudad: string | null;
  nacionalidad?: string | null;
  codPaisNacionalidad?: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  primerNombre: string | null;
  otrosNombres: string | null;
  razonSocial: string | null;
  porcentajeParticipacion: string | null;
  fechaInicioVinculacion: string | null;
  fechaDeIngreso?: string | null;
  cargo?: string;
  isPep?: boolean;
  hasVinculoPep?: boolean;
  documentoAdjunto?: any;
}

// Revisor Fiscal
export interface RevisorFiscalData {
  tipoDocumento: string; // Código corto: "CC", "CE", "PA"
  tipoDocCodigo?: string; // Código numérico: "13", "21", "41"
  numeroIdentificacion: string;
  dv?: string; // Dígito de verificación
  fechaExpedicion: string | null;
  lugarExpedicionPais: string | null;
  lugarExpedicionDepartamento: string | null;
  lugarExpedicionCiudad: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  primerNombre: string | null;
  otrosNombres: string | null;
  tarjetaProfesional: string | null;
  fechaNombramiento?: string | null; // Para revisor fiscal
  nit?: string | null; // NIT revisor fiscal (casilla 132/144)
  sociedadDesignada?: string | null; // Sociedad o firma (casilla 134/146)
}

// Contador
export interface ContadorData {
  tipoDocumento: string; // Código corto: "CC", "CE", "PA"
  tipoDocCodigo?: string; // Código numérico: "13", "21", "41"
  numeroIdentificacion: string;
  dv?: string; // Dígito de verificación
  fechaExpedicion: string | null;
  lugarExpedicionPais: string | null;
  lugarExpedicionDepartamento: string | null;
  lugarExpedicionCiudad: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  primerNombre: string | null;
  otrosNombres: string | null;
  tarjetaProfesional: string | null;
  fechaNombramiento?: string | null; // Fecha de nombramiento (campo 159)
  nit?: string | null; // NIT contador (casilla 156)
  sociedadDesignada?: string | null; // Sociedad o firma (casilla 158)
  isPep?: boolean; // ¿Es usted una persona Expuesta Políticamente?
  hasVinculoPep?: boolean; // ¿Por su cargo o actividad, administra recursos públicos?
}
export interface InformacionTributaria {
  granContribuyenteBta: boolean;
  responsableIVA: boolean;
  regimenSimple: boolean;
  regimenEspecial: boolean;
  noObligFacturar: boolean;
  exentoRetencionFuente: boolean;
  descuentoSENAFIC: boolean;
  declarante: boolean;
  profesionalIndependiente: boolean;
  agenteRetenedorIVA: boolean;
  granContribuyente: boolean;
  resolucionGC: number;
  fechaGC: Date | null;
  autorretenedor: boolean;
  resolucionAutoRete: number;
  fechaAutoRete: Date | null;
  autoRetenedorICA: boolean;
  detallesICA?: Array<{
    ciudad: { id: number; nombre: string } | null;
    actividadEconomica: { id: number; nombre: string; codigo?: string } | null;
  }>;
}

export interface PaisFormulario {
  id: number;
  nombre: string;
  sigla?: string;
}

export interface CiudadFormulario {
  id: number;
  nombre: string;
}

export interface ActividadEconomicaFormulario {
  id: number;
  nombre: string;
  codigo: string;
}

// Interface para el formulario de resultado de extracción
export interface FormularioExtraccionData {
  // Información General
  informacionGeneral: {
    tipoContribuyente: string;
    tipoDocumento: string;
    numeroIdentificacion: string;
    digitoVerificacion: string;
    primerNombre: string;
    primerApellido: string;
    segundoApellido: string;
    otrosNombres: string;
    razonSocial: string;
    nombreComercial: string;
    sigla: string;
    pais: PaisFormulario;
    departamento: string;
    ciudad: CiudadFormulario;
    direccion: string;
    correo: string;
    telefono: string;
    telefono2: string;
    actividadPrincipal: ActividadEconomicaFormulario;
    actividadSecundaria: string;
    paginaWeb: string;
    certificadoISO: boolean;
  };

  // Representantes Legales (datos OCR crudos — solo lectura)
  representantesLegales: RepresentanteLegalData[];
  // Estado editable del formulario sincronizado para el mapper
  representantesLegalesForm: CamaracomercioDTO[];

  // Socios
  socios: SocioData[];

  // Revisor Fiscal
  revisorFiscalPrincipal: RevisorFiscalData | null;
  revisorFiscalSuplente: RevisorFiscalData | null;

  // Contador
  contador: ContadorData | null;
  // Estado editable del formulario sincronizado para el mapper
  contadoresForm: CamaracomercioDTO[];

  // Información Tributaria
  informacionTributaria: InformacionTributaria;


  // Responsabilidades tributarias
  responsabilidadesTributarias: ResponsabilidadItem[];
}

// Estado inicial del formulario
export const INITIAL_FORMULARIO_EXTRACCION: FormularioExtraccionData = {
  informacionGeneral: {
    tipoContribuyente: '',
    tipoDocumento: '',
    numeroIdentificacion: '',
    digitoVerificacion: '',
    primerNombre: '',
    otrosNombres: '',
    primerApellido: '',
    segundoApellido: '',
    razonSocial: '',
    nombreComercial: '',
    sigla: '',
    pais: { id: 0, nombre: '' },
    departamento: '',
    ciudad: { id: 0, nombre: '' },
    direccion: '',
    correo: '',
    telefono: '',
    telefono2: '',
    actividadPrincipal: { id: 0, nombre: '', codigo: '' },
    actividadSecundaria: '',
    paginaWeb: '',
    certificadoISO: false,
  },

  representantesLegales: [],
  representantesLegalesForm: [],
  socios: [],
  revisorFiscalPrincipal: null,
  revisorFiscalSuplente: null,
  contador: null,
  contadoresForm: [],
  informacionTributaria: {
    granContribuyenteBta: false,
    responsableIVA: false,
    regimenSimple: false,
    regimenEspecial: false,
    noObligFacturar: false,
    exentoRetencionFuente: false,
    descuentoSENAFIC: false,
    declarante: false,
    profesionalIndependiente: false,
    agenteRetenedorIVA: false,
    granContribuyente: false,
    resolucionGC: 0,
    fechaGC: null,
    autorretenedor: false,
    resolucionAutoRete: 0,
    fechaAutoRete: null,
    autoRetenedorICA: false,
    detallesICA: [],
  },
  responsabilidadesTributarias: [],
};

/**
 * Diccionario de homologación: código de responsabilidad DIAN → campo booleano en informacionTributaria.
 * Cada código del RUT (casilla 53) se mapea al checkbox correspondiente del formulario.
 * Fuente: Resolución 000042 de 2020 - DIAN
 */
const RESPONSABILIDAD_A_CAMPO: Record<string, keyof FormularioExtraccionData['informacionTributaria']> = {
  '04': 'regimenEspecial',            // Régimen especial
  '05': 'declarante',                 // Declarante renta
  '07': 'agenteRetenedorIVA',         // Agente retenedor renta
  '09': 'agenteRetenedorIVA',         // Agente retenedor IVA
  '13': 'granContribuyente',         // Gran contribuyente
  '15': 'autorretenedor',            // Autorretenedor
  '47': 'regimenSimple',             // Régimen simple
  '48': 'responsableIVA',            // Responsable IVA
  '52': 'noObligFacturar',           // Facturador electrónico
};

// Función helper para convertir RUTData a FormularioExtraccionData
export function convertirRUTAFormulario(rutData: RUTData): FormularioExtraccionData {
  // Homologar códigos de responsabilidades a campos booleanos
  const codigosExtraidos = rutData.responsabilidades.codigos.map(r => r.codigo);
  const checksHomologados: Record<string, boolean> = {};
  for (const codigo of codigosExtraidos) {
    const campo = RESPONSABILIDAD_A_CAMPO[codigo];
    if (campo) {
      checksHomologados[campo] = true;
    }
  }

  return {
    informacionGeneral: {
      tipoContribuyente: rutData.identificacion.tipoContribuyente || '',
      tipoDocumento: rutData.identificacion.tipoDocumento || '',
      numeroIdentificacion: rutData.header.nit || rutData.identificacion.numeroIdentificacion || '',
      digitoVerificacion: rutData.header.dv || '',
      primerNombre: rutData.identificacion.primerNombre || '',
      otrosNombres: rutData.identificacion.otrosNombres || '',
      primerApellido: rutData.identificacion.primerApellido || '',
      segundoApellido: rutData.identificacion.segundoApellido || '',
      razonSocial: rutData.identificacion.razonSocial || '',
      nombreComercial: rutData.identificacion.nombreComercial || '',
      sigla: rutData.identificacion.sigla || '',
      pais: { id: 0, nombre: rutData.ubicacion.pais || '' },
      departamento: rutData.ubicacion.departamento || '',
      ciudad: { id: 0, nombre: rutData.ubicacion.ciudad || '' },
      direccion: rutData.ubicacion.direccion || '',
      correo: rutData.ubicacion.email || '',
      telefono: rutData.ubicacion.telefono1 || '',
      telefono2: rutData.ubicacion.telefono2 || '',
      actividadPrincipal: { id: 0, nombre: rutData.clasificacion.actividadPrincipal || '', codigo: '' },
      actividadSecundaria: rutData.clasificacion.actividadSecundaria || '',
      paginaWeb: '',
      certificadoISO: false,
    },

    representantesLegales: rutData.representantesLegales || [],
    representantesLegalesForm: [],
    socios: rutData.socios || [],
    revisorFiscalPrincipal: rutData.revisorFiscalPrincipal,
    revisorFiscalSuplente: rutData.revisorFiscalSuplente,
    contador: rutData.contador,
    contadoresForm: [],
    informacionTributaria: {
      granContribuyenteBta: !!checksHomologados['granContribuyenteBta'],
      responsableIVA: !!checksHomologados['responsableIVA'],
      regimenSimple: !!checksHomologados['regimenSimple'],
      regimenEspecial: !!checksHomologados['regimenEspecial'],
      noObligFacturar: !!checksHomologados['noObligFacturar'],
      exentoRetencionFuente: !!checksHomologados['exentoRetencionFuente'],
      descuentoSENAFIC: !!checksHomologados['descuentoSENAFIC'],
      declarante: !!checksHomologados['declarante'],
      profesionalIndependiente: !!checksHomologados['profesionalIndependiente'],
      agenteRetenedorIVA: !!checksHomologados['agenteRetenedorIVA'],
      granContribuyente: !!checksHomologados['granContribuyente'],
      resolucionGC: 0,
      fechaGC: null,
      autorretenedor: !!checksHomologados['autorretenedor'],
      resolucionAutoRete: 0,
      fechaAutoRete: null,
      autoRetenedorICA: !!checksHomologados['autoRetenedorICA'],
      detallesICA: [],
    },
    responsabilidadesTributarias: rutData.responsabilidades.codigos || [],
  };
}
