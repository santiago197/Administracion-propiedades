import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Box, Button, Chip, Collapse, Grid2, IconButton, Paper, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Drawer } from '@sinco/react';
import ElegirFormulario from '../../../CamaraComercio/components/elegirFormulario/view/ElegirFormulario';
import martilloImgLegal from '../../../../../../assets/martilloImgLegal.svg';
import porcentajeAccionista from '../../../../../../assets/porcentajeAccionista.svg';
import representanteLegal from '../../../../../../assets/representanteLegal.svg';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { FormularioExtraccionData, RUTData, convertirRUTAFormulario, INITIAL_FORMULARIO_EXTRACCION } from '../../model';
import { AlertDatosExtraidosIA } from "../Alerts/view/AlertDatosExtraidosIA";
import { InformacionLegal } from "./view/InformacionLegal";
import { VisualizadorDocumento } from "./view/VisualizadorDocumento";
import { Contador } from "./view/Contador";
import { Socios } from "./view/Socios";
import { RevisoresFiscales } from "./view/RevisoresFiscales";
import { InformacionTributaria } from "./view/InformacionTributaria";

import { ConfirmacionDatosProcesados } from "./view/ConfirmacionDatosProcesados";
import { EstadoProcesamiento } from "../Loader/EstadoProcesamiento";
import { AlertContext } from "../../../../../../context";
import { InformacionGeneral } from "./view/InformacionGeneral";
import { useResultadoExtraccion } from "./hooks/useResultadoExtraccion";

interface ResultadoExtraccionProps {
  fileName?: string;
  fileUrl?: string;
  rutData?: RUTData;
  onCancel?: () => void;
  onConfirm?: (data: FormularioExtraccionData) => Promise<{ success: boolean; mensaje?: string }>;
}

