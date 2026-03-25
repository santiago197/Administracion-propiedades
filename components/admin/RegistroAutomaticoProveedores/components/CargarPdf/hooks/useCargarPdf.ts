import { ChangeEvent, DragEvent, MutableRefObject, useContext } from "react";
import { AlertContext, AuthContext } from "../../../../../../../context";
import { analizarRutLocal } from "../../../services/ocr/analizarRutLocal";
import { RUTData } from "../../../model";

const normalizarNit = (valor: string | null | undefined): string =>
    (valor ?? '').replace(/\D/g, '');

const normalizarTipoDocumento = (valor: string | null | undefined): string => {
    const v = (valor ?? '').toUpperCase().trim();
    if (v.includes('NIT') || v.includes('TRIBUTAR')) return 'NIT';
    if (v.includes('CIUDADAN') || v === 'CC') return 'CC';
    if (v.includes('EXTRANJERIA') || v.includes('EXTRANJER') || v === 'CE') return 'CE';
    if (v.includes('PASAPORTE') || v === 'PA') return 'PA';
    return v;
};

const normalizarTipoPersona = (valor: string | null | undefined): string => {
    const v = (valor ?? '').toLowerCase().trim();
    if (v === 'n' || v.includes('natural')) return 'N';
    if (v === 'j' || v.includes('jur')) return 'J';
    return v.toUpperCase();
};

interface UseCargarPdfProps {
    setUploadedFile: (file: File | null) => void;
    setFileUrl: (url: string | null) => void;
    setIsProcessing: (processing: boolean) => void;
    setShowResult: (show: boolean) => void;
    setRutData: (data: RUTData | null) => void;
    setProgresoOCR: (progreso: string) => void;
    abortControllerRef: MutableRefObject<AbortController | null>;
}
export const useCargarPdf = ({ setUploadedFile, setFileUrl, setIsProcessing, setShowResult, setRutData, setProgresoOCR, abortControllerRef }: UseCargarPdfProps) => {
    const { showAlert } = useContext(AlertContext);
    const { storeUsuario } = useContext(AuthContext);

    const handleChangeFile = async (value: ChangeEvent<HTMLInputElement> | null) => {
        if (value == null) return;
        const file = value.target.files?.[0];

        if (file) {
            // Validar que sea un archivo PDF
            if (file.type !== 'application/pdf') {

                showAlert("Solo se permiten archivos PDF", "Cargar Rut", "warning");
                return;
            }

            // Validar tamaño máximo (5MB)
            const MAX_SIZE = 5 * 1024 * 1024; // 5MB
            if (file.size > MAX_SIZE) {

                showAlert("El archivo no debe superar 5MB", "Cargar Rut", "warning");
                return;
            }



            // Crear URL del archivo para visualización
            const url = URL.createObjectURL(file);
            setUploadedFile(file);
            setFileUrl(url);
            setIsProcessing(true);
            setShowResult(false);


            // Llamar a la función local de análisis OCR
            try {
                // Crear nuevo AbortController para esta petición
                abortControllerRef.current = new AbortController();

                const response = await analizarRutLocal(
                    file,
                    abortControllerRef.current.signal,
                    (mensaje) => {
                        setProgresoOCR(mensaje);
                    }
                );
                if (response && response.success && response.data) {
                    console.log(response.data);
                    const nitDocumento = normalizarNit(response.data.data.header.nit);
                    const nitSesion = normalizarNit(storeUsuario.user.nit);
                    const tipoDocDocumento = normalizarTipoDocumento(response.data.data.identificacion?.tipoDocumento);
                    const tipoDocSesion = normalizarTipoDocumento(storeUsuario.user.tipoDocumento);
                    const tipoPersonaDocumento = normalizarTipoPersona(response.data.data.identificacion?.tipoContribuyente);
                    const tipoPersonaSesion = normalizarTipoPersona(storeUsuario.user.tipoPersona);

                    const camposNoCoinciden: string[] = [];
                    if (nitDocumento && nitSesion && nitDocumento !== nitSesion) camposNoCoinciden.push('Número documento');
                    if (tipoDocDocumento && tipoDocSesion && tipoDocDocumento !== tipoDocSesion) camposNoCoinciden.push('Tipo de documento');
                    if (tipoPersonaDocumento && tipoPersonaSesion && tipoPersonaDocumento !== tipoPersonaSesion) camposNoCoinciden.push('Tipo de persona');

                    if (camposNoCoinciden.length > 0) {
                        showAlert(
                            `El RUT adjuntado no corresponde al proveedor. Por favor verifique el: ${camposNoCoinciden.join(' • ')}`,
                            "RUT no válido",
                            "warning"
                        );
                        setUploadedFile(null);
                        if (url) URL.revokeObjectURL(url);
                        setFileUrl(null);
                        return;
                    }
                    setRutData(response.data.data);
                    setShowResult(true);
                } else if (response?.statusCode === 422) {
                    showAlert("El documento no corresponde a un RUT colombiano. Por favor, suba el formulario de Registro Único Tributario.", "Documento no reconocido como RUT", "warning");
                    setUploadedFile(null);
                    if (url) URL.revokeObjectURL(url);
                    setFileUrl(null);
                } else {

                    showAlert(
                        response?.message || "No se pudo procesar el RUT. Por favor, intente nuevamente.",
                        "Error al procesar RUT",
                        "error"
                    );
                    setUploadedFile(null);
                    if (url) URL.revokeObjectURL(url);
                    setFileUrl(null);
                }
            } catch (error: any) {
                // Si el error es por cancelación, no mostrar alerta
                if (error?.name === 'AbortError') {
                    return;
                }

                showAlert(
                    "Ocurrió un error inesperado al procesar el archivo. Por favor, intente nuevamente.",
                    "Error",
                    "error"
                );
                setUploadedFile(null);
                if (url) URL.revokeObjectURL(url);
                setFileUrl(null);
            } finally {
                setIsProcessing(false);
                setProgresoOCR(''); // Resetear progreso
                abortControllerRef.current = null;

            }
        }
    }
    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.dataTransfer.files.length > 0) {
            handleChangeFile({
                target: { files: event.dataTransfer.files },
            } as ChangeEvent<HTMLInputElement>);
        }
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };
    return {
        handleChangeFile,
        handleDragOver,
        handleDrop
    }
}