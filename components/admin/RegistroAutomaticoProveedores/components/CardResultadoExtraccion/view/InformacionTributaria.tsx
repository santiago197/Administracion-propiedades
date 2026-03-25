import { Box, Button, Checkbox, Chip, Collapse, Divider, FormControlLabel, IconButton, Paper, Stack, TextField, Tooltip, Typography, useTheme } from "@mui/material"
import { useEffect } from "react";
import Grid from '@mui/material/Grid2';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { FormularioExtraccionData, ResponsabilidadItem } from '../../../model/OCRResponse.model';
import { Autocompleteasync } from "../../../../../../../SharedComponents/Autocomplete";
import { useInformacionTributaria } from "../hooks/useInformacionTributaria";
import { useTranslation } from 'react-i18next';
import { AlertWarning } from "../../../../../../../SharedComponents/AlertWarning/view/AlertWarning";


interface InformacionTributariaProps {
    formData: FormularioExtraccionData;
    expandedSections: Set<string>;
    handleAccordionChange: (section: string) => () => void;
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
    onRegisterValidation?: (fn: () => boolean) => void;
}

// Componente de Checkbox personalizado similar a ControlTributa
const CheckboxTributario = ({
    texto,
    checked,
    onChange,
    disabled
}: {
    texto: string | JSX.Element;
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}) => {
    return (
        <Box
            sx={{
                cursor: disabled ? 'default' : 'pointer',
                '&:hover': disabled ? {} : {
                    bgcolor: 'action.hover'
                }
            }}
            onClick={(e) => {
                e.preventDefault();
                if (!disabled) onChange();
            }}
        >
            <FormControlLabel
                sx={{
                    p: '0.5rem 1rem',
                    marginLeft: 0,
                    marginRight: 0,
                    width: '100%'
                }}
                control={
                    <Checkbox
                        tabIndex={-1}
                        checked={checked}
                        disableRipple
                        disabled={disabled}
                    />
                }
                label={<Typography variant='body2' color={disabled ? 'text.disabled' : undefined}>{texto}</Typography>}
            />
        </Box>
    );
};

