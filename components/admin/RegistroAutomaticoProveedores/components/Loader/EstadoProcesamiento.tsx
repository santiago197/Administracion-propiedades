import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material"
import { useTranslation } from 'react-i18next';
import ScanDoc from "../../../../../../assets/ScanDoc.svg";

interface EstadoProcesamientoProps {
    titulo?: string;
    subtitulo?: string;
    mensaje?: string;
    progreso?: string;
    onCancel?: () => void;
}

export const EstadoProcesamiento = ({
    titulo,
    subtitulo,
    mensaje,
    progreso,
    onCancel
}: EstadoProcesamientoProps) => {
    const { t } = useTranslation(['gestion-proveedores']);
    const tituloFinal = titulo ?? t("gestion-proveedores:ocr-extraccion.procesamientoOCR.titulo");
    const subtituloFinal = subtitulo ?? t("gestion-proveedores:ocr-extraccion.procesamientoOCR.subtitulo");
    const mensajeFinal = mensaje ?? t("gestion-proveedores:ocr-extraccion.procesamientoOCR.mensaje");
    return (
        <Box
            width="100%"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={6}
            gap={3}
        >
            {/* Icono circular */}
            <Box
                sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'primary.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <img
                    src={ScanDoc}
                    alt="Processing document"
                    style={{ width: 40, height: 40 }}
                />
            </Box>

            {/* Título y subtítulo */}
            <Stack spacing={0.5} alignItems="center">
                <Typography variant="h5" color="text.primary">
                    {tituloFinal}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {subtituloFinal}
                </Typography>
            </Stack>

            {/* Barra de progreso */}
            <Box width="100%" maxWidth={400}>
                <LinearProgress
                    sx={{
                        height: 6,
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 1,
                            bgcolor: 'primary.main'
                        }
                    }}
                />
            </Box>

            {/* Mensaje */}
            <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={500}>
                {mensajeFinal}
            </Typography>
            
            {/* Mensaje de progreso opcional */}
            {progreso && (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    {progreso}
                </Typography>
            )}

            {/* Botón Cancelar — solo si se pasa onCancel */}
            {onCancel && (
                <Button variant="text" color="primary" onClick={onCancel}>
                    {t("gestion-proveedores:cancelar")}
                </Button>
            )}
        </Box>
    );
}