export const ResultadoExtraccion = ({
  fileName = "",
  fileUrl,
  rutData,
  onCancel,
  onConfirm
}: ResultadoExtraccionProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const heightOffset = isPhone ? '140px' : '160px';
  const { showAlert } = useContext(AlertContext);
  const { t } = useTranslation(['gestion-proveedores']);

  // Convertir datos del RUT al formulario
  const initialData = rutData ? convertirRUTAFormulario(rutData) : INITIAL_FORMULARIO_EXTRACCION;
  const [formData, setFormData] = useState<FormularioExtraccionData>(initialData);
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpenAlertIA, setIsOpenAlertIA] = useState(true);
  // Determinar si es persona natural
  const esPersonaNatural = formData.informacionGeneral.tipoContribuyente === '1' ||
    formData.informacionGeneral.tipoContribuyente.toLowerCase().includes('persona natural');

  const nombreProveedor = esPersonaNatural
    ? `${formData.informacionGeneral.primerNombre} ${formData.informacionGeneral.primerApellido}`.trim()
    : formData.informacionGeneral.razonSocial || '';

  useEffect(() => {
    if (rutData) {
      showAlert(t("gestion-proveedores:ocr-extraccion.alertas.extraccionCompletada.mensaje"), t("gestion-proveedores:ocr-extraccion.alertas.extraccionCompletada.titulo"), "success");
    }
  }, []);

  const {
    allExpanded,
    expandedSections,
    handleAccordionChange,
    handleRegisterContadorValidation,
    handleRegisterRepresentantesValidation,
    handleRegisterRevisoresValidation,
    handleRegisterSociosValidation,
    handleRegisterValidation,
    handleRegisterTributariaValidation,
    handleToggleAll,
    openSection,
    validateContadorRef,
    validateInfoGeneralRef,
    validateRepresentantesRef,
    validateRevisoresRef,
    validateSociosRef,
    validateTributariaRef,
    addRepresentanteRef,
    addSocioRef,
    addRevisorRef,
    addContadorRef,
    handleRegisterAddRepresentante,
    handleRegisterAddSocio,
    handleRegisterAddRevisor,
    handleRegisterAddContador,
  } = useResultadoExtraccion();

  const [openDrawerNuevo, setOpenDrawerNuevo] = useState(false);

  const refScrollContainer = useRef<HTMLDivElement>(null);
  const refRepresentantes = useRef<HTMLDivElement>(null);
  const refSocios = useRef<HTMLDivElement>(null);
  const refRevisores = useRef<HTMLDivElement>(null);
  const refContador = useRef<HTMLDivElement>(null);

  const handleNuevaFigura = (tipo: number) => {
    setOpenDrawerNuevo(false);
    openSection('informacionLegalContainer');

    const acciones: Record<number, { add: () => void; section: string; ref: React.RefObject<HTMLDivElement> }> = {
      1: { add: () => addRepresentanteRef.current?.(), section: 'informacionLegal', ref: refRepresentantes },
      2: { add: () => addSocioRef.current?.(), section: 'socios', ref: refSocios },
      3: { add: () => addRevisorRef.current?.(), section: 'revisoresFiscales', ref: refRevisores },
      4: { add: () => addContadorRef.current?.(), section: 'contador', ref: refContador },
    };

    const accion = acciones[tipo];
    if (!accion) return;

    accion.add();
    openSection(accion.section);
    setTimeout(() => {
      const container = refScrollContainer.current;
      const target = accion.ref.current;
      if (container && target) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        container.scrollTo({ top: targetRect.top - containerRect.top + container.scrollTop - 16, behavior: 'smooth' });
      }
    }, 500);
  };



  const handleConfirm = async () => {
    const isInfoGeneralValid = validateInfoGeneralRef.current?.() ?? true;
    const isTributariaValid = validateTributariaRef.current?.() ?? true;
    const isSociosValid = validateSociosRef.current?.() ?? true;
    const isRevisoresValid = validateRevisoresRef.current?.() ?? true;
    const isRepresentantesValid = validateRepresentantesRef.current?.() ?? true;
    const isContadorValid = validateContadorRef.current?.() ?? true;

    if (!isInfoGeneralValid) openSection('informacionGeneral');
    if (!isTributariaValid) openSection('tributaria');
    if (!isSociosValid) openSection('socios');
    if (!isRevisoresValid) openSection('revisoresFiscales');
    if (!isRepresentantesValid) openSection('informacionLegal');
    if (!isContadorValid) openSection('contador');
    if (!isInfoGeneralValid || !isTributariaValid || !isSociosValid || !isRevisoresValid || !isRepresentantesValid || !isContadorValid) return;
    setIsProcessing(true);
    try {
      if (onConfirm) {
        const result = await onConfirm(formData);

        // Si hay error, mostrar alerta y no continuar
        if (!result.success) {
          showAlert(result.mensaje || t("gestion-proveedores:ocr-extraccion.alertas.errorGuardar"), 'Error', 'error');
          return;
        }

        // Solo avanzar si fue exitoso
        setShowConfirmacion(true);
      }
    } catch (error) {
      showAlert(t("gestion-proveedores:ocr-extraccion.alertas.errorInesperado"), 'Error', 'error');
    } finally {
      setIsProcessing(false);
    }
  };


  if (isProcessing) {
    return (
      <EstadoProcesamiento
        titulo={t("gestion-proveedores:ocr-extraccion.procesamiento.titulo")}
        subtitulo={t("gestion-proveedores:ocr-extraccion.procesamiento.subtitulo")}
        mensaje={t("gestion-proveedores:ocr-extraccion.procesamiento.mensaje")}
      />
    );
  }

  if (showConfirmacion) {
    return (
      <ConfirmacionDatosProcesados
        fileName={fileName}
        nombreProveedor={nombreProveedor}
      />
    );
  }

  return (
    <Grid2 container spacing={2} p={0} sx={{ height: `calc(100vh - ${heightOffset})`, overflow: 'hidden' }}>
      {/* Columna izquierda - Visualizador de documento */}
      {!isMobile && (
        <Grid2 size={{ xs: 12, lg: 6 }} >
          <VisualizadorDocumento fileName={fileName} fileUrl={fileUrl} />
        </Grid2>
      )}

      {/* Columna derecha - Formulario de datos extraídos */}
      <Grid2 size={{ xs: 12, lg: isMobile ? 12 : 6 }} sx={{ height: `calc(100vh - ${heightOffset})` }}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header - FIJO */}
          <Box sx={{ flexShrink: 0 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ backgroundColor: 'background.default', px: 1.2, py: 1, borderRadius: 1 }}>
              <Typography variant="body2" color="text.primary">
                {t("gestion-proveedores:ocr-extraccion.resultadoExtraccion")}
              </Typography>
              {/* {onCancel && (
                <IconButton size="small" onClick={onCancel}>
                  <CloseIcon />
                </IconButton>
              )} */}
              <Chip
                icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                label={t("gestion-proveedores:ocr-extraccion.chips.extraidoConIA")}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 24 }}
              />
            </Box>
            <Box display="flex" alignItems="center" gap={1} mb={1} justifyContent="space-between">
              <Typography variant="subtitle2" color="text.primary">
                {fileName}
              </Typography>

            </Box>

            {/* Alert de información */}
            {isOpenAlertIA && (
              <AlertDatosExtraidosIA setIsOpenAlertIA={setIsOpenAlertIA} />
            )}

            {/* Botón de expandir/colapsar - FIJO */}
            <Box display="flex" justifyContent="flex-end" mt={1} sx={{ pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Button
                variant="text"
                size="small"
                startIcon={allExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
                onClick={handleToggleAll}
                sx={{ textTransform: 'none' }}
              >
                {allExpanded ? t("gestion-proveedores:contraerTodos") : t("gestion-proveedores:expandirTodos")}
              </Button>
            </Box>
          </Box>

          {/* Formulario con secciones - CON SCROLL */}
          <Box ref={refScrollContainer} sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Stack spacing={2}>
              {/* Sección 1: Información General */}

              <InformacionGeneral formData={formData} handleAccordionChange={handleAccordionChange} expandedSections={expandedSections} setFormData={setFormData} onRegisterValidation={handleRegisterValidation} />

              {/* Sección 2: Información Tributaria */}
              <InformacionTributaria formData={formData} expandedSections={expandedSections} handleAccordionChange={handleAccordionChange} setFormData={setFormData} onRegisterValidation={handleRegisterTributariaValidation} />

              {/* Sección 3: Información Legal - Solo para persona jurídica */}
              {!esPersonaNatural && (
                <Paper
                  elevation={0}
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    overflow: 'hidden'
                  }}
                >
                  {/* Header del contenedor Información Legal */}
                  <Box
                    onClick={handleAccordionChange('informacionLegalContainer')}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      cursor: 'pointer',
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h6" color="primary.main">
                        {t("gestion-proveedores:sections.informacionLegal")}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon fontSize="small" />}
                        onClick={() => setOpenDrawerNuevo(true)}
                      >
                        {t("gestion-proveedores:nuevo")}
                      </Button>
                      <IconButton
                        size="small"
                        onClick={handleAccordionChange('informacionLegalContainer')}
                        sx={{
                          transform: expandedSections.has('informacionLegalContainer') ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s'
                        }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Contenedor de subsecciones */}
                  <Collapse in={expandedSections.has('informacionLegalContainer')}>
                    <Stack spacing={2} sx={{ p: 0, pt: 0 }}>
                      {/* Subsección: Representantes Legales */}
                      <Paper
                        ref={refRepresentantes}
                        elevation={0}
                        sx={{
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          onClick={handleAccordionChange('informacionLegal')}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.selected'
                            }
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">{t("gestion-proveedores:info-legal.estados.representantesLegales")}</Typography>
                          </Box>
                          <IconButton
                            size="small"
                            sx={{
                              transform: expandedSections.has('informacionLegal') ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s'
                            }}
                          >
                            <ExpandMoreIcon />
                          </IconButton>
                        </Box>
                        <Collapse in={expandedSections.has('informacionLegal')}>
                          <Box sx={{ p: isMobile ? 1 : 2, pt: 0 }}>
                            <InformacionLegal formData={formData} setFormData={setFormData} onRegisterValidation={handleRegisterRepresentantesValidation} onRegisterAdd={handleRegisterAddRepresentante} />
                          </Box>
                        </Collapse>
                      </Paper>

                      {/* Subsección: Socios */}
                      <Paper
                        ref={refSocios}
                        elevation={0}
                        sx={{
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          onClick={handleAccordionChange('socios')}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.selected'
                            }
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">{t("gestion-proveedores:info-legal.estados.socios")}</Typography>
                          </Box>
                          <IconButton
                            size="small"
                            sx={{
                              transform: expandedSections.has('socios') ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s'
                            }}
                          >
                            <ExpandMoreIcon />
                          </IconButton>
                        </Box>
                        <Collapse in={expandedSections.has('socios')}>
                          <Box sx={{ p: isMobile ? 0 : 2, pt: 0 }}>
                            <Socios socios={formData.socios} setFormData={setFormData} expandedSections={expandedSections} onRegisterValidation={handleRegisterSociosValidation} onRegisterAdd={handleRegisterAddSocio} />
                          </Box>
                        </Collapse>
                      </Paper>

                      {/* Subsección: Revisores Fiscales */}
                      <Paper
                        ref={refRevisores}
                        elevation={0}
                        sx={{
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          onClick={handleAccordionChange('revisoresFiscales')}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.selected'
                            }
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">{t("gestion-proveedores:info-legal.estados.revisoresFiscales")}</Typography>
                          </Box>
                          <IconButton
                            size="small"
                            sx={{
                              transform: expandedSections.has('revisoresFiscales') ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s'
                            }}
                          >
                            <ExpandMoreIcon />
                          </IconButton>
                        </Box>
                        <Collapse in={expandedSections.has('revisoresFiscales')}>
                          <Box sx={{ p: 0, pt: 0 }}>
                            <RevisoresFiscales
                              formData={formData}
                              setFormData={setFormData}
                              onRegisterValidation={handleRegisterRevisoresValidation}
                              onRegisterAdd={handleRegisterAddRevisor}
                            />
                          </Box>
                        </Collapse>
                      </Paper>

                      {/* Subsección: Contador */}
                      <Paper
                        ref={refContador}
                        elevation={0}
                        sx={{
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          onClick={handleAccordionChange('contador')}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            cursor: 'pointer',

                            '&:hover': {
                              bgcolor: 'action.selected'
                            }
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">{t("gestion-proveedores:info-legal.estados.contador")}</Typography>
                          </Box>
                          <IconButton
                            size="small"
                            sx={{
                              transform: expandedSections.has('contador') ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s'
                            }}
                          >
                            <ExpandMoreIcon />
                          </IconButton>
                        </Box>
                        <Collapse in={expandedSections.has('contador')}>
                          <Box sx={{ p: 2, pt: 0 }}>
                            <Contador contador={formData.contador} setFormData={setFormData} onRegisterValidation={handleRegisterContadorValidation} onRegisterAdd={handleRegisterAddContador} />
                          </Box>
                        </Collapse>
                      </Paper>
                    </Stack>
                  </Collapse>
                </Paper>
              )}

            </Stack>
          </Box>

          {/* Botones de acción - FIJO */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.5,
              pt: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
              flexShrink: 0
            }}
          >
            <Button
              variant="text"
              color="primary"
              onClick={onCancel}
            >
              {t("gestion-proveedores:cancelar")}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleConfirm}
            >
              {t("gestion-proveedores:continuar")}
            </Button>
          </Box>
        </Box>
      </Grid2>
      <Drawer
        anchorActions='flex-end'
        anchor="right"
        showActions={true}
        open={openDrawerNuevo}
        headerColor='#e6eff0'
        color='black'
        onClose={() => setOpenDrawerNuevo(false)}
        title={t("gestion-proveedores:info-legal.drawer.tituloDrawer")}
        width={isMobile ? '100vw' : '635px'}
      >
        <Box display={'flex'} flexDirection={'column'} gap={2} justifyContent={`center`} alignItems={`center`} height={`100%`} p={isMobile ? 1 : 2} >
          <Typography variant={isMobile ? 'body1' : 'h6'} textAlign={'center'}>{t('info-legal.drawer.titulo')}</Typography>
          <Grid2 container spacing={isMobile ? 2 : 3} sx={{
            justifyContent: "center",
            alignItems: "center",
          }}>
            <Grid2 size={{ xs: 12, sm: 6, md: 5 }}>
              <ElegirFormulario img={martilloImgLegal} title={t("gestion-proveedores:info-legal.estados.representantesLegales")} onClick={() => handleNuevaFigura(1)} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 5 }} >
              <ElegirFormulario img={porcentajeAccionista} title={t("gestion-proveedores:info-legal.estados.socios")} onClick={() => handleNuevaFigura(2)} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 5 }}>
              <ElegirFormulario img={representanteLegal} title={t("gestion-proveedores:info-legal.drawer.revisorFiscal")} onClick={() => handleNuevaFigura(3)} />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6, md: 5 }}>
              <ElegirFormulario img={martilloImgLegal} title={t("gestion-proveedores:info-legal.estados.contador")} onClick={() => handleNuevaFigura(4)} />
            </Grid2>
          </Grid2>
        </Box>
      </Drawer>
    </Grid2>
  )
}
