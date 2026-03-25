import {
  CamaracomercioDTO,
  TipoRegistroCamaraComercio,
  TipoRegistroCamaraComercioRepresentacion,
} from "../../CamaraComercio/model/camaraComercio.model";
import { AdjuntoTerceroDTO } from "../../DocumentosAdjuntos/Model/AdjuntosDTO";
import { TerInformacionGeneralDTO } from "../../InformacionGeneral/Model";
import {
  FormularioExtraccionData,
  SocioData,
  ContadorData,
} from "../model";

/**
 * Normaliza el tipo de documento del RUT al formato esperado por CamaracomercioDTO.
 */
const mapTipoDocumento = (tipoDoc: string): string => {
  const tipo = tipoDoc.toLowerCase().trim();
  if (tipo.includes("nit")) return "NIT";
  if (tipo.includes("cedula") || tipo.includes("cédula") || tipo === "cc")
    return "cc";
  if (
    tipo.includes("extranjeria") ||
    tipo.includes("extranjería") ||
    tipo === "ce"
  )
    return "ce";
  if (tipo.includes("pasaporte")) return "pasaporte";
  return tipoDoc || "cc";
};

/**
 * Verifica si el tipo de documento es NIT (persona jurídica).
 */
const esDocumentoNIT = (tipoDocumento: string): boolean => {
  return mapTipoDocumento(tipoDocumento) === "NIT";
};

const construirNombre = (
  primerNombre: string | null,
  otrosNombres?: string | null
): string => {
  return [primerNombre, otrosNombres].filter(Boolean).join(" ").trim();
};

const construirApellido = (
  primerApellido: string | null,
  segundoApellido?: string | null
): string => {
  return [primerApellido, segundoApellido].filter(Boolean).join(" ").trim();
};

/**
 * DocumentoAdjunto vacío para revisores fiscales y contadores.
 */
const crearDocumentoAdjuntoVacio = (): AdjuntoTerceroDTO => ({
  adjunto: {
    id: 0,
    nombre: "",
    extension: "",
    fecha: new Date(),
    constructora: 0,
  },
  tipoAdjunto: {
    idPlantilla: "0",
    nombre: "",
    plantilla: "",
    id: 0,
    novedades: [],
  },
});

/**
 * DocumentoAdjunto específico para socios (beneficiarios finales).
 */
const crearDocumentoAdjuntoSocio = (): AdjuntoTerceroDTO => ({
  adjunto: {
    id: 0,
    nombre: "",
    extension: "",
    fecha: new Date(),
    constructora: 0,
  },
  tipoAdjunto: {
    idPlantilla: "0",
    nombre: "Conocimiento ampliado de beneficiarios finales",
    plantilla: "",
    id: 1020,
    novedades: [],
  },
});

const esPersonaNatural = (tipoContribuyente: string): boolean => {
  return (
    tipoContribuyente === "1" ||
    tipoContribuyente.toLowerCase().includes("persona natural")
  );
};

/**
 * Mapea un socio del RUT a CamaracomercioDTO.
 * Incluye documentoAdjunto con tipoAdjunto de beneficiarios finales (id: 1020).
 */
const mapSocio = (socio: SocioData): CamaracomercioDTO => {
  const tipoDoc = mapTipoDocumento(socio.tipoDocumento);
  const esNIT = esDocumentoNIT(socio.tipoDocumento);
  
  return {
    id: 0,
    tipoDocumento: tipoDoc,
    documento: socio.numeroIdentificacion,
    nombre: esNIT 
      ? (socio.razonSocial || "") 
      : construirNombre(socio.primerNombre, socio.otrosNombres),
    apellido: esNIT 
      ? "" 
      : construirApellido(socio.primerApellido, socio.segundoApellido),
    cargo: "",
    porcentaje: socio.porcentajeParticipacion || "0",
    tipoRegistro: TipoRegistroCamaraComercio.Socios,
    isPep: socio.isPep ?? false,
    hasVinculoPep: socio.hasVinculoPep ?? false,
    tipoRepresentacion: TipoRegistroCamaraComercioRepresentacion.Principal,
    fechaExpedicion: "",
    lugarExpedicion: "",
    fechaNacimiento: "",
    lugarNacimiento: "",
    lugarResidencia: "",
    paisResidencia: socio.nacionalidad || "",
    direccion: "",
    nacionalidad: "",
    razonSocialNombre: "",
    razonSocialTipoDoc: "",
    razonSocialDoc: "",
    documentoAdjunto: socio.documentoAdjunto || crearDocumentoAdjuntoSocio(),
    isActualizacion: false,
    idConstructora: 0,
  };
};
/**
 * Mapea un contador del RUT a CamaracomercioDTO.
 */
