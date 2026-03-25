import { useEffect, useState } from "react";
import { Box, Button, Collapse, FormControl, FormControlLabel, Grid2, IconButton, InputAdornment, Paper, Popover, Radio, RadioGroup, Stack, TextField, Typography, useTheme } from "@mui/material"
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { FormularioExtraccionData } from "../../../model";
import { Autocompleteasync } from "../../../../../../../SharedComponents/Autocomplete";
import { useInformacionGeneral } from "../hooks/useInformacionGeneral";
import InfoIcon from '@mui/icons-material/Info';
import { useStorePEP } from "../../../../../components/PEP/store/storePEP";
import { useTranslation } from 'react-i18next';

interface InformacionGeneralProps {
    formData: FormularioExtraccionData;
    expandedSections: Set<string>;
    handleAccordionChange: (section: string) => () => void;
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
    onRegisterValidation?: (validateFn: () => boolean) => void;
}

export const InformacionGeneral = ({ formData, handleAccordionChange, expandedSections, setFormData, onRegisterValidation }: InformacionGeneralProps) => {
    const theme = useTheme();
    const {
        handleCiudadSelect,
        handlePaisSelect,
        handleActividadSelect,
        handleInputChangeGeneral,
        handleCertificadoISO,
        validation,
        validateForm,
        anchorEl,
        handlePopoverOpen,
        handlePopoverClose,
        open
    } = useInformacionGeneral({ setFormData, formData });

    const { t } = useTranslation(['gestion-proveedores']);
    const update = useStorePEP((store) => store.changePep);
    const statePep = useStorePEP((store) => store.store);
    const setStore = useStorePEP((store) => store.setStore);
    const [openPeP, setOpenPeP] = useState(false);

    useEffect(() => {
        onRegisterValidation?.(validateForm);
        setStore({ id: 0, esPEP: false, vinculoPEP: false });
    }, []);

    const isJuridica = formData.informacionGeneral.tipoContribuyente === 'Persona jurídica';

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
                onClick={handleAccordionChange('informacionGeneral')}
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
                        {t("gestion-proveedores:info-general.encabezado.titulo")}
                    </Typography>
                </Box>
                <IconButton
                    size="small"
                    sx={{
                        transform: expandedSections.has('informacionGeneral') ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s'
                    }}
                >
                    <ExpandMoreIcon />
                </IconButton>
            </Box>
            <Collapse in={expandedSections.has('informacionGeneral')}>
                <Box sx={{ p: 2, pt: 0 }}>
                    <Stack spacing={2} >
                        {/* Tipo de persona */}
                        <Box display="flex" alignItems="center" width="100%">
                            <Typography variant="caption" color="text.secondary">{t("gestion-proveedores:fields.tipoPersona")}:</Typography>
                            <FormControl disabled>
                                <RadioGroup
                                    row
                                    value={formData.informacionGeneral.tipoContribuyente}
                                    name="tipo-contribuyente-group"
                                >
                                    <FormControlLabel
                                        labelPlacement="start"
                                        sx={{ ml: 0.5 }}
                                        value="Persona natural"
                                        control={<Radio size="small" />}
                                        label={t("gestion-proveedores:fields.natural")}
                                    />
                                    <FormControlLabel
                                        labelPlacement="start"
                                        value="Persona jurídica"
                                        control={<Radio size="small" />}
                                        label={t("gestion-proveedores:fields.juridica")}
                                    />
                                </RadioGroup>
                            </FormControl>
                        </Box>

                        {/* Bloque identidad */}
                        <Grid2 container size={12} spacing={2}>
                            {isJuridica ? (
                                <>
                                    {/* Razón social | Tipo doc + NIT + - + DV en la misma fila */}
                                    <Grid2 size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            required
                                            label={t("gestion-proveedores:fields.razonSocial")}
                                            fullWidth
                                            size="small"
                                            value={formData.informacionGeneral.razonSocial}
                                            onChange={(e) => handleInputChangeGeneral('razonSocial', e.target.value)}
                                            error={validation.razonSocial.hasError}
                                            helperText={validation.razonSocial.msn}
                                        />
                                    </Grid2>
                                    <Grid2 container size={{ xs: 12, sm: 6 }} spacing={0}>
                                        <Grid2 size={{ xs: 2.3 }}>
                                            <TextField
                                                label={t("gestion-proveedores:fields.tipoDocumentos")}
                                                fullWidth
                                                value={formData.informacionGeneral.tipoDocumento}
                                                disabled
                                                size="small"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderTopRightRadius: 0,
                                                        borderBottomRightRadius: 0,
                                                        '& fieldset': { borderRight: 'none' },
                                                    },
                                                }}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 7 }}>
                                            <TextField
                                                label={t("gestion-proveedores:fields.numeroIdentificacion")}
                                                fullWidth
                                                value={formData.informacionGeneral.numeroIdentificacion}
                                                disabled
                                                size="small"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': { borderRadius: 0 },
                                                }}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 0.3 }}>
                                            <Typography variant="h5" textAlign="center">-</Typography>
                                        </Grid2>

                                        <Grid2 size={{ xs: 2.4 }}>
                                            <TextField
                                                label=""
                                                disabled
                                                focused
                                                fullWidth
                                                slotProps={{
                                                    input: {
                                                        endAdornment: <>
                                                            <InputAdornment sx={{ minWidth: `fit-content` }} position="end"><Box height={`100%`} display={`flex`} justifyContent={`center`} aria-owns={open ? 'mouse-over-popover' : undefined}
                                                                aria-haspopup="true"
                                                                onMouseEnter={handlePopoverOpen}
                                                                onMouseLeave={handlePopoverClose}><InfoIcon fontSize="small" /></Box></InputAdornment>
                                                            <Popover
                                                                id="mouse-over-popover"
                                                                sx={{ pointerEvents: 'none' }}
                                                                open={open}
                                                                anchorEl={anchorEl}
                                                                anchorOrigin={{
                                                                    vertical: 'bottom',
                                                                    horizontal: 'left',
                                                                }}
                                                                transformOrigin={{
                                                                    vertical: 'top',
                                                                    horizontal: 'left',
                                                                }}
                                                                onClose={handlePopoverClose}
                                                                disableRestoreFocus
                                                            >
                                                                <Typography variant="body2" sx={{ p: 1, width: 300 }}>
                                                                    {t("gestion-proveedores:info-general.notificaciones.numeroIdentificacion")}
                                                                </Typography>
                                                            </Popover>
                                                        </>,
                                                    },
                                                }}
                                                value={formData.informacionGeneral.digitoVerificacion}
                                                size="small"
                                            />
                                        </Grid2>
                                    </Grid2>
                                </>
                            ) : (
                                <>
                                    {/* Tipo doc + Número id en fila completa */}
                                    <Grid2 container size={12} spacing={0}>
                                        <Grid2 size={{ xs: 2.5 }}>
                                            <TextField
                                                    label={t("gestion-proveedores:fields.tipoDocumentos" as Parameters<typeof t>[0])}
                                                fullWidth
                                                value={formData.informacionGeneral.tipoDocumento}
                                                disabled
                                                size="small"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderTopRightRadius: 0,
                                                        borderBottomRightRadius: 0,
                                                        '& fieldset': { borderRight: 'none' },
                                                    },
                                                }}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 9.5 }}>
                                            <TextField
                                                label={t("gestion-proveedores:fields.numeroIdentificacion")}
                                                fullWidth
                                                required
                                                value={formData.informacionGeneral.numeroIdentificacion}
                                                disabled
                                                size="small"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderTopLeftRadius: 0,
                                                        borderBottomLeftRadius: 0,
                                                    },
                                                }}
                                            />
                                        </Grid2>
                                    </Grid2>
                                    {/* Nombres y Apellidos (consolidados) */}
                                    <Grid2 size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            required
                                            label={t("gestion-proveedores:fields.nombresRut")}
                                            fullWidth
                                            size="small"
                                            value={[formData.informacionGeneral.primerNombre, formData.informacionGeneral.otrosNombres].filter(Boolean).join(' ')}
                                            onChange={(e) => {
                                                handleInputChangeGeneral('primerNombre', e.target.value);
                                                handleInputChangeGeneral('otrosNombres', '');
                                            }}
                                            error={validation.primerNombre.hasError}
                                            helperText={validation.primerNombre.msn}
                                        />
                                    </Grid2>
                                    <Grid2 size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            required
                                            label={t("gestion-proveedores:fields.apellidosRut")}
                                            fullWidth
                                            size="small"
                                            value={[formData.informacionGeneral.primerApellido, formData.informacionGeneral.segundoApellido].filter(Boolean).join(' ')}
                                            onChange={(e) => {
                                                handleInputChangeGeneral('primerApellido', e.target.value);
                                                handleInputChangeGeneral('segundoApellido', '');
                                            }}
                                            error={validation.primerApellido.hasError}
                                            helperText={validation.primerApellido.msn}
                                        />
                                    </Grid2>
                                </>
                            )}
                        </Grid2>

                        {/* Campos de contacto y ubicación */}
                        <Grid2 container rowSpacing={3} columnSpacing={2}>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    required
                                    label={t("gestion-proveedores:fields.correoElectronico")}
                                    fullWidth
                                    size="small"
                                    type="email"
                                    value={formData.informacionGeneral.correo}
                                    onChange={(e) => handleInputChangeGeneral('correo', e.target.value)}
                                    error={validation.correo.hasError}
                                    helperText={validation.correo.msn}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    required
                                    label={t("gestion-proveedores:fields.numeroContacto")}
                                    fullWidth
                                    size="small"
                                    value={formData.informacionGeneral.telefono}
                                    onChange={(e) => handleInputChangeGeneral('telefono', e.target.value)}
                                    error={validation.telefono.hasError}
                                    helperText={validation.telefono.msn}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <Autocompleteasync
                                    required
                                    label={t("gestion-proveedores:fields.ciudad")}
                                    method="Ciudad?filter="
                                    nombreDataOcject="nombre"
                                    fnSeleted={handleCiudadSelect}
                                    defaultValue={formData.informacionGeneral.ciudad}
                                    showError={validation.ciudad}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    required
                                    label={t("gestion-proveedores:fields.direccion")}
                                    fullWidth
                                    size="small"
                                    value={formData.informacionGeneral.direccion}
                                    onChange={(e) => handleInputChangeGeneral('direccion', e.target.value)}
                                    error={validation.direccion.hasError}
                                    helperText={validation.direccion.msn}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <Autocompleteasync
                                    label={t("gestion-proveedores:fields.pais")}
                                    method="Pais?filter="
                                    nombreDataOcject="nombre"
                                    fnSeleted={handlePaisSelect}
                                    defaultValue={formData.informacionGeneral.pais}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label={t("gestion-proveedores:fields.sitioWeb")}
                                    fullWidth
                                    size="small"
                                    value={formData.informacionGeneral.paginaWeb}
                                    onChange={(e) => handleInputChangeGeneral('paginaWeb', e.target.value)}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 3, sm: 2 }}>
                                <TextField
                                    label={t("gestion-proveedores:fields.ciiu")}
                                    fullWidth
                                    size="small"
                                    value={formData.informacionGeneral.actividadPrincipal.codigo}
                                    disabled
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 9, sm: 10 }}>
                                <Autocompleteasync
                                    required
                                    label={t("gestion-proveedores:fields.actividadEconomica")}
                                    method="ActividadEconomica?filter="
                                    nombreDataOcject="nombre"
                                    fnSeleted={handleActividadSelect}
                                    defaultValue={formData.informacionGeneral.actividadPrincipal}
                                    showError={validation.actividadPrincipal}
                                />
                            </Grid2>
                        </Grid2>

                        {/* Certificado ISO */}
                        <Box display="flex" alignItems="center" width="100%">
                            <Typography variant="caption" color="text.secondary">{t("gestion-proveedores:fields.certificadoIso")}:</Typography>
                            <FormControl>
                                <RadioGroup
                                    row
                                    name="certificado-iso-group"
                                    value={String(formData.informacionGeneral.certificadoISO)}
                                    onChange={(e) => handleCertificadoISO(e.target.value === "true")}
                                >
                                    <FormControlLabel labelPlacement="start" sx={{ ml: 0.8 }} value="true" control={<Radio size="small" />} label={t("gestion-proveedores:si")} />
                                    <FormControlLabel labelPlacement="start" value="false" control={<Radio size="small" />} label={t("gestion-proveedores:no")} />
                                </RadioGroup>
                            </FormControl>
                        </Box>

                        {/* Sección PEP — solo para persona natural */}
                        {!isJuridica && (
                            <Box width="100%">
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setOpenPeP(prev => !prev)}
                                    endIcon={<KeyboardArrowDownIcon />}
                                >
                                    {t("gestion-proveedores:fields.informacionPEP")}
                                </Button>
                                {openPeP && (
                                    <Grid2 container spacing={2} mt={2}>
                                        <Grid2 size={{ sm: 7 }}>
                                            <Stack spacing={0} direction="column">
                                                <Typography variant="body2" color="text.secondary">{t("gestion-proveedores:fields.esPersonaPEP")}</Typography>
                                                <FormControl size="small" sx={{
                                                    flexDirection: 'row', gap: 2, alignItems: 'center', ml: 1,
                                                    ".MuiFormGroup-root": { display: 'flex', width: '100%', flexDirection: 'row' }
                                                }}>
                                                    <RadioGroup
                                                        value={statePep.esPEP ? "1" : "0"}
                                                        onChange={(e) => update('esPEP', e.target.value === "1")}
                                                        name="pep-radio-group"
                                                    >
                                                        <FormControlLabel value="1" control={<Radio size="small" />} label={t("gestion-proveedores:si")} />
                                                        <FormControlLabel value="0" control={<Radio size="small" />} label={t("gestion-proveedores:no")} />
                                                    </RadioGroup>
                                                </FormControl>
                                            </Stack>
                                        </Grid2>
                                        <Grid2 size={{ sm: 5 }}>
                                            <Stack spacing={0} direction="column">
                                                <Typography variant="body2" color="text.secondary">{t("gestion-proveedores:fields.administraRecursos")}</Typography>
                                                <FormControl size="small" sx={{
                                                    flexDirection: 'row', gap: 1, alignItems: 'center', ml: 1,
                                                    ".MuiFormGroup-root": { display: 'flex', width: '100%', flexDirection: 'row' }
                                                }}>
                                                    <RadioGroup
                                                        value={statePep.vinculoPEP ? "1" : "0"}
                                                        onChange={(e) => update('vinculoPEP', e.target.value === "1")}
                                                        name="vinculo-pep-radio-group"
                                                    >
                                                        <FormControlLabel value="1" control={<Radio size="small" />} label={t("gestion-proveedores:si")} />
                                                        <FormControlLabel value="0" control={<Radio size="small" />} label={t("gestion-proveedores:no")} />
                                                    </RadioGroup>
                                                </FormControl>
                                            </Stack>
                                        </Grid2>
                                    </Grid2>
                                )}
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    )
}
