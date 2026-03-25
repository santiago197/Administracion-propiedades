import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Button, Stack, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { AlertContext } from "../../../../../../../context";
interface ConfirmacionDatosProcesadosProps {
  fileName: string;
  nombreProveedor: string;
}

export const ConfirmacionDatosProcesados = ({
  fileName,
  nombreProveedor,
}: ConfirmacionDatosProcesadosProps) => {
  const navigate = useNavigate();
  const { showAlert } = useContext(AlertContext);
  const { t } = useTranslation("gestion-proveedores");

  const handleVerPerfil = () => {
    showAlert(t("ocr-extraccion.confirmacion.alertaMensaje"), t("ocr-extraccion.confirmacion.alertaTitulo"), "info");
    navigate("/MiEmpresa/");
  };

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={3}
      sx={{ height: "100%", textAlign: "center", px: 4 }}
    >
      <CheckCircleOutlineIcon color="primary" sx={{ fontSize: 48 }} />

      <Typography variant="h6" color="text.primary">
        {t("ocr-extraccion.confirmacion.titulo")}
      </Typography>

      <Box display="flex" alignItems="center" gap={0.5}>
        <UploadFileIcon color="primary" sx={{ fontSize: 20 }} />
        <Typography variant="subtitle2" color="text.main">
          {fileName.toUpperCase()}
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary">
        {t("ocr-extraccion.confirmacion.descripcion")}
        <br />
        {t("ocr-extraccion.confirmacion.proveedorRegistrado", { nombre: nombreProveedor })}
        <br />
        {t("ocr-extraccion.confirmacion.recomendacion")}
      </Typography>

      <Button
        variant="contained"
        color="primary"
        endIcon={<ArrowForwardIcon />}
        onClick={handleVerPerfil}
      >
        {t("ocr-extraccion.confirmacion.verPerfil")}
      </Button>
    </Stack>
  );
};
