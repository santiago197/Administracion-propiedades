import { Alert, Stack, Typography } from "@mui/material";
import { useTranslation } from 'react-i18next';
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export const AdvertenciaReemplazoDatos = () => {
  const { t } = useTranslation(['gestion-proveedores']);
  return (
    <Stack spacing={1.5}>
      <Alert severity="warning" icon={<WarningAmberIcon />} variant="outlined">
        <Typography variant="body2">
          {t("gestion-proveedores:ocr-extraccion.advertencias.reemplazoDatos")}
        </Typography>
      </Alert>
      <Alert severity="info" icon={<InfoOutlinedIcon />}>
        <Typography variant="body2">
          {t("gestion-proveedores:ocr-extraccion.advertencias.formatoPdf")}
        </Typography>
      </Alert>
    </Stack>
  );
};
