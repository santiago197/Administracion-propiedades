import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useTranslation } from 'react-i18next';
import ScanDoc from "../../../../../../assets/ScanDoc.svg";

export const CardHeaderRegistroProv = () => {
  const { t } = useTranslation(['gestion-proveedores']);
  return (
    <Box
      position="sticky"
      top="-16px"
      zIndex={2}
      bgcolor="white"
      display="flex"
      gap={1.5}
      alignItems="center"
      width="100%"
      mb={3}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'primary.lighter',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <img
          src={ScanDoc}
          alt="Scan document"
          style={{ width: 32, height: 32 }}
        />
      </Box>
      <Stack spacing={0.5} width="100%">

        <Box>
          <Typography variant="h6" fontWeight="bold" color="text.secondary">
            {t("gestion-proveedores:ocr-extraccion.cardHeader.descripcion")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("gestion-proveedores:ocr-extraccion.cargarPdf.descripcion")}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}
