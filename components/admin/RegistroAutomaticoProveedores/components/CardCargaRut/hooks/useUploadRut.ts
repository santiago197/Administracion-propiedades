import { useEffect, useRef, useState, useContext } from "react";
import { FormularioExtraccionData, RUTData } from "../../../model";
import { mapFormularioToCamaraComercio, mapFormularioToInformacionGeneral } from "../../../utilities/mapFormularioToCamaraComercio";
import { mapFormularioToInfTributaria } from "../../../utilities/mapFormularioToInfTributaria";
import { guardarDatos, actualizarPeP, consultarDatosInfLegal } from "../../../../CamaraComercio/service/service.http";
import { guardarinfo } from "../../../../InformacionGeneral/services/services.http.infGeneral";
import { APiMethod, requestAPI, RequestModel, ResponseDTO } from "../../../../../../../Provider";
import { useStorePEP } from "../../../../../components/PEP/store/storePEP";
import { InfTributariaDTO } from "../../../../InformacionTributaria/model/InfTributariaDTO";
import { AlertContext } from "../../../../../../../context";

export const useUploadRut = () => {
    const { showAlert } = useContext(AlertContext);
    const statePep = useStorePEP((store) => store.store);
    const setStorePep = useStorePEP((store) => store.setStore);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [openDiscardDialog, setOpenDiscardDialog] = useState(false);
    const [rutData, setRutData] = useState<RUTData | null>(null);
    const [progresoOCR, setProgresoOCR] = useState<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);



    // Limpiar URL del archivo cuando se desmonte o cambie
    useEffect(() => {
        return () => {
            if (fileUrl) {
                URL.revokeObjectURL(fileUrl);
            }
        };
    }, [fileUrl]);


    const handleOpenDiscardDialog = () => {
        setOpenDiscardDialog(true);
    };


    const handleCancelResult = () => {
        if (fileUrl) {
            URL.revokeObjectURL(fileUrl);
        }
        setUploadedFile(null);
        setFileUrl(null);
        setShowResult(false);
    };

    const handleConfirmResult = async (data: FormularioExtraccionData): Promise<{ success: boolean; mensaje?: string }> => {
        
        
        // Validar socios con tipo de documento NIT
        const sociosNIT = data.socios.filter(s => s.tipoDocumento.toLowerCase() === 'nit' || s.tipoDocumento === 'NIT');
        for (const socio of sociosNIT) {
            if (!socio.documentoAdjunto?.adjunto?.id || socio.documentoAdjunto.adjunto.id === 0 || !socio.documentoAdjunto.adjunto.nombre) {
                showAlert("", "Pendiente adjunto socio jurídico", "warning");
                return { success: false, mensaje: "Pendiente adjunto socio jurídico" };
            }
        }

        // Preparar datos de información general (TercerosGI/GuardaInfGeneral)
        const informacionGeneral = mapFormularioToInformacionGeneral(data);

        // Preparar datos de cámara de comercio (TercerosGI/CamaraComercio)
        const registrosCamaraComercio = mapFormularioToCamaraComercio(data);

        // Preparar datos de información tributaria (TercerosGI/informaciontributaria)
        const informacionTributaria = mapFormularioToInfTributaria(data);

        // Guardar información general
        const responseInfoGeneral = await guardarinfo(informacionGeneral);
        
        // Si falla la información general, retornar error
        if (!responseInfoGeneral?.success) {
            return { 
                success: false, 
                mensaje: responseInfoGeneral?.mensaje || 'Error al guardar información general' 
            };
        }

        // Guardar registros de cámara de comercio
        for (const registro of registrosCamaraComercio) {
            await guardarDatos(registro);
        }

        // Guardar PEP solo para persona natural
        if (data.informacionGeneral.tipoContribuyente === 'Persona natural') {
            const datosCC = await consultarDatosInfLegal();
            if (datosCC.length > 0) {
                setStorePep({ ...statePep, id: datosCC[0].id });
            }
            const currentPep = useStorePEP.getState().store;
            await actualizarPeP(currentPep, currentPep.id);
        }

        // Verificar si la información tributaria está bloqueada antes de guardarla
        const tributariaActual = await requestAPI<InfTributariaDTO>({
            type: APiMethod.GET,
            metodo: 'TercerosGI/informaciontributaria',
        });
        const isTributariaBlocked = tributariaActual != null && tributariaActual.existente && (
            tributariaActual.granContribuyente || tributariaActual.autorretenedor ||
            tributariaActual.autoRetenedorICA || tributariaActual.granContribuyenteBta ||
            tributariaActual.autoretenedorRFT || tributariaActual.declarante ||
            tributariaActual.responsableIVA || tributariaActual.regimenSimple || tributariaActual.regimenEspecial
        );

        if (!isTributariaBlocked) {
            // Guardar información tributaria
            await guardarInfoTributaria(informacionTributaria);
        }

        // Guardar detalles ICA siempre que el usuario haya agregado alguno,
        // independiente del bloqueo tributario general
        const detallesICA = data.informacionTributaria.detallesICA || [];
        for (const detalle of detallesICA) {
            await guardarDetalleICA(detalle);
        }

        return { success: true };
    };

    const guardarInfoTributaria = async (infoTributaria: InfTributariaDTO) => {
        const request: RequestModel = {
            metodo: 'TercerosGI/informaciontributaria',
            type: APiMethod.POST,
            data: infoTributaria
        };

        const data = await requestAPI<ResponseDTO>(request);
        return data;
    };

    const guardarDetalleICA = async (detalle: { ciudad: { id: number; nombre: string } | null; actividadEconomica: { id: number; nombre: string; codigo?: string } | null }) => {
        if (!detalle.ciudad || !detalle.actividadEconomica) return;

        const detalleICAPost = {
            idIca: 0,
            ciudad: {
                id: detalle.ciudad.id,
                nombre: detalle.ciudad.nombre
            },
            actividadEconomica: {
                id: detalle.actividadEconomica.id,
                nombre: detalle.actividadEconomica.nombre,
                codigo: detalle.actividadEconomica.codigo || ''
            }
        };

        const request: RequestModel = {
            metodo: 'TercerosGI/RetencionICA',
            type: APiMethod.POST,
            data: detalleICAPost
        };

        const data = await requestAPI<ResponseDTO>(request);
        return data;
    };

    return {
        abortControllerRef,
        fileUrl,
        handleCancelResult,
        handleConfirmResult,
        handleOpenDiscardDialog,
        isProcessing,
        openDiscardDialog,
        progresoOCR,
        rutData,
        setFileUrl,
        setIsProcessing,
        setOpenDiscardDialog,
        setProgresoOCR,
        setRutData,
        setShowResult,
        setUploadedFile,
        showResult,
        uploadedFile,
    }
}