import { PaisesDTO } from "../../../../InformacionGeneral/Model/paisDTO";
import { ActividadEconomicaDTO, CiudadesDTO } from "../../../../InformacionGeneral/Model";
import { FormularioExtraccionData } from "../../../model";
import { useCallback, useEffect, useRef, useState } from "react";
import { APiMethod, requestAPIAxios } from "../../../../../../../Provider";
import { Validationforms } from "../../../../../../../Helper/ValidationForms";

interface ValidationField {
    hasError: boolean;
    msn: string;
}

export interface InformacionGeneralValidation {
    razonSocial: ValidationField;
    primerNombre: ValidationField;
    primerApellido: ValidationField;
    ciudad: ValidationField;
    direccion: ValidationField;
    correo: ValidationField;
    telefono: ValidationField;
    actividadPrincipal: ValidationField;
}

const INITIAL_VALIDATION: InformacionGeneralValidation = {
    razonSocial: { hasError: false, msn: '' },
    primerNombre: { hasError: false, msn: '' },
    primerApellido: { hasError: false, msn: '' },
    ciudad: { hasError: false, msn: '' },
    direccion: { hasError: false, msn: '' },
    correo: { hasError: false, msn: '' },
    telefono: { hasError: false, msn: '' },
    actividadPrincipal: { hasError: false, msn: '' },
};

interface useInformacionGeneralProps {
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
    formData: FormularioExtraccionData;
}

