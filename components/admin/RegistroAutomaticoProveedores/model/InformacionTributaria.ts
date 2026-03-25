import { ResponsabilidadItem } from "./OCRResponse.model";


export interface InformacionTributariaData {
    responsabilidadesTributarias: ResponsabilidadItem[];
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
    resolucionGC: string;
    fechaGC: Date | null;
    autorretenedor: boolean;
    resolucionAutoRete: string;
    fechaAutoRete: Date | null;
    autoRetenedorICA: boolean;
}

export interface DetalleICA {
    ciudad: { id: number; nombre: string } | null;
    actividadEconomica: { id: number; nombre: string; codigo?: string } | null;
}