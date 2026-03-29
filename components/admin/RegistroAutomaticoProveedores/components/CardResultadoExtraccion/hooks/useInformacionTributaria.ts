import { useState, useEffect, useCallback, useRef } from "react";
import { DetalleICA, FormularioExtraccionData, InformacionTributariaData, InformacionTributaria as InfoTributaria, } from "../../../model";

import { InfTributariaDTO } from "../../../../InformacionTributaria/model/InfTributariaDTO";
import { APiMethod, requestAPIAxios } from "../../../../../../../Provider";

interface ValidationField {
    hasError: boolean;
    msn: string;
}

interface TributariaValidation {
    resolucionGC: ValidationField;
    fechaGC: ValidationField;
    resolucionAutoRete: ValidationField;
    fechaAutoRete: ValidationField;
    ciudadICA: ValidationField;
    actividadICA: ValidationField;
}

const INITIAL_TRIBUTARIA_VALIDATION: TributariaValidation = {
    resolucionGC: { hasError: false, msn: '' },
    fechaGC: { hasError: false, msn: '' },
    resolucionAutoRete: { hasError: false, msn: '' },
    fechaAutoRete: { hasError: false, msn: '' },
    ciudadICA: { hasError: false, msn: '' },
    actividadICA: { hasError: false, msn: '' },
};

interface InformacionTributariaProps {
    formData: FormularioExtraccionData;
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
}

export const useInformacionTributaria = ({ formData, setFormData }: InformacionTributariaProps) => {
    const formDataRef = useRef(formData);
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    const [validation, setValidation] = useState<TributariaValidation>(INITIAL_TRIBUTARIA_VALIDATION);
    const [existente, setExistente] = useState(false);
    const [sinDatos, setSinDatos] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const data = await requestAPIAxios<InfTributariaDTO>({
                type: APiMethod.GET,
                metodo: 'TercerosGI/informaciontributaria',
            });
            if (data) {
                const vacio = !data.granContribuyente && !data.autorretenedor &&
                    !data.autoRetenedorICA && !data.granContribuyenteBta &&
                    !data.autoretenedorRFT && !data.declarante &&
                    !data.responsableIVA && !data.regimenSimple && !data.regimenEspecial;
                setExistente(data.existente);
                setSinDatos(vacio);
            }
        };
        fetchData();
    }, []);

    const isBlocked = existente && !sinDatos;

    // Estado para detalles ICA
    const [detallesICA, setDetallesICA] = useState<DetalleICA[]>(
        formData.informacionTributaria?.detallesICA || []
    );
    const [showFormICA, setShowFormICA] = useState(false);
    const [ciudadSeleccionada, setCiudadSeleccionada] = useState<{ id: number; nombre: string } | null>(null);
    const [actividadSeleccionada, setActividadSeleccionada] = useState<{ id: number; nombre: string; codigo?: string } | null>(null);

    const showFormICARef = useRef(showFormICA);
    const ciudadSeleccionadaRef = useRef(ciudadSeleccionada);
    const actividadSeleccionadaRef = useRef(actividadSeleccionada);
    useEffect(() => { showFormICARef.current = showFormICA; }, [showFormICA]);
    useEffect(() => { ciudadSeleccionadaRef.current = ciudadSeleccionada; }, [ciudadSeleccionada]);
    useEffect(() => { actividadSeleccionadaRef.current = actividadSeleccionada; }, [actividadSeleccionada]);

    const handleAgregarDetalleICA = () => {
        if (ciudadSeleccionada && actividadSeleccionada) {
            const nuevoDetalle: DetalleICA = {
                ciudad: ciudadSeleccionada,
                actividadEconomica: actividadSeleccionada
            };
            const nuevosDetalles = [...detallesICA, nuevoDetalle];
            setDetallesICA(nuevosDetalles);
            // Sincronizar con formData
            setFormData((prev: any) => ({
                ...prev,
                informacionTributaria: {
                    ...prev.informacionTributaria,
                    detallesICA: nuevosDetalles
                }
            }));
            // Limpiar selecciones
            setCiudadSeleccionada(null);
            setActividadSeleccionada(null);
            setShowFormICA(false);
        }
    };

    const handleEliminarDetalleICA = (index: number) => {
        const nuevosDetalles = detallesICA.filter((_, i) => i !== index);
        setDetallesICA(nuevosDetalles);
        // Sincronizar con formData
        setFormData((prev: any) => ({
            ...prev,
            informacionTributaria: {
                ...prev.informacionTributaria,
                detallesICA: nuevosDetalles
            }
        }));
    };

    const handleCheckChange = (field: keyof InformacionTributariaData) => {
        setFormData((prev: any) => ({
            ...prev,
            informacionTributaria: {
                ...prev.informacionTributaria,
                [field]: !prev.informacionTributaria?.[field]
            }
        }));
    };

    const handleTextChange = (field: keyof InformacionTributariaData, value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            informacionTributaria: {
                ...prev.informacionTributaria,
                [field]: value
            }
        }));
        if (field in INITIAL_TRIBUTARIA_VALIDATION) {
            setValidation(prev => ({ ...prev, [field]: { hasError: false, msn: '' } }));
        }
    };

    const handleDateChange = (field: keyof InformacionTributariaData, value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            informacionTributaria: {
                ...prev.informacionTributaria,
                [field]: value ? new Date(value) : null
            }
        }));
        if (field in INITIAL_TRIBUTARIA_VALIDATION) {
            setValidation(prev => ({ ...prev, [field]: { hasError: false, msn: '' } }));
        }
    };

    const handleCiudadICASelect = (value: { id: number; nombre: string } | null) => {
        setCiudadSeleccionada(value);
        if (value) setValidation(prev => ({ ...prev, ciudadICA: { hasError: false, msn: '' } }));
    };

    const handleActividadICASelect = (value: { id: number; nombre: string; codigo?: string } | null) => {
        setActividadSeleccionada(value);
        if (value) setValidation(prev => ({ ...prev, actividadICA: { hasError: false, msn: '' } }));
    };

    const validateForm = useCallback((): boolean => {
        const info = formDataRef.current.informacionTributaria;
        const errores: TributariaValidation = { ...INITIAL_TRIBUTARIA_VALIDATION };
        let isValid = true;

        if (info?.granContribuyente) {
            if (info.resolucionGC == 0) {
                errores.resolucionGC = { hasError: true, msn: 'El número de resolución es obligatorio' };
                isValid = false;
            }
            if (!info.fechaGC) {
                errores.fechaGC = { hasError: true, msn: 'La fecha resolución es obligatoria' };
                isValid = false;
            }
        }

        if (info?.autorretenedor) {
            if (info.resolucionAutoRete == 0) {
                errores.resolucionAutoRete = { hasError: true, msn: 'El número de resolución es obligatorio' };
                isValid = false;
            }
            if (!info.fechaAutoRete) {
                errores.fechaAutoRete = { hasError: true, msn: 'La fecha resolución es obligatoria' };
                isValid = false;
            }
        }

        if (info?.autoRetenedorICA && showFormICARef.current) {
            if (!ciudadSeleccionadaRef.current) {
                errores.ciudadICA = { hasError: true, msn: 'La ciudad es obligatoria' };
                isValid = false;
            }
            if (!actividadSeleccionadaRef.current) {
                errores.actividadICA = { hasError: true, msn: 'La actividad económica es obligatoria' };
                isValid = false;
            }
        }

        setValidation(errores);
        return isValid;
    }, []);


    const infoTributaria: InfoTributaria = formData.informacionTributaria ?? {} as InfoTributaria;

    // Contar checkboxes seleccionados

    const selectedCount = Object.values(infoTributaria).filter(Boolean).length;


    return {
        detallesICA,
        showFormICA,
        ciudadSeleccionada,
        actividadSeleccionada,
        selectedCount,
        handleAgregarDetalleICA,
        handleEliminarDetalleICA,
        handleCheckChange,
        handleTextChange,
        handleDateChange,
        handleCiudadICASelect,
        handleActividadICASelect,
        infoTributaria,
        setCiudadSeleccionada,
        setActividadSeleccionada,
        setShowFormICA,
        existente,
        sinDatos,
        isBlocked,
        validation,
        validateForm,
    }
}