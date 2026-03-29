import { useEffect } from "react";
import {
    Box, FormControl, FormControlLabel, Grid2, IconButton, InputLabel, MenuItem,
    Paper, Radio, RadioGroup, Select, Stack, TextField, Tooltip, Typography
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FormularioExtraccionData } from "../../../model";

import { useInformacionLegal } from "../hooks/useInformacionLegal";
import { Autocompleteasync } from "../../../../../../../SharedComponents/Autocomplete";
import { TipoRegistroCamaraComercioRepresentacion } from "../../../../CamaraComercio/model/camaraComercio.model";

interface InformacionLegalProps {
    formData: FormularioExtraccionData;
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
    onRegisterValidation?: (validateFn: () => boolean) => void;
    onRegisterAdd?: (fn: () => void) => void;
}

export const InformacionLegal = ({ formData, setFormData, onRegisterValidation, onRegisterAdd }: InformacionLegalProps) => {
    const { state, validationMap, handleRepresentanteChange, handleRemoveRepresentante, handleAddRepresentante, validateRepresentantes } = useInformacionLegal({
        representantesLegales: formData.representantesLegales,
        setFormData,
    });
    const { t } = useTranslation('gestion-proveedores');
    const { t: tForms } = useTranslation('forms');

    useEffect(() => {
        onRegisterValidation?.(validateRepresentantes);
        onRegisterAdd?.(handleAddRepresentante);
    }, []);

    if (!state || state.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" pl={1}>
                {t("ocr-extraccion.informacionLegal.noEncontrados")}
            </Typography>
        );
    }

    return (
        <Stack spacing={2}>
            <Box>
                <Stack spacing={2}>
                    {state.map((representante, index) => {
                        const validation = validationMap[index];
                        return (
                            <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                {/* Header */}
                                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2">
                                        {t("info-legal.estados.representantesLegal")} #{index + 1}
                                    </Typography>
                                    <Tooltip title={t("eliminar")}>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveRepresentante(index)}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                <Stack spacing={2}>
                                    {/* Tipo de representación */}
                                    <FormControl
                                        sx={{
                                            flexDirection: { xs: 'column', sm: 'row' },
                                            gap: 2,
                                            alignItems: { xs: 'flex-start', sm: 'center' },
                                            ".MuiFormGroup-root": { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">* {t("tipo")}</Typography>
                                        <RadioGroup
                                            row
                                            value={representante.tipoRepresentacion}
                                            onChange={(e) => handleRepresentanteChange(index, 'tipoRepresentacion', Number(e.target.value) as TipoRegistroCamaraComercioRepresentacion)}
                                            sx={{ gap:0.5 }}
                                        >
                                            <FormControlLabel value={TipoRegistroCamaraComercioRepresentacion.Principal} control={<Radio size="small" />} label={tForms("formularios.tipoRepresentante.principal")} sx={{ mr: 1 }} />
                                            <FormControlLabel value={TipoRegistroCamaraComercioRepresentacion.Suplente} control={<Radio size="small" />} label={tForms("formularios.tipoRepresentante.suplente")} sx={{ mr: 1 }} />
                                            <FormControlLabel value={TipoRegistroCamaraComercioRepresentacion.Apoderado} control={<Radio size="small" />} label={tForms("formularios.tipoRepresentante.apoderado")} sx={{ mr: 1 }} />
                                        </RadioGroup>
                                    </FormControl>
                                    <Grid2 size={12}>
                                        <TextField size="small" label={t("fields.detallesCargo")} value={representante.cargo} name="cargo"
                                            onChange={(e) => handleRepresentanteChange(index, e.target.name, e.target.value)} fullWidth
                                            inputProps={{ maxLength: 50 }} />
                                    </Grid2>
                                    {/* Nombres y Apellidos */}
                                    <Grid2 container spacing={2}>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                required
                                                label={t("nombres")}
                                                fullWidth
                                                size="small"
                                                value={representante.nombre}
                                                onChange={(e) => handleRepresentanteChange(index, 'nombre', e.target.value)}
                                                error={validation?.nombre.hasError}
                                                helperText={validation?.nombre.msn}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                required
                                                label={t("apellidos")}
                                                fullWidth
                                                size="small"
                                                value={representante.apellido}
                                                onChange={(e) => handleRepresentanteChange(index, 'apellido', e.target.value)}
                                                error={validation?.apellido.hasError}
                                                helperText={validation?.apellido.msn}
                                            />
                                        </Grid2>
                                    </Grid2>

                                    {/* Tipo y número de documento */}
                                    <Grid2 container spacing={2}>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <FormControl fullWidth>
                                                <InputLabel id="demo-simple-select-label">{t("fields.tipoDocumentoSinAbreviar")}</InputLabel>
                                                <Select
                                                    fullWidth
                                                    size="small"
                                                    value={representante.tipoDocumento}
                                                    label={t("fields.tipoDocumentoSinAbreviar")}
                                                    onChange={(e) => handleRepresentanteChange(index, 'tipoDocumento', e.target.value)}
                                                >
                                                    <MenuItem value="ext">{tForms("formularios.tipoDocumento.extranjero")}</MenuItem>
                                                    <MenuItem value="cc">{tForms("formularios.tipoDocumento.cedulaCiudadania")}</MenuItem>
                                                    <MenuItem value="ce">{tForms("formularios.tipoDocumento.cedulaExtrnajeria")}</MenuItem>
                                                    <MenuItem value="pa">{tForms("formularios.tipoDocumento.pasaporte")}</MenuItem>
                                                    <MenuItem value="PT">{tForms("formularios.tipoDocumento.permisoProteccionTemporal")}</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                required
                                                label={t("fields.numeroDocumento")}
                                                fullWidth
                                                size="small"
                                                value={representante.documento}
                                                onChange={(e) => handleRepresentanteChange(index, 'documento', e.target.value)}
                                                error={validation?.documento.hasError}
                                                helperText={validation?.documento.msn}
                                            />
                                        </Grid2>
                                    </Grid2>

                                    {/* Fecha de expedición y Lugar de expedición */}
                                    <Grid2 container spacing={2}>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <DatePicker
                                                label={t("fields.fechaExpedicionDoc")}
                                                format="DD/MM/YYYY"
                                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                                value={representante.fechaExpedicion ? dayjs(representante.fechaExpedicion, 'DD/MM/YYYY') : null}
                                                onChange={(d) => {
                                                    if (d) handleRepresentanteChange(index, 'fechaExpedicion', (d as ReturnType<typeof dayjs>).format('DD/MM/YYYY'));
                                                }}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <Autocompleteasync
                                                label={t("fields.lugarYfechaExpedicion")}
                                                size="small"
                                                method="Ciudad?filter="
                                                nombreDataOcject="nombre"
                                                defaultValue={{ id: 0, nombre: representante.lugarExpedicion ?? '' }}
                                                fnSeleted={(sel) => handleRepresentanteChange(index, 'lugarExpedicion', (sel as { nombre: string }).nombre)}
                                            />
                                        </Grid2>
                                    </Grid2>

                                    {/* Fecha de nacimiento y Lugar de nacimiento */}
                                    <Grid2 container spacing={2}>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <DatePicker
                                                label={t("fields.fechaNacimiento")}
                                                format="DD/MM/YYYY"
                                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                                value={representante.fechaNacimiento ? dayjs(representante.fechaNacimiento, 'DD/MM/YYYY') : null}
                                                onChange={(d) => {
                                                    if (d) handleRepresentanteChange(index, 'fechaNacimiento', (d as ReturnType<typeof dayjs>).format('DD/MM/YYYY'));
                                                }}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <Autocompleteasync
                                                label={t("fields.lugarNacimiento")}
                                                size="small"
                                                method="Ciudad?filter="
                                                nombreDataOcject="nombre"
                                                defaultValue={{ id: 0, nombre: representante.lugarNacimiento ?? '' }}
                                                fnSeleted={(sel) => handleRepresentanteChange(index, 'lugarNacimiento', (sel as { nombre: string }).nombre)}
                                            />
                                        </Grid2>
                                    </Grid2>

                                    {/* Lugar de residencia y Dirección */}
                                    <Grid2 container spacing={2}>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <Autocompleteasync
                                                label={t("fields.lugarResidencia")}
                                                size="small"
                                                method="Ciudad?filter="
                                                nombreDataOcject="nombre"
                                                defaultValue={{ id: 0, nombre: representante.lugarResidencia ?? '' }}
                                                fnSeleted={(sel) => handleRepresentanteChange(index, 'lugarResidencia', (sel as { nombre: string }).nombre)}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                label={t("fields.direccion")}
                                                fullWidth
                                                size="small"
                                                value={representante.direccion ?? ''}
                                                onChange={(e) => handleRepresentanteChange(index, 'direccion', e.target.value)}
                                                inputProps={{ maxLength: 50 }}
                                            />
                                        </Grid2>
                                    </Grid2>

                                    {/* País de residencia y Nacionalidad */}
                                    <Grid2 container spacing={2}>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <Autocompleteasync
                                                label={t("fields.paisResidencia")}
                                                size="small"
                                                method="Pais?filter="
                                                nombreDataOcject="nombre"
                                                defaultValue={{ id: 0, nombre: representante.paisResidencia ?? '' }}
                                                fnSeleted={(sel) => handleRepresentanteChange(index, 'paisResidencia', (sel as { nombre: string }).nombre)}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                label={t("fields.nacionalidad")}
                                                fullWidth
                                                size="small"
                                                value={representante.nacionalidad ?? ''}
                                                onChange={(e) => handleRepresentanteChange(index, 'nacionalidad', e.target.value)}
                                                inputProps={{ maxLength: 50 }}
                                            />
                                        </Grid2>
                                    </Grid2>

                                    {/* Pregunta PEP */}
                                    <Stack spacing={0} direction="column">
                                        <Typography variant="caption" color="text.secondary">
                                            {t("fields.esPersonaPEP")}
                                        </Typography>
                                        <RadioGroup
                                            row
                                            value={representante.isPep ? 1 : 0}
                                            onChange={(e) => handleRepresentanteChange(index, 'isPep', e.target.value === "1")}
                                        >
                                            <FormControlLabel value={1} control={<Radio size="small" />} label={t("si")} />
                                            <FormControlLabel value={0} control={<Radio size="small" />} label={t("no")} />
                                        </RadioGroup>
                                    </Stack>

                                    {/* Pregunta vínculo PEP */}
                                    <Stack spacing={0} direction="column">
                                        <Typography variant="caption" color="text.secondary">
                                            {t("ocr-extraccion.informacionLegal.vinculoPepExtendido")}
                                        </Typography>
                                        <RadioGroup
                                            row
                                            value={representante.hasVinculoPep ? 1 : 0}
                                            onChange={(e) => handleRepresentanteChange(index, 'hasVinculoPep', e.target.value === "1")}
                                            
                                        >
                                            <FormControlLabel value={1} control={<Radio size="small" />} label={t("si")} sx={{ pl: 2 }} />
                                            <FormControlLabel value={0} control={<Radio size="small" />} label={t("no")} />
                                        </RadioGroup>
                                    </Stack>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            </Box>
        </Stack>
    );
};
