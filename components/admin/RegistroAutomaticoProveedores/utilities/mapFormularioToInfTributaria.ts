import { InfTributariaDTO } from "../../InformacionTributaria/model/InfTributariaDTO";
import { FormularioExtraccionData } from "../model";

/**
 * Mapea las responsabilidades fiscales del formulario a la estructura InfTributariaDTO.
 * Usa directamente los valores del formulario que pueden haber sido modificados manualmente por el usuario.
 * 
 * @param data Datos del formulario de extracción OCR con posibles modificaciones del usuario
 * @returns InfTributariaDTO con las responsabilidades mapeadas
 */
export const mapFormularioToInfTributaria = (
  data: FormularioExtraccionData
): InfTributariaDTO => {
  
  // Tomar los valores directamente del formulario (incluye modificaciones manuales del usuario)
  const infTrib = data.informacionTributaria;
  
  // Crear objeto con valores del formulario
  const infTributaria: InfTributariaDTO = {
    id: 0,
    idTercero: 0,
    responsableIVA: infTrib.responsableIVA || false,
    autorretenedor: infTrib.autorretenedor || false,
    declarante: infTrib.declarante || false,
    granContribuyente: infTrib.granContribuyente || false,
    autoRetenedorICA: infTrib.autoRetenedorICA || false,
    regimenSimple: infTrib.regimenSimple || false,
    noObligFacturar: infTrib.noObligFacturar || false,
    granContribuyenteBta: infTrib.granContribuyenteBta || false,
    regimenEspecial: infTrib.regimenEspecial || false,
    descuentoSENAFIC: infTrib.descuentoSENAFIC || false,
    profesionalIndependiente: infTrib.profesionalIndependiente || false,
    agenteRetenedorIVA: infTrib.agenteRetenedorIVA || false,
    exentoRetencionFuente: infTrib.exentoRetencionFuente || false,
    autoretenedorRFT: false, // Este campo no está en el formulario
    resolucionGC: infTrib.resolucionGC ? Number(infTrib.resolucionGC) : null,
    fechaGC: infTrib.fechaGC || null,
    resolucionAutoRete: infTrib.resolucionAutoRete ? Number(infTrib.resolucionAutoRete) : null,
    fechaAutoRete: infTrib.fechaAutoRete || null,
    existente: false,
    isActualizacion: false,
    idConstructora: -1,
  };

  return infTributaria;
};
