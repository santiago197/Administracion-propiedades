import { MutableRefObject } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material"
import { useTranslation } from 'react-i18next';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

interface DescartarDocumentoProps {
    openDiscardDialog: boolean;
    setOpenDiscardDialog: (open: boolean) => void;
    fileUrl: string | null;
    setFileUrl: (url: string | null) => void;
    setUploadedFile: (file: File | null) => void;
    setIsProcessing: (processing: boolean) => void;
    setShowResult: (show: boolean) => void;
    abortControllerRef: MutableRefObject<AbortController | null>;
}
export const DescartarDocumento = ({ openDiscardDialog, setOpenDiscardDialog, fileUrl, setFileUrl, setUploadedFile, setIsProcessing, setShowResult, abortControllerRef }: DescartarDocumentoProps) => {
    const { t } = useTranslation(['gestion-proveedores']);
    const handleCloseDiscardDialog = () => {
        setOpenDiscardDialog(false);
    };

    const handleDiscardDocument = () => {
        // Cancelar la petición si está en proceso
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (fileUrl) {
            URL.revokeObjectURL(fileUrl);
        }
        setUploadedFile(null);
        setFileUrl(null);
        setIsProcessing(false);
        setShowResult(false);
        setOpenDiscardDialog(false);
    };
    return (
        <>
            {/* Diálogo de confirmación para descartar documento */}
            <Dialog
                open={openDiscardDialog}
                onClose={handleCloseDiscardDialog}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        p: 1
                    }
                }
                }
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: 'warning.lighter',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                    >
                        <WarningAmberRoundedIcon sx={{ color: 'warning.main', fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" color="text.primary">
                        {t("gestion-proveedores:ocr-extraccion.descartarDocumento.titulo")}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        {t("gestion-proveedores:ocr-extraccion.descartarDocumento.mensaje")}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button
                        variant="text"
                        color="primary"
                        onClick={handleCloseDiscardDialog}
                    >
                        {t("gestion-proveedores:cancelar")}
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handleDiscardDocument}
                    >
                        {t("gestion-proveedores:ocr-extraccion.descartarDocumento.descartar")}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
