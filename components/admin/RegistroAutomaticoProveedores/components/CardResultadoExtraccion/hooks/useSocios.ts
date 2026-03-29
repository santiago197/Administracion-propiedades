import { useCallback, useEffect, useRef, useState } from "react";
import { FormularioExtraccionData, SocioData } from "../../../model";
import { CamaracomercioDTO, TipoRegistroCamaraComercio, TipoRegistroCamaraComercioRepresentacion } from "../../../../CamaraComercio/model/camaraComercio.model";
import { AdjuntoTerceroDTO } from "../../../../DocumentosAdjuntos/Model/AdjuntosDTO";
import { normalizarTipoDocumento } from "../../../utilities/tipoDocumento";

interface ValidationField {
    hasError: boolean;
    msn: string;
}

export interface SocioValidacion {
    porcentajeParticipacion: ValidationField;
    numeroIdentificacion: ValidationField;
    razonSocial: ValidationField;
    primerNombre: ValidationField;
    primerApellido: ValidationField;
}

const INITIAL_SOCIO_VALIDACION: SocioValidacion = {
    porcentajeParticipacion: { hasError: false, msn: '' },
    numeroIdentificacion: { hasError: false, msn: '' },
    razonSocial: { hasError: false, msn: '' },
    primerNombre: { hasError: false, msn: '' },
    primerApellido: { hasError: false, msn: '' },
};

// Mapeo de campos CamaracomercioDTO a campos SocioValidacion
const VALIDATION_FIELD_MAP: Record<string, keyof SocioValidacion | null> = {
    porcentaje: 'porcentajeParticipacion',
    nombre: 'primerNombre',
    apellido: 'primerApellido',
    documento: 'numeroIdentificacion',
    // Otros campos no tienen validación visible
    tipoDocumento: null,
    cargo: null,
    hasVinculoPep: null,
    id: null,
    isPep: null,
    tipoRegistro: null,
    tipoRepresentacion: null,
    direccion: null,
    fechaExpedicion: null,
    fechaNacimiento: null,
    lugarExpedicion: null,
    lugarNacimiento: null,
    lugarResidencia: null,
    paisResidencia: null,
    nacionalidad: null,
    razonSocialDoc: null,
    razonSocialNombre: null,
    razonSocialTipoDoc: null,
    documentoAdjunto: null,
    isActualizacion: null,
    idConstructora: null,
};

/**
 * Convierte un SocioData del OCR a CamaracomercioDTO con estado editable separado
 */
const mapSocioToFormState = (socio: SocioData): CamaracomercioDTO => {
    const tipoDoc = normalizarTipoDocumento(socio.tipoDocumento);
    const esNIT = tipoDoc === 'NIT';
    
    return {
        id: 0,
        tipoDocumento: tipoDoc,
        documento: socio.numeroIdentificacion,
        nombre: esNIT 
            ? (socio.razonSocial || "") 
            : [socio.primerNombre, socio.otrosNombres].filter(Boolean).join(" ").trim(),
        apellido: esNIT 
            ? "" 
            : [socio.primerApellido, socio.segundoApellido].filter(Boolean).join(" ").trim(),
        cargo: socio.cargo || "",
        porcentaje: socio.porcentajeParticipacion || "",
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
 * Crea un documento adjunto vacío con tipo beneficiarios finales para socios
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

const isSocioFromData = (_socio: SocioData): number => 1;

interface UseSociosProps {
    socios: SocioData[];
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
}

export const useSocios = ({ socios, setFormData }: UseSociosProps) => {
    // Estado separado para el formulario editable (CamaracomercioDTO[])
    const [state, setState] = useState<CamaracomercioDTO[]>(() => socios.map(mapSocioToFormState));
    const [isSocioMap, setIsSocioMap] = useState<Record<number, number>>(
        () => Object.fromEntries(socios.map((s, i) => [i, isSocioFromData(s)]))
    );
    const [validationMap, setValidationMap] = useState<Record<number, SocioValidacion>>({});

    // Ref para que validateSocios acceda siempre a los valores más recientes
    const stateRef = useRef(state);
    const isSocioMapRef = useRef(isSocioMap);

    
        const handleAddSocio = () => {
            const nuevoSocio: SocioData = {
                tipoDocumento: 'CC',
                numeroIdentificacion: '',
                fechaExpedicion: null,
                lugarExpedicionPais: null,
                lugarExpedicionDepartamento: null,
                lugarExpedicionCiudad: null,
                primerApellido: '',
                segundoApellido: null,
                primerNombre: '',
                otrosNombres: null,
                razonSocial: null,
                porcentajeParticipacion: '',
                fechaInicioVinculacion: null
            };
            setFormData(prev => ({ ...prev, socios: [nuevoSocio, ...prev.socios] }));
            onSocioAdded(nuevoSocio);
        };
    
        const handleRemoveSocio = (index: number) => {
            setFormData(prev => ({ ...prev, socios: prev.socios.filter((_, i) => i !== index) }));
            onSocioRemoved(index);
        };

    useEffect(() => { stateRef.current = state; }, [state]);
    useEffect(() => { isSocioMapRef.current = isSocioMap; }, [isSocioMap]);

    // Sincronizar el estado del formulario (CamaracomercioDTO[]) con formData.socios (SocioData[])
    // Convertir de vuelta a SocioData para mantener la estructura OCR
    useEffect(() => {
        const sociosActualizados: SocioData[] = state.map((socio) => ({
            tipoDocumento: socio.tipoDocumento,
            numeroIdentificacion: socio.documento,
            primerNombre: socio.nombre || null,
            primerApellido: socio.apellido || null,
            segundoApellido: null,
            otrosNombres: null,
            razonSocial: socio.nombre || null,
            porcentajeParticipacion: socio.porcentaje || null,
            cargo: socio.cargo || undefined,
            isPep: socio.isPep,
            hasVinculoPep: socio.hasVinculoPep,
            documentoAdjunto: socio.documentoAdjunto,
            nacionalidad: socio.paisResidencia,
            dv: undefined,
            fechaExpedicion: null,
            lugarExpedicionPais: null,
            lugarExpedicionDepartamento: null,
            lugarExpedicionCiudad: null,
            codPaisNacionalidad: undefined,
            tipoDocCodigo: undefined,
            fechaInicioVinculacion: null,
            fechaDeIngreso: undefined,
        }));
        setFormData(prev => ({ ...prev, socios: sociosActualizados }));
    }, [state]);

    const setSocioParticipacion = (index: number, value: number) => {
        setIsSocioMap(prev => ({ ...prev, [index]: value }));
        if (value === 0) {
            setState(prev => prev.map((s, i) =>
                i === index && s.tipoDocumento === 'NIT'
                    ? { ...s, tipoDocumento: 'cc' }
                    : s
            ));
        }
    };

    const handleSocioChange = (index: number, field: string, value: string | boolean | number | object) => {
        const isSocio = isSocioMapRef.current[index];

        if (field === "documentoAdjunto") {
            // Manejo especial para documento adjunto (estructura anidada)
            setState(prev => prev.map((socio, i) => {
                if (i !== index) return socio;

                // Si value es un objeto con 'adjunto' y 'tipoAdjunto', es AdjuntoTerceroDTO completo
                if (typeof value === 'object' && value !== null && 'adjunto' in value && 'tipoAdjunto' in value) {
                    return { ...socio, documentoAdjunto: value as AdjuntoTerceroDTO };
                }
                
                // Si es solo AdjuntosDTO (adjunto), actualizar solo el adjunto
                return {
                    ...socio,
                    documentoAdjunto: {
                        ...socio.documentoAdjunto,
                        adjunto: value as any
                    }
                };
            }));
        } else if (field === "porcentaje") {
            // Lógica de validación similar a handleUpdateInput de FormJuntaDirectiva
            let val = value.toString().replace(",", "."); // cambiar coma por punto

            // Permitir borrar todo
            if (val === "") {
                setState(prev => prev.map((socio, i) =>
                    i === index ? { ...socio, porcentaje: "" } : socio
                ));
                return;
            }

            // Quitar "e" o "E" (notación científica)
            val = val.replace(/e/gi, "");

            // Limitar longitud
            if (val.length > 10) {
                val = val.substring(0, 10);
            }

            // Validar número
            if (isNaN(Number(val))) {
                setValidationMap(prev => ({
                    ...prev,
                    [index]: {
                        ...(prev[index] ?? INITIAL_SOCIO_VALIDACION),
                        porcentajeParticipacion: { hasError: true, msn: "Solo se permiten números" }
                    }
                }));
                return;
            }

            // Validar rango (no permitir > 100)
            if (parseFloat(val) > 100) {
                return;
            }

            // Permitir máximo 2 decimales
            if (val.includes(".")) {
                const [intPart, decimalPart] = val.split(".");
                if (decimalPart.length > 2) {
                    val = `${intPart}.${decimalPart.substring(0, 2)}`;
                }
            }

            // Actualizar estado y limpiar error si es válido
            if (isSocio) {
                setState(prev => prev.map((socio, i) =>
                    i === index ? { ...socio, porcentaje: val } : socio
                ));
                setValidationMap(prev => ({
                    ...prev,
                    [index]: {
                        ...(prev[index] ?? INITIAL_SOCIO_VALIDACION),
                        porcentajeParticipacion: { hasError: false, msn: "" }
                    }
                }));
            }
        } else {
            // Campos normales: update simple + limpiar validación
            setState(prev => prev.map((socio, i) =>
                i === index ? { ...socio, [field]: value } : socio
            ));

            // Limpiar error si el campo tiene validación asociada
            const validationField = VALIDATION_FIELD_MAP[field];
            if (validationField) {
                setValidationMap(prev => ({
                    ...prev,
                    [index]: {
                        ...(prev[index] ?? INITIAL_SOCIO_VALIDACION),
                        [validationField]: { hasError: false, msn: '' }
                    }
                }));
            }
        }
    };

    const onSocioAdded = (socio: SocioData) => {
        setState(prev => [mapSocioToFormState(socio), ...prev]);
        setIsSocioMap(prev => {
            const shifted: Record<number, number> = { 0: 1 };
            Object.entries(prev).forEach(([key, val]) => { shifted[Number(key) + 1] = val; });
            return shifted;
        });
        setValidationMap(prev => {
            const shifted: Record<number, SocioValidacion> = {};
            Object.entries(prev).forEach(([key, val]) => { shifted[Number(key) + 1] = val; });
            return shifted;
        });
    };

    const onSocioRemoved = (removedIndex: number) => {
        setState(prev => prev.filter((_, i) => i !== removedIndex));
        setIsSocioMap(prev => {
            const result: Record<number, number> = {};
            Object.entries(prev).forEach(([key, val]) => {
                const k = Number(key);
                if (k < removedIndex) result[k] = val;
                else if (k > removedIndex) result[k - 1] = val;
            });
            return result;
        });
        setValidationMap(prev => {
            const result: Record<number, SocioValidacion> = {};
            Object.entries(prev).forEach(([key, val]) => {
                const k = Number(key);
                if (k < removedIndex) result[k] = val;
                else if (k > removedIndex) result[k - 1] = val;
            });
            return result;
        });
    };

    const validateSocios = useCallback((): boolean => {
        const currentState = stateRef.current;
        const currentIsSocioMap = isSocioMapRef.current;
        const newValidationMap: Record<number, SocioValidacion> = {};
        let isValid = true;

        currentState.forEach((socio, index) => {
            const isSocio = currentIsSocioMap[index] ?? 0;
            const errores: SocioValidacion = { ...INITIAL_SOCIO_VALIDACION };

            if (isSocio === 1) {
                if (!socio.porcentaje?.toString().trim()) {
                    errores.porcentajeParticipacion = { hasError: true, msn: 'El porcentaje es obligatorio' };
                    isValid = false;
                } else {
                    const pct = parseFloat(socio.porcentaje.toString());
                    if (isNaN(pct) || pct <= 0 || pct > 100) {
                        errores.porcentajeParticipacion = { hasError: true, msn: 'El porcentaje debe ser entre 1 y 100' };
                        isValid = false;
                    }
                }
            }

            if (!socio.documento?.trim()) {
                errores.numeroIdentificacion = { hasError: true, msn: 'El número de documento es obligatorio' };
                isValid = false;
            }

            if (!socio.nombre?.trim()) {
                errores.primerNombre = { hasError: true, msn: 'El nombre es obligatorio' };
                isValid = false;
            }
            if (!socio.apellido?.trim()) {
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
        isSocioMap,
        validationMap,
        setSocioParticipacion,
        handleSocioChange,
        onSocioAdded,
        onSocioRemoved,
        validateSocios,
        handleAddSocio,
        handleRemoveSocio,
    };
};
