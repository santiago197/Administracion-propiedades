import { Alert, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export const AlertDatosExtraidosIA = ({ setIsOpenAlertIA }: { setIsOpenAlertIA: (open: boolean) => void }) => {
    const { t } = useTranslation('gestion-proveedores');
    return (
        <Alert
            severity="info"
            icon={<InfoOutlinedIcon />}
            sx={{ mb: 3 }}
            onClose={() => setIsOpenAlertIA(false)}
        >
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {t("ocr-extraccion.alertaDatosIA.titulo")}
            </Typography>
            <Typography variant="body2">
                {t("ocr-extraccion.alertaDatosIA.mensaje")}
            </Typography>

        </Alert>
    )
}
