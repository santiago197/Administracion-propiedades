import { MutableRefObject } from "react";
import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from 'react-i18next';
import UploadFile from "../../../../../../../assets/UploadFile.svg";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useCargarPdf } from "../hooks/useCargarPdf";
import { RUTData } from "../../../model";


const longitudCadena = 10;
const cadenaAleatoria = Math.random().toString(36).substring(2, 2 + longitudCadena);
interface CargarPdfProps {
    setUploadedFile: (file: File | null) => void;
    setFileUrl: (url: string | null) => void;
    setIsProcessing: (processing: boolean) => void;
    setShowResult: (show: boolean) => void;
    setRutData: (data: RUTData | null) => void;
    setProgresoOCR: (progreso: string) => void;
    abortControllerRef: MutableRefObject<AbortController | null>;
}

export const CargarPdf = ({ setUploadedFile, setFileUrl, setIsProcessing, setShowResult, setRutData, setProgresoOCR, abortControllerRef }: CargarPdfProps) => {
  const { handleChangeFile, handleDrop, handleDragOver } = useCargarPdf({ setUploadedFile, setFileUrl, setIsProcessing, setShowResult, setRutData, setProgresoOCR, abortControllerRef });
  const { t } = useTranslation(['gestion-proveedores']);
    return (
        <>
            {/* Contenido principal */}
            <Box width="100%" display="flex" flexDirection="column" gap={3}>
                {/* Área de drag & drop */}
                <Box
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    sx={{
                        borderStyle: "dashed",
                        borderColor: "grey.300",
                        borderWidth: 1,
                        borderRadius: 1,
                        width: "100%",
                        minHeight: 240,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        py: 4,
                        px: 3,
                        boxSizing: "border-box",
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover'
                        }
                    }}
                >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                        <img
                            src={UploadFile}
                            alt="Upload File"
                            style={{ width: 48, height: 48 }}
                        />
                        <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                            <Typography variant="body1" color="text.primary">
                                {t("gestion-proveedores:ocr-extraccion.cargarPdf.arrastrarAdjuntar")}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t("gestion-proveedores:ocr-extraccion.cargarPdf.formatoMaximo")}
                            </Typography>
                        </Box>
                    </Box>
                    <Button
                        size="medium"
                        variant="text"
                        color="primary"
                        startIcon={<AttachFileIcon />}
                        onClick={() => {
                            const input = document.getElementById(cadenaAleatoria) as HTMLInputElement;
                            if (input) {
                                input.click();
                            }
                        }}
                    >
                        {t("gestion-proveedores:ocr-extraccion.cargarPdf.adjuntar")}
                    </Button>
                </Box>

                
            </Box>
            {/* Input file oculto */}
            <input
                id={cadenaAleatoria}
                type="file"
                accept="application/pdf,.pdf"
                style={{ display: 'none' }}
                onChange={handleChangeFile}
            />
        </>
    )
}
