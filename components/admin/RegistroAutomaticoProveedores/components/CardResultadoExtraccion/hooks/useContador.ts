import { useCallback, useEffect, useRef, useState } from "react";
import { ContadorData, FormularioExtraccionData } from "../../../model";
import { CamaracomercioDTO, TipoRegistroCamaraComercio, TipoRegistroCamaraComercioRepresentacion } from "../../../../CamaraComercio/model/camaraComercio.model";
import { normalizarTipoDocumento } from "../../../utilities/tipoDocumento";
import { AdjuntoTerceroDTO } from "../../../../DocumentosAdjuntos/Model/AdjuntosDTO";

interface ValidationField {
    hasError: boolean;
    msn: string;
}

export interface ContadorValidacion {
    primerNombre: ValidationField;
    primerApellido: ValidationField;
    numeroIdentificacion: ValidationField;
    tipoDocumento: ValidationField;
}

const INITIAL_CONTADOR_VALIDACION: ContadorValidacion = {
    primerNombre: { hasError: false, msn: '' },
    primerApellido: { hasError: false, msn: '' },
    numeroIdentificacion: { hasError: false, msn: '' },
    tipoDocumento: { hasError: false, msn: '' },
};

const EMPTY_CONTADOR: Omit<CamaracomercioDTO, 'documentoAdjunto'> & { documentoAdjunto: AdjuntoTerceroDTO } = {
    id: 0,
    tipoDocumento: 'cc',
    documento: '',
    nombre: '',
    apellido: '',
    cargo: '',
    porcentaje: '',
    tipoRegistro: TipoRegistroCamaraComercio.Contador,
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

const mapContadorToFormState = (contador: ContadorData): CamaracomercioDTO => ({
    ...EMPTY_CONTADOR,
    tipoDocumento: normalizarTipoDocumento(contador.tipoDocumento),
    documento: contador.numeroIdentificacion,
    nombre: [contador.primerNombre, contador.otrosNombres].filter(Boolean).join(' ').trim(),
    apellido: [contador.primerApellido, contador.segundoApellido].filter(Boolean).join(' ').trim(),
    isPep: contador.isPep ?? false,
    hasVinculoPep: contador.hasVinculoPep ?? false,
    fechaExpedicion: contador.fechaExpedicion || '',
});

interface UseContadorProps {
    contador: ContadorData | null;
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
}

export const useContador = ({ contador, setFormData }: UseContadorProps) => {
    const [state, setState] = useState<CamaracomercioDTO[]>(() =>
        contador ? [mapContadorToFormState(contador)] : []
    );
    const [validationMap, setValidationMap] = useState<Record<number, ContadorValidacion>>({});

    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    useEffect(() => {
        setFormData(prev => ({ ...prev, contadoresForm: state }));
    }, [state, setFormData]);

    const handleAddContador = () => {
        setState(prev => [{ ...EMPTY_CONTADOR }, ...prev]);
    };

    const handleRemoveContador = (index: number) => {
        setState(prev => prev.filter((_, i) => i !== index));
        setValidationMap(prev => {
            const result: Record<number, ContadorValidacion> = {};
            Object.entries(prev).forEach(([key, val]) => {
                const k = Number(key);
                if (k < index) result[k] = val;
                else if (k > index) result[k - 1] = val;
            });
            return result;
        });
    };

    const handleChange = (index: number, field: string, value: string | boolean) => {
        setState(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
        if (field in INITIAL_CONTADOR_VALIDACION) {
            setValidationMap(prev => ({
                ...prev,
                [index]: {
                    ...(prev[index] ?? INITIAL_CONTADOR_VALIDACION),
                    [field]: { hasError: false, msn: '' },
                },
            }));
        }
    };

    const validateContador = useCallback((): boolean => {
        const current = stateRef.current;
        const newValidationMap: Record<number, ContadorValidacion> = {};
        let isValid = true;

        current.forEach((c, index) => {
            const errores: ContadorValidacion = { ...INITIAL_CONTADOR_VALIDACION };

            if (!c.tipoDocumento?.trim()) {
                errores.tipoDocumento = { hasError: true, msn: 'El tipo de documento es obligatorio' };
                isValid = false;
            }
            if (!c.documento?.trim()) {
                errores.numeroIdentificacion = { hasError: true, msn: 'El número de documento es obligatorio' };
                isValid = false;
            }
            if (!c.nombre?.trim()) {
                errores.primerNombre = { hasError: true, msn: 'El nombre es obligatorio' };
                isValid = false;
            }
            if (!c.apellido?.trim()) {
                errores.primerApellido = { hasError: true, msn: 'El apellido es obligatorio' };
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
        handleChange,
        handleAddContador,
        handleRemoveContador,
        validateContador,
    };
};