const mapContador = (contador: ContadorData): CamaracomercioDTO => ({
  id: 0,
  tipoDocumento: mapTipoDocumento(contador.tipoDocumento),
  documento: contador.numeroIdentificacion,
  nombre: construirNombre(contador.primerNombre, contador.otrosNombres),
  apellido: construirApellido(contador.primerApellido, contador.segundoApellido),
  cargo: "Contador",
  porcentaje: "",
  tipoRegistro: TipoRegistroCamaraComercio.Contador,
  isPep: contador.isPep ?? false,
  hasVinculoPep: contador.hasVinculoPep ?? false,
  tipoRepresentacion: TipoRegistroCamaraComercioRepresentacion.Principal,
  fechaExpedicion: "",
  lugarExpedicion: "",
  fechaNacimiento: "",
  lugarNacimiento: "",
  lugarResidencia: "",
  paisResidencia: "",
  direccion: "",
  nacionalidad: "",
  razonSocialNombre: "",
  razonSocialTipoDoc: "",
  razonSocialDoc: "",
  documentoAdjunto: crearDocumentoAdjuntoVacio(),
  isActualizacion: false,
  idConstructora: 0,
});

/**
 * Mapea el tipo de persona del formulario al formato esperado por TerInformacionGeneralDTO.
 */
const mapTipoPersona = (tipoContribuyente: string): string => {
  if (esPersonaNatural(tipoContribuyente)) return "N";
  return "J";
};

/**
 * Convierte los datos de informacionGeneral a TerInformacionGeneralDTO
 * para enviar al servicio guardarinfo (TercerosGI/GuardaInfGeneral).
 */
export const mapFormularioToInformacionGeneral = (
  data: FormularioExtraccionData
): TerInformacionGeneralDTO => {
  const info = data.informacionGeneral;
  const esNatural = esPersonaNatural(info.tipoContribuyente);

  return {
    id: 0,
    nombre: esNatural
      ? construirNombre(info.primerNombre, info.otrosNombres)
      : info.razonSocial,
    apellido: esNatural
      ? construirApellido(info.primerApellido, info.segundoApellido)
      : "",
    tipoPersona: mapTipoPersona(info.tipoContribuyente),
    tipoDocumento: mapTipoDocumento(info.tipoDocumento),
    numeroIdentificacion: info.numeroIdentificacion,
    digitoVerificacion: info.digitoVerificacion,
    correo: info.correo,
    ciudad: {
      id: info.ciudad.id,
      nombre: info.ciudad.nombre,
    },
    pais: {
      id: info.pais.id,
      nombre: info.pais.nombre,
      sigla: info.pais.sigla ?? "",
    },
    actividadEconomica: {
      id: info.actividadPrincipal.id,
      nombre: info.actividadPrincipal.nombre,
      codigo: info.actividadPrincipal.codigo,
    },
    telefono: info.telefono,
    direccion: info.direccion,
    paginaWeb: "",
    certificadoISO: info.certificadoISO,
    fechaRegistro: new Date(),
    isActualizacion: false,
    idConstructora: -1,
  };
};

/**
 * Convierte los datos del formulario de extracción OCR a un array de CamaracomercioDTO
 * listos para enviar al servicio guardarDatos (TercerosGI/CamaraComercio).
 */
export const mapFormularioToCamaraComercio = (
  data: FormularioExtraccionData
): CamaracomercioDTO[] => {
  const registros: CamaracomercioDTO[] = [];

  // Representantes legales — ya son CamaracomercioDTO[], sin conversión
  (data.representantesLegalesForm ?? []).forEach((rep) => {
    registros.push(rep);
  });

  // Socios
  data.socios.forEach((socio) => {
    registros.push(mapSocio(socio));
  });

  // Revisor fiscal principal y suplente
  // En runtime son CamaracomercioDTO sincronizados por useRevisoresFiscales (contienen isPep/hasVinculoPep editados)
  if (data.revisorFiscalPrincipal) {
    registros.push(data.revisorFiscalPrincipal as unknown as CamaracomercioDTO);
  }
  if (data.revisorFiscalSuplente) {
    registros.push(data.revisorFiscalSuplente as unknown as CamaracomercioDTO);
  }

  // Contador
  if (data.contadoresForm.length > 0) {
    registros.push(...data.contadoresForm);
  } else if (data.contador) {
    registros.push(mapContador(data.contador));
  }

  // Deduplicar por documento + tipoRegistro + tipoRepresentacion
  // Se incluye tipoRepresentacion para distinguir entre revisores principal/suplente
  // que pueden tener documento vacío cuando el OCR no lo extrae
  const vistos = new Set<string>();
  return registros.filter(r => {
    const clave = `${r.documento}-${r.tipoRegistro}-${r.tipoRepresentacion}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
};