export const InformacionTributaria = ({ formData, expandedSections, handleAccordionChange, setFormData, onRegisterValidation }: InformacionTributariaProps) => {
    const theme = useTheme();
    const { t } = useTranslation(['gestion-proveedores']);
    const { detallesICA,
        showFormICA,
        ciudadSeleccionada,
        actividadSeleccionada,
        handleAgregarDetalleICA,
        handleEliminarDetalleICA,
        handleCheckChange,
        handleTextChange,
        handleDateChange,
        handleCiudadICASelect,
        handleActividadICASelect,
        infoTributaria,
        setCiudadSeleccionada,
        setActividadSeleccionada,
        setShowFormICA,
        existente,
        sinDatos,
        isBlocked,
        validation,
        validateForm,
    } = useInformacionTributaria({ formData, setFormData });

    useEffect(() => {
        onRegisterValidation?.(validateForm);
    }, [onRegisterValidation, validateForm]);

    return (
        <Paper
            elevation={0}
            sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden'
            }}
        >
            <Box
                onClick={handleAccordionChange('tributaria')}
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
                        {t("gestion-proveedores:info-tributaria.encabezado.titulo")}
                    </Typography>
                    {/* <Chip label={selectedCount} size="small" /> */}
                </Box>
                <IconButton
                    size="small"
                    sx={{
                        transform: expandedSections.has('tributaria') ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s'
                    }}
                >
                    <ExpandMoreIcon />
                </IconButton>
            </Box>
            <Collapse in={expandedSections.has('tributaria')}>
                <Box sx={{ p: 2, pt: 0 }}>
                    <Stack spacing={2}>
                        {existente && (
                            <AlertWarning
                                status="warning"
                                mensaje={sinDatos
                                    ? t('gestion-proveedores:info-tributaria.alertas.warningSindata')
                                    : t('gestion-proveedores:info-tributaria.alertas.warningExtraccionRut')
                                }
                                open
                                titulo={t('gestion-proveedores:info-tributaria.encabezado.titulo')}
                            />
                        )}
                        {/* Responsabilidades extraídas del RUT */}
                        {formData.responsabilidadesTributarias?.length > 0 && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                    {t("gestion-proveedores:info-tributaria.adicionales.responsabilidadesExtraidasRut")}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {formData.responsabilidadesTributarias.map((item: ResponsabilidadItem) => (
                                        <Tooltip key={item.codigo} title={item.nombre} arrow>
                                            <Chip
                                                label={item.codigo}
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                            />
                                        </Tooltip>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Checkboxes tributarios */}
                        <Grid container spacing={0}>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <CheckboxTributario
                                    texto={t("gestion-proveedores:info-tributaria.checks.granContribuyenteBog")}
                                    checked={infoTributaria.granContribuyenteBta || false}
                                    onChange={() => handleCheckChange('granContribuyenteBta')}
                                    disabled={isBlocked}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <CheckboxTributario
                                    texto={t("gestion-proveedores:info-tributaria.checks.responsableIVA")}
                                    checked={infoTributaria.responsableIVA || false}
                                    onChange={() => handleCheckChange('responsableIVA')}
                                    disabled={isBlocked}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <CheckboxTributario
                                    texto={t("gestion-proveedores:info-tributaria.checks.regimenSimple")}
                                    checked={infoTributaria.regimenSimple || false}
                                    onChange={() => handleCheckChange('regimenSimple')}
                                    disabled={isBlocked}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <CheckboxTributario
                                    texto={t("gestion-proveedores:info-tributaria.checks.regimenEspecial")}
                                    checked={infoTributaria.regimenEspecial || false}
                                    onChange={() => handleCheckChange('regimenEspecial')}
                                    disabled={isBlocked}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <CheckboxTributario
                                    texto={t("gestion-proveedores:info-tributaria.checks.obligadoAFacturar")}
                                    checked={infoTributaria.noObligFacturar || false}
                                    onChange={() => handleCheckChange('noObligFacturar')}
                                    disabled={isBlocked}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <CheckboxTributario
                                    texto={t("gestion-proveedores:info-tributaria.checks.excentoDeRetencionFuente")}
                                    checked={infoTributaria.exentoRetencionFuente || false}
                                    onChange={() => handleCheckChange('exentoRetencionFuente')}
                                    disabled={isBlocked}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <CheckboxTributario
                                    texto={t("gestion-proveedores:info-tributaria.checks.descuentoSenaFic")}
                                    checked={infoTributaria.descuentoSENAFIC || false}
                                    onChange={() => handleCheckChange('descuentoSENAFIC')}
                                    disabled={isBlocked}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <CheckboxTributario
                                    texto={t("gestion-proveedores:info-tributaria.checks.declaranteRenta")}
                                    checked={infoTributaria.declarante || false}
                                    onChange={() => handleCheckChange('declarante')}
                                    disabled={isBlocked}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <CheckboxTributario
                                    texto={t("gestion-proveedores:info-tributaria.checks.profesionalIndependiente")}
                                    checked={infoTributaria.profesionalIndependiente || false}
                                    onChange={() => handleCheckChange('profesionalIndependiente')}
                                    disabled={isBlocked}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <CheckboxTributario
                                    texto={t("gestion-proveedores:info-tributaria.checks.agenteRetedorIva")}
                                    checked={infoTributaria.agenteRetenedorIVA || false}
                                    onChange={() => handleCheckChange('agenteRetenedorIVA')}
                                    disabled={isBlocked}
                                />
                            </Grid>
                        </Grid>

                        <Divider />
                        <Typography variant='caption' color='primary'>{t("gestion-proveedores:info-tributaria.adicionales.otrasConfiguracion")}</Typography>

                        {/* Gran Contribuyente con resolución */}
                        <Box>
                            <CheckboxTributario
                                texto={t("gestion-proveedores:info-tributaria.checks.granContribuyente")}
                                checked={infoTributaria.granContribuyente || false}
                                onChange={() => handleCheckChange('granContribuyente')}
                                disabled={isBlocked}
                            />
                            {infoTributaria.granContribuyente && (
                                <Box sx={{ pl: 6, pt: 1 }}>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                required
                                                label={t("gestion-proveedores:info-tributaria.adicionales.noResolucion")}
                                                fullWidth
                                                size="small"
                                                value={infoTributaria.resolucionGC || ''}
                                                onChange={(e) => handleTextChange('resolucionGC', e.target.value)}
                                                placeholder="Ej: 123456"
                                                disabled={isBlocked}
                                                error={validation.resolucionGC.hasError}
                                                helperText={validation.resolucionGC.msn}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                required
                                                label="Fecha Resolución"
                                                fullWidth
                                                size="small"
                                                type="date"
                                                value={infoTributaria.fechaGC ? new Date(infoTributaria.fechaGC).toISOString().split('T')[0] : ''}
                                                onChange={(e) => handleDateChange('fechaGC', e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                                disabled={isBlocked}
                                                error={validation.fechaGC.hasError}
                                                helperText={validation.fechaGC.msn}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}
                        </Box>

                        {/* Autorretenedor con resolución */}
                        <Box>
                            <CheckboxTributario
                                texto={t("gestion-proveedores:info-tributaria.checks.autorretenedor")}
                                checked={infoTributaria.autorretenedor || false}
                                onChange={() => handleCheckChange('autorretenedor')}
                                disabled={isBlocked}
                            />
                            {infoTributaria.autorretenedor && (
                                <Box sx={{ pl: 6, pt: 1 }}>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                label={t("gestion-proveedores:info-tributaria.adicionales.noResolucion")}
                                                required
                                                fullWidth
                                                size="small"
                                                value={infoTributaria.resolucionAutoRete || ''}
                                                onChange={(e) => handleTextChange('resolucionAutoRete', e.target.value)}
                                                placeholder="Ej: 789012"
                                                disabled={isBlocked}
                                                error={validation.resolucionAutoRete.hasError}
                                                helperText={validation.resolucionAutoRete.msn}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                required
                                                label="Fecha Resolución"
                                                fullWidth
                                                size="small"
                                                type="date"
                                                value={infoTributaria.fechaAutoRete ? new Date(infoTributaria.fechaAutoRete).toISOString().split('T')[0] : ''}
                                                onChange={(e) => handleDateChange('fechaAutoRete', e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                                disabled={isBlocked}
                                                error={validation.fechaAutoRete.hasError}
                                                helperText={validation.fechaAutoRete.msn}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}
                        </Box>

                        {/* Autorretenedor ICA */}
                        <Box>
                            <CheckboxTributario
                                texto={t("gestion-proveedores:info-tributaria.checks.autoretenedorIca")}
                                checked={infoTributaria.autoRetenedorICA || false}
                                onChange={() => handleCheckChange('autoRetenedorICA')}
                                disabled={isBlocked}
                            />
                            {infoTributaria.autoRetenedorICA && (
                                <Box sx={{ pl: 6, pt: 1 }}>
                                    <Stack spacing={2}>
                                        {/* Lista de detalles agregados */}
                                        {detallesICA.map((detalle, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    p: 1,
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    borderRadius: 1,
                                                }}
                                            >
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2">
                                                        {detalle.ciudad?.nombre} - {detalle.actividadEconomica?.nombre}
                                                    </Typography>
                                                </Box>
                                                <IconButton size="small" onClick={() => handleEliminarDetalleICA(index)}>
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ))}

                                        {/* Formulario para agregar nuevo detalle */}
                                        {showFormICA && (
                                            <Grid container spacing={2}>
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <Autocompleteasync
                                                        key={`ciudad-ica-${detallesICA.length}`}
                                                        label={t("gestion-proveedores:fields.ciudad")}
                                                        required
                                                        method="Ciudad?filter="
                                                        nombreDataOcject="nombre"
                                                        fnSeleted={(value) => {
                                                            const v = value as { id: number; nombre: string } | null;
                                                            handleCiudadICASelect(v?.id && v.id !== -1 ? v : null);
                                                        }}
                                                        size="small"
                                                        defaultValue={null}
                                                        disabled={isBlocked}
                                                        showError={validation.ciudadICA}
                                                    />
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <Autocompleteasync
                                                        key={`actividad-ica-${detallesICA.length}`}
                                                        label={t("gestion-proveedores:fields.actividadEconomica")}
                                                        required
                                                        method="ActividadEconomica?filter="
                                                        nombreDataOcject="nombre"
                                                        fnSeleted={(value) => {
                                                            const v = value as { id: number; nombre: string; codigo?: string } | null;
                                                            handleActividadICASelect(v?.id && v.id !== -1 ? v : null);
                                                        }}
                                                        size="small"
                                                        defaultValue={null}
                                                        disabled={isBlocked}
                                                        showError={validation.actividadICA}
                                                    />
                                                </Grid>
                                                <Grid size={12}>
                                                    <Box display="flex" justifyContent="flex-end" gap={1}>
                                                        <Button variant="text" size="small" onClick={() => {
                                                            setShowFormICA(false);
                                                            handleCiudadICASelect(null);
                                                            handleActividadICASelect(null);
                                                        }}>
                                                            {t("gestion-proveedores:cancelar")}
                                                        </Button>
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            onClick={handleAgregarDetalleICA}
                                                            disabled={!ciudadSeleccionada || !actividadSeleccionada}
                                                        >
                                                            {t("gestion-proveedores:agregar")}
                                                        </Button>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        )}

                                        {/* Botón para mostrar formulario */}
                                        <Box display="flex" justifyContent="flex-end">
                                            <Button
                                                onClick={() => setShowFormICA(true)}
                                                startIcon={<AddOutlinedIcon />}
                                                disabled={showFormICA || isBlocked}
                                            >
                                                {t("gestion-proveedores:agregar")} Detalle
                                            </Button>
                                        </Box>
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    )
}
