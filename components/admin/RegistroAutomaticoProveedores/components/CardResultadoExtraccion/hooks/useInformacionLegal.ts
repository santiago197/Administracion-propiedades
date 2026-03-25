import { useCallback, useEffect, useRef, useState } from "react";

import { FormularioExtraccionData, RepresentanteLegalData } from "../../../model";
import { normalizarTipoDocumento } from "../../../utilities/tipoDocumento";
import { CamaracomercioDTO, TipoRegistroCamaraComercio, TipoRegistroCamaraComercioRepresentacion } from "../../../../CamaraComercio/model/camaraComercio.model";
import { AdjuntoTerceroDTO } from "../../../../DocumentosAdjuntos/Model/AdjuntosDTO";

interface ValidationField {
    hasError: boolean;
    msn: string;
}

export interface RepresentanteValidacion {
    nombre: ValidationField;
    apellido: ValidationField;
    documento: ValidationField;
}

const INITIAL_REPRESENTANTE_VALIDACION: RepresentanteValidacion = {
    nombre: { hasError: false, msn: '' },
    apellido: { hasError: false, msn: '' },
    documento: { hasError: false, msn: '' },
};

const mapTipoRepresentacion = (tipo: string): TipoRegistroCamaraComercioRepresentacion => {
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes("suplente")) return TipoRegistroCamaraComercioRepresentacion.Suplente;
    if (tipoLower.includes("apoderado")) return TipoRegistroCamaraComercioRepresentacion.Apoderado;
    return TipoRegistroCamaraComercioRepresentacion.Principal;
};

const initFromOCR = (representantesLegales: RepresentanteLegalData[]): CamaracomercioDTO[] =>
    representantesLegales.map(rep => ({
        id: 0,
        tipoDocumento: normalizarTipoDocumento(rep.tipoDocumento),
        documento: rep.numeroIdentificacion,
        nombre: [rep.primerNombre, rep.otrosNombres].filter(Boolean).join(' ').trim(),
        apellido: [rep.primerApellido, rep.segundoApellido].filter(Boolean).join(' ').trim(),
        cargo: '',
        porcentaje: '',
        tipoRegistro: TipoRegistroCamaraComercio.RepresentanteLegal,
        isPep: false,
        hasVinculoPep: false,
        tipoRepresentacion: mapTipoRepresentacion(rep.tipoRepresentacion),
        fechaExpedicion: rep.fechaExpedicion || '',
        lugarExpedicion: rep.lugarExpedicionCiudad || '',
        fechaNacimiento: '',
        lugarNacimiento: '',
        lugarResidencia: '',
        paisResidencia: '',
        direccion: '',
        nacionalidad: '',
        razonSocialNombre: '',
        razonSocialTipoDoc: '',
        razonSocialDoc: '',
        documentoAdjunto: null as unknown as AdjuntoTerceroDTO,
        isActualizacion: false,
        idConstructora: 0,
    }));

interface UseInformacionLegalProps {
    representantesLegales: RepresentanteLegalData[];
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
}

export const useInformacionLegal = ({ representantesLegales, setFormData }: UseInformacionLegalProps) => {
    const [state, setState] = useState<CamaracomercioDTO[]>(() => initFromOCR(representantesLegales));
    const [validationMap, setValidationMap] = useState<Record<number, RepresentanteValidacion>>({});
    console.log('Represetanes legales',state);

    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    useEffect(() => {
        setFormData(prev => ({ ...prev, representantesLegalesForm: state }));
    }, [state]);

    const handleRepresentanteChange = (index: number, field: string, value: string | boolean | number) => {
        setState(prev => prev.map((rep, i) => i === index ? { ...rep, [field]: value } : rep));
        if (field in INITIAL_REPRESENTANTE_VALIDACION) {
            setValidationMap(prev => ({
                ...prev,
                [index]: {
                    ...(prev[index] ?? INITIAL_REPRESENTANTE_VALIDACION),
                    [field]: { hasError: false, msn: '' }
                }
            }));
        }
    };

    const handleAddRepresentante = () => {
        const nuevo: CamaracomercioDTO = {
            id: 0,
            tipoDocumento: 'cc',
            documento: '',
            nombre: '',
            apellido: '',
            cargo: '',
            porcentaje: '',
            tipoRegistro: TipoRegistroCamaraComercio.RepresentanteLegal,
            isPep: false,
            hasVinculoPep: false,
            tipoRepresentacion: TipoRegistroCamaraComercioRepresentacion.Principal,
            fechaExpedicion: '', lugarExpedicion: '', fechaNacimiento: '',
            lugarNacimiento: '', lugarResidencia: '', paisResidencia: '',
            direccion: '', nacionalidad: '', razonSocialNombre: '',
            razonSocialTipoDoc: '', razonSocialDoc: '',
            documentoAdjunto: null as unknown as AdjuntoTerceroDTO,
            isActualizacion: false, idConstructora: 0,
        };
        setState(prev => [nuevo, ...prev]);
    };

    const handleRemoveRepresentante = (index: number) => {
        setState(prev => prev.filter((_, i) => i !== index));
        setValidationMap(prev => {
            const result: Record<number, RepresentanteValidacion> = {};
            Object.entries(prev).forEach(([key, val]) => {
                const k = Number(key);
                if (k < index) result[k] = val;
                else if (k > index) result[k - 1] = val;
            });
            return result;
        });
    };

    const validateRepresentantes = useCallback((): boolean => {
        const current = stateRef.current;
        const newValidationMap: Record<number, RepresentanteValidacion> = {};
        let isValid = true;

        current.forEach((rep, index) => {
            const errores: RepresentanteValidacion = { ...INITIAL_REPRESENTANTE_VALIDACION };

            if (!rep.nombre?.trim()) {
                errores.nombre = { hasError: true, msn: 'Los nombres son obligatorios' };
                isValid = false;
            }
            if (!rep.apellido?.trim()) {
                errores.apellido = { hasError: true, msn: 'Los apellidos son obligatorios' };
                isValid = false;
            }
            if (!rep.documento?.trim()) {
                errores.documento = { hasError: true, msn: 'El número de documento es obligatorio' };
                isValid = false;
            }

            newValidationMap[index] = errores;
        });

        setValidationMap(newValidationMap);
        return isValid;
    }, []);

    return {
        state,
        validationMap,
        handleRepresentanteChange,
        handleRemoveRepresentante,
        handleAddRepresentante,
        validateRepresentantes,
    };
};
