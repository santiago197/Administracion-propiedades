import { useCallback, useEffect, useRef, useState } from "react";
import { FormularioExtraccionData, RevisorFiscalData } from "../../../model";
import { CamaracomercioDTO, TipoRegistroCamaraComercio, TipoRegistroCamaraComercioRepresentacion } from "../../../../CamaraComercio/model/camaraComercio.model";
import { normalizarTipoDocumento } from "../../../utilities/tipoDocumento";

interface ValidationField {
    hasError: boolean;
    msn: string;
}

export interface RevisorValidacion {
    primerNombre: ValidationField;
    primerApellido: ValidationField;
    numeroIdentificacion: ValidationField;
    tarjetaProfesional?: ValidationField;
    nit?: ValidationField;
    sociedadDesignada?: ValidationField;
}

const INITIAL_REVISOR_VALIDACION: RevisorValidacion = {
    primerNombre: { hasError: false, msn: '' },
    primerApellido: { hasError: false, msn: '' },
    numeroIdentificacion: { hasError: false, msn: '' },
    tarjetaProfesional: { hasError: false, msn: '' },
    nit: { hasError: false, msn: '' },
    sociedadDesignada: { hasError: false, msn: '' },
};

/**
 * Detecta si un revisor debe ser tratado como tipo Firma
 * basándose en si tiene NIT y Sociedad Designada
 */
const isTipoFirma = (revisor: RevisorFiscalData | null): boolean => {
    if (!revisor) return false;
    return !!(revisor.nit?.trim() && revisor.sociedadDesignada?.trim());
};

const initFromOCR = (revisorPrincipal: RevisorFiscalData | null, revisorSuplente: RevisorFiscalData | null): CamaracomercioDTO[] => {
    const revisores: CamaracomercioDTO[] = [];

    if (revisorPrincipal) {
        const esFirma = isTipoFirma(revisorPrincipal);
        revisores.push({
            id: 0,
            tipoDocumento: normalizarTipoDocumento(revisorPrincipal.tipoDocumento),
            documento: revisorPrincipal.numeroIdentificacion,
            nombre: [revisorPrincipal.primerNombre, revisorPrincipal.otrosNombres].filter(Boolean).join(' ').trim(),
            apellido: [revisorPrincipal.primerApellido, revisorPrincipal.segundoApellido].filter(Boolean).join(' ').trim(),
            cargo: '',
            porcentaje: '',
            tipoRegistro: TipoRegistroCamaraComercio.Fiscal,
            isPep: false,
            hasVinculoPep: false,
            tipoRepresentacion: esFirma ? TipoRegistroCamaraComercioRepresentacion.Firma : TipoRegistroCamaraComercioRepresentacion.Principal,
            fechaExpedicion: revisorPrincipal.fechaExpedicion || '',
            lugarExpedicion: revisorPrincipal.lugarExpedicionCiudad || '',
            fechaNacimiento: '',
            lugarNacimiento: '',
            lugarResidencia: '',
            paisResidencia: '',
            direccion: '',
            nacionalidad: '',
            razonSocialNombre: revisorPrincipal.sociedadDesignada || '',
            razonSocialTipoDoc: 'nit',
            razonSocialDoc: revisorPrincipal.nit || '',
            documentoAdjunto: {
                adjunto: {
                    id: 0,
                    nombre: "",
                    extension: "",
                    fecha: new Date(),
                    constructora: 0
                },
                tipoAdjunto: {
                    idPlantilla: "0",
                    nombre: "",
                    plantilla: "",
                    id: 0,
                    novedades: []
                }
            },
            isActualizacion: false,
            idConstructora: 0,
        });
    }

    if (revisorSuplente) {
        // El revisor suplente siempre mantiene tipo Suplente, sin detectar Firma
        revisores.push({
            id: 0,
            tipoDocumento: normalizarTipoDocumento(revisorSuplente.tipoDocumento),
            documento: revisorSuplente.numeroIdentificacion,
            nombre: [revisorSuplente.primerNombre, revisorSuplente.otrosNombres].filter(Boolean).join(' ').trim(),
            apellido: [revisorSuplente.primerApellido, revisorSuplente.segundoApellido].filter(Boolean).join(' ').trim(),
            cargo: revisorSuplente.tarjetaProfesional || '',
            porcentaje: '',
            tipoRegistro: TipoRegistroCamaraComercio.Fiscal,
            isPep: false,
            hasVinculoPep: false,
            tipoRepresentacion: TipoRegistroCamaraComercioRepresentacion.Suplente,
            fechaExpedicion: revisorSuplente.fechaExpedicion || '',
            lugarExpedicion: revisorSuplente.lugarExpedicionCiudad || '',
            fechaNacimiento: '',
            lugarNacimiento: '',
            lugarResidencia: '',
            paisResidencia: '',
            direccion: '',
            nacionalidad: '',
            razonSocialNombre: revisorSuplente.sociedadDesignada || '',
            razonSocialTipoDoc: 'nit',
            razonSocialDoc: revisorSuplente.nit || '',
            documentoAdjunto: {
                adjunto: {
                    id: 0,
                    nombre: "",
                    extension: "",
                    fecha: new Date(),
                    constructora: 0
                },
                tipoAdjunto: {
                    idPlantilla: "0",
                    nombre: "",
                    plantilla: "",
                    id: 0,
                    novedades: []
                }
            },

            isActualizacion: false,
            idConstructora: 0,
        });
    }

    return revisores;
};

interface UseRevisoresFiscalesProps {
    revisorPrincipal: RevisorFiscalData | null;
    revisorSuplente: RevisorFiscalData | null;
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
}

export const useRevisoresFiscales = ({ revisorPrincipal, revisorSuplente, setFormData }: UseRevisoresFiscalesProps) => {
    const [state, setState] = useState<CamaracomercioDTO[]>(() => initFromOCR(revisorPrincipal, revisorSuplente));
    const [validationMap, setValidationMap] = useState<Record<number, RevisorValidacion>>({});
    // Mantener referencia a datos originales del OCR
    const [dataOCR] = useState<{ principal: RevisorFiscalData | null; suplente: RevisorFiscalData | null }>({
        principal: revisorPrincipal,
        suplente: revisorSuplente,
    });

    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    // Sincronizar cambios con FormData
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            revisorFiscalPrincipal: state.length > 0 ? state[0] as any : null,
            revisorFiscalSuplente: state.length > 1 ? state[1] as any : null,
        }));
    }, [state, setFormData]);

    const handleRevisorChange = (index: number, field: string, value: string | boolean | number) => {
        setState(prev => prev.map((rev, i) => i === index ? { ...rev, [field]: value } : rev));
        if (field in INITIAL_REVISOR_VALIDACION) {
            setValidationMap(prev => ({
                ...prev,
                [index]: {
                    ...(prev[index] ?? INITIAL_REVISOR_VALIDACION),
                    [field]: { hasError: false, msn: '' }
                }
            }));
        }
    };

    const handleAddRevisor = () => {
        const nuevo: CamaracomercioDTO = {
            id: 0,
            tipoDocumento: 'cc',
            documento: '',
            nombre: '',
            apellido: '',
            cargo: '',
            porcentaje: '',
            tipoRegistro: TipoRegistroCamaraComercio.Fiscal,
            isPep: false,
            hasVinculoPep: false,
            tipoRepresentacion: TipoRegistroCamaraComercioRepresentacion.Principal,
            fechaExpedicion: '', lugarExpedicion: '', fechaNacimiento: '',
            lugarNacimiento: '', lugarResidencia: '', paisResidencia: '',
            direccion: '', nacionalidad: '', razonSocialNombre: '',
            razonSocialTipoDoc: '', razonSocialDoc: '',
            documentoAdjunto: {
                adjunto: { id: 0, nombre: '', extension: '', fecha: new Date(), constructora: 0 },
                tipoAdjunto: { idPlantilla: '0', nombre: '', plantilla: '', id: 0, novedades: [] }
            },
            isActualizacion: false, idConstructora: 0,
        };
        setState(prev => [nuevo, ...prev]);
    };

    const handleRemoveRevisor = (index: number) => {
        setState(prev => prev.filter((_, i) => i !== index));
        setValidationMap(prev => {
            const result: Record<number, RevisorValidacion> = {};
            Object.entries(prev).forEach(([key, val]) => {
                const k = Number(key);
                if (k < index) result[k] = val;
                else if (k > index) result[k - 1] = val;
            });
            return result;
        });
    };

    const validateRevisores = useCallback((): boolean => {
        const current = stateRef.current;
        const newValidationMap: Record<number, RevisorValidacion> = {};
        let isValid = true;

        current.forEach((revisor, index) => {
            const errores: RevisorValidacion = { ...INITIAL_REVISOR_VALIDACION };
            const isFirma = revisor.tipoRepresentacion === TipoRegistroCamaraComercioRepresentacion.Firma;

            // Validaciones para firma
            if (isFirma) {
                if (!revisor.razonSocialDoc?.trim()) {
                    errores.nit = { hasError: true, msn: 'El NIT es obligatorio' };
                    isValid = false;
                } else if (revisor.razonSocialDoc.length !== 9) {
                    errores.nit = { hasError: true, msn: 'El NIT debe tener 9 caracteres' };
                    isValid = false;
                }
                if (!revisor.razonSocialNombre?.trim()) {
                    errores.sociedadDesignada = { hasError: true, msn: 'La sociedad o firma designada es obligatoria' };
                    isValid = false;
                }
            } else {
                // Validaciones para personal
                if (!revisor.cargo?.trim()) {
                    errores.tarjetaProfesional = { hasError: true, msn: 'El detalle del cargo es obligatorio' };
                    isValid = false;
                }
            }

            // Validaciones comunes
            if (!revisor.nombre?.trim()) {
                errores.primerNombre = { hasError: true, msn: 'Los nombres son obligatorios' };
                isValid = false;
            }
            if (!revisor.apellido?.trim()) {
                errores.primerApellido = { hasError: true, msn: 'Los apellidos son obligatorios' };
                isValid = false;
            }
            if (!revisor.documento?.trim()) {
                errores.numeroIdentificacion = { hasError: true, msn: 'El número de documento es obligatorio' };
                isValid = false;
            }

            newValidationMap[index] = errores;
        });

        setValidationMap(newValidationMap);
        return isValid;
    }, []);

    return {
        state,
        dataOCR,
        validationMap,
        handleRevisorChange,
        handleRemoveRevisor,
        handleAddRevisor,
        validateRevisores,
    };
};