export const useInformacionGeneral = ({ setFormData, formData }: useInformacionGeneralProps) => {
    const [validation, setValidation] = useState<InformacionGeneralValidation>(INITIAL_VALIDATION);

    // Ref para que validateForm acceda siempre al formData más reciente sin recrearse
    const formDataRef = useRef(formData);
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    const handlePaisSelect = <Selected>(value: Selected) => {
        if ((value as PaisesDTO).id == undefined) {
            setFormData(prev => ({
                ...prev,
                informacionGeneral: {
                    ...prev.informacionGeneral,
                    pais: {
                        id: 0,
                        nombre: '',
                        sigla: ''
                    }
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                informacionGeneral: {
                    ...prev.informacionGeneral,
                    pais: (value as PaisesDTO)
                }
            }));
        }
    };

    const handleCiudadSelect = <Selected>(value: Selected) => {
        if ((value as CiudadesDTO).id == undefined) {
            setFormData(prev => ({
                ...prev,
                informacionGeneral: {
                    ...prev.informacionGeneral,
                    ciudad: {
                        id: 0,
                        nombre: ''
                    }
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                informacionGeneral: {
                    ...prev.informacionGeneral,
                    ciudad: (value as CiudadesDTO)
                }
            }));
            setValidation(prev => ({ ...prev, ciudad: { hasError: false, msn: '' } }));
        }
    };

    const handleInputChangeGeneral = (field: keyof FormularioExtraccionData['informacionGeneral'], value: string) => {
        setFormData(prev => ({
            ...prev,
            informacionGeneral: {
                ...prev.informacionGeneral,
                [field]: value
            } as FormularioExtraccionData['informacionGeneral']
        }));
        if (field in INITIAL_VALIDATION) {
            setValidation(prev => ({ ...prev, [field]: { hasError: false, msn: '' } }));
        }
    };

    const handleActividadSelect = <Selected>(value: Selected) => {
        if ((value as ActividadEconomicaDTO).id == undefined) {
            setFormData(prev => ({
                ...prev,
                informacionGeneral: {
                    ...prev.informacionGeneral,
                    actividadPrincipal: {
                        id: 0,
                        codigo: '',
                        nombre: ''
                    }
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                informacionGeneral: {
                    ...prev.informacionGeneral,
                    actividadPrincipal: (value as ActividadEconomicaDTO)
                }
            }));
            setValidation(prev => ({ ...prev, actividadPrincipal: { hasError: false, msn: '' } }));
        }
    };

    const validateForm = useCallback((): boolean => {
        const {
            tipoContribuyente,
            razonSocial,
            primerNombre,
            primerApellido,
            ciudad,
            direccion,
            correo,
            telefono,
            actividadPrincipal
        } = formDataRef.current.informacionGeneral;

        const _validationForms = new Validationforms();
        const esPersonaJuridica = tipoContribuyente === 'Persona jurídica';
        const errores: InformacionGeneralValidation = { ...INITIAL_VALIDATION };
        let isValid = true;

        if (esPersonaJuridica) {
            if (!razonSocial?.trim()) {
                errores.razonSocial = { hasError: true, msn: 'La razón social es obligatoria' };
                isValid = false;
            }
        } else {
            if (!primerNombre?.trim()) {
                errores.primerNombre = { hasError: true, msn: 'Los nombres son obligatorios' };
                isValid = false;
            }
            if (!primerApellido?.trim()) {
                errores.primerApellido = { hasError: true, msn: 'Los apellidos son obligatorios' };
                isValid = false;
            }
        }

        if (!ciudad?.id || ciudad.id === 0) {
            errores.ciudad = { hasError: true, msn: 'La ciudad es obligatoria' };
            isValid = false;
        }

        if (!direccion?.trim()) {
            errores.direccion = { hasError: true, msn: 'La dirección es obligatoria' };
            isValid = false;
        }

        if (!correo?.trim()) {
            errores.correo = { hasError: true, msn: 'El correo es obligatorio' };
            isValid = false;
        } else if (!_validationForms.EmailIsValid(correo)) {
            errores.correo = { hasError: true, msn: 'El correo ingresado no es válido' };
            isValid = false;
        }

        if (!telefono?.trim()) {
            errores.telefono = { hasError: true, msn: 'El celular es obligatorio' };
            isValid = false;
        } else if (!_validationForms.OnlyInteger(telefono) || !_validationForms.PhoneValid(telefono)) {
            errores.telefono = { hasError: true, msn: 'El celular ingresado no es válido' };
            isValid = false;
        }

        if (!actividadPrincipal?.id || actividadPrincipal.id === 0) {
            errores.actividadPrincipal = { hasError: true, msn: 'La actividad económica es obligatoria' };
            isValid = false;
        }

        setValidation(errores);
        return isValid;
    }, []);

    useEffect(() => {
        const normalize = (str: string) =>
            str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

        const buscarDatosOCR = async () => {
            const paisNombre = formData.informacionGeneral.pais?.nombre;
            const ciudadNombre = formData.informacionGeneral.ciudad?.nombre;
            const actividadNombre = formData.informacionGeneral.actividadPrincipal?.nombre;

            const [paisResult, ciudadResult, actividadResult] = await Promise.all([
                paisNombre
                    ? requestAPIAxios<{ id: number; nombre: string; sigla?: string }[]>({
                        metodo: `Pais?filter=${normalize(paisNombre)}`,
                        AllowAnonymous: false,
                        type: APiMethod.GET,
                    })
                    : Promise.resolve(null),
                ciudadNombre
                    ? requestAPIAxios<{ id: number; nombre: string }[]>({
                        metodo: `Ciudad?filter=${normalize(ciudadNombre).replace(/\s+d\.?\s*c\.?\s*$/i, '').trim()}`,
                        AllowAnonymous: false,
                        type: APiMethod.GET,
                    })
                    : Promise.resolve(null),
                actividadNombre
                    ? requestAPIAxios<{ id: number; nombre: string; codigo: string }[]>({
                        metodo: `ActividadEconomica?filter=${normalize(actividadNombre)}`,
                        AllowAnonymous: false,
                        type: APiMethod.GET,
                    })
                    : Promise.resolve(null),
            ]);

            setFormData(prev => ({
                ...prev,
                informacionGeneral: {
                    ...prev.informacionGeneral,
                    ...(paisResult?.[0] && {
                        pais: { id: paisResult[0].id, nombre: paisResult[0].nombre, sigla: paisResult[0].sigla ?? '' }
                    }),
                    ...(ciudadResult?.[0] && {
                        ciudad: { id: ciudadResult[0].id, nombre: ciudadResult[0].nombre }
                    }),
                    ...(actividadResult?.[0] && {
                        actividadPrincipal: { id: actividadResult[0].id, nombre: actividadResult[0].nombre, codigo: actividadResult[0].codigo }
                    }),
                }
            }));
        };

        buscarDatosOCR();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const handleCertificadoISO = (value: boolean) => {
        setFormData(prev => ({
            ...prev,
            informacionGeneral: {
                ...prev.informacionGeneral,
                certificadoISO: value
            }
        }));
    };

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    return {
        handleCiudadSelect,
        handlePaisSelect,
        handleActividadSelect,
        handleInputChangeGeneral,
        handleCertificadoISO,
        validation,
        validateForm,
        anchorEl,
        handlePopoverOpen,
        handlePopoverClose,
        open
    }
}
