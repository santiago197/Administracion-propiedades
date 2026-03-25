// Datos simulados del RUT de WORLD PLAYS para testing
import { RUTData } from './OCRResponse.model';

export const MOCK_RUT_DATA: RUTData = {
  header: {
    concepto: "02 - Actualización",
    numeroFormulario: "141143716931",
    nit: "901000363",
    dv: "7",
    direccionSeccional: "Impuestos de Bogotá"
  },
  identificacion: {
    tipoContribuyente: "Persona jurídica",
    tipoDocumento: null,
    numeroIdentificacion: null,
    fechaExpedicion: null,
    lugarExpedicionPais: null,
    lugarExpedicionDepartamento: null,
    lugarExpedicionCiudad: null,
    primerApellido: null,
    segundoApellido: null,
    primerNombre: null,
    otrosNombres: null,
    razonSocial: "WORLD PLAYS JUEGOS Y PARQUES INFANTILES SAS",
    nombreComercial: null,
    sigla: "",
    dv: ""
  },
  ubicacion: {
    pais: "COLOMBIA",
    departamento: "Bogotá D",
    ciudad: "Bogotá",
    direccion: "CL 157 96 71",
    email: "worldplays@gmail.com",
    codigoPostal: null,
    telefono1: "3204595043",
    telefono2: "3115497871"
  },
  clasificacion: {
    actividadPrincipal: "3230",
    fechaInicioActividadPrincipal: "20200526",
    actividadSecundaria: "4290",
    fechaInicioActividadSecundaria: "20171101",
    otraActividad1: null,
    otraActividad2: null,
    ocupacion: null,
  },
  responsabilidades: {
    codigos: []
  },
  
  representantesLegales: [
    {
      tipoRepresentacion: "REPRS LEGAL PRIN",
      tipoDocumento: "Cedula de Ciudadani",
      numeroIdentificacion: "79468168",
      fechaExpedicion: null,
      lugarExpedicionPais: null,
      lugarExpedicionDepartamento: null,
      lugarExpedicionCiudad: null,
      primerApellido: "ACEVEDO",
      segundoApellido: "SANCHEZ",
      primerNombre: "OSCAR",
      otrosNombres: null,
      razonSocial: "representante legal",
      fechaInicioVinculacion: null
    },
    {
      tipoRepresentacion: "REPRS LEGAL SUPL",
      tipoDocumento: "Cédula de Ciudadan",
      numeroIdentificacion: "1070919017",
      fechaExpedicion: null,
      lugarExpedicionPais: null,
      lugarExpedicionDepartamento: null,
      lugarExpedicionCiudad: null,
      primerApellido: "ACEVEDO",
      segundoApellido: "DIAZ",
      primerNombre: "FABIAN",
      otrosNombres: null,
      razonSocial: null,
      fechaInicioVinculacion: "20160818"
    }
  ],
  socios: [],
  revisorFiscalPrincipal: null,
  revisorFiscalSuplente: null,
  contador: {
    tipoDocumento: "Cédula de Ciudadanía 1 3",
    numeroIdentificacion: "52254919",
    fechaExpedicion: null,
    lugarExpedicionPais: null,
    lugarExpedicionDepartamento: null,
    lugarExpedicionCiudad: null,
    primerApellido: null,
    segundoApellido: null,
    primerNombre: null,
    otrosNombres: null,
    tarjetaProfesional: "81768T",
  },
};
