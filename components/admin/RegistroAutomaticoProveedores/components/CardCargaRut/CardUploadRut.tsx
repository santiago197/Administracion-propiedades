import { Grid2, Stack } from "@mui/material"


import { ResultadoExtraccion } from "../CardResultadoExtraccion/ResultadoExtraccion";
import { DescartarDocumento } from "../Dialog/view/DescartarDocumento";
import { CargarPdf } from "../CargarPdf/view/CargarPdf";
import { CardHeaderRegistroProv } from "../CardHeader/CardHeaderRegistroProv";
import { useUploadRut } from "./hooks/useUploadRut";
import { EstadoProcesamiento } from "../Loader/EstadoProcesamiento";
import { AdvertenciaReemplazoDatos } from "../Alerts/view/AdvertenciaReemplazoDatos";


export const CardUploadRut = () => {
  const {
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
  } = useUploadRut();
  // Si ya se procesó y hay resultado, mostrar ResultadoExtraccion
  if (showResult && uploadedFile && rutData) {
    return (
      <ResultadoExtraccion
        fileName={uploadedFile.name}
        fileUrl={fileUrl || undefined}
        rutData={rutData}
        onCancel={handleCancelResult}
        onConfirm={handleConfirmResult}
      />
    );
  }

  return (
    <Grid2 container spacing={2} sx={{ justifyContent: 'center', alignItems: 'center' }}>
      <Grid2 size={{ xs: 12, sm: 12, md: 10, lg: 9, xl: 9 }}>
        {!isProcessing ? (
          <Stack spacing={3}>
            <CardHeaderRegistroProv />
            <AdvertenciaReemplazoDatos />
            <CargarPdf
              setUploadedFile={setUploadedFile}
              setFileUrl={setFileUrl}
              setIsProcessing={setIsProcessing}
              setShowResult={setShowResult}
              setRutData={setRutData}
              setProgresoOCR={setProgresoOCR}
              abortControllerRef={abortControllerRef}
            />
          </Stack>
        ) : (
          <>
            <EstadoProcesamiento 
              progreso={progresoOCR} 
              onCancel={handleOpenDiscardDialog} 
            />
          </>
        )}

        <DescartarDocumento
          openDiscardDialog={openDiscardDialog}
          setOpenDiscardDialog={setOpenDiscardDialog}
          fileUrl={fileUrl}
          setFileUrl={setFileUrl}
          setUploadedFile={setUploadedFile}
          setIsProcessing={setIsProcessing}
          setShowResult={setShowResult}
          abortControllerRef={abortControllerRef}
        />
      </Grid2>
    </Grid2>
  )
}