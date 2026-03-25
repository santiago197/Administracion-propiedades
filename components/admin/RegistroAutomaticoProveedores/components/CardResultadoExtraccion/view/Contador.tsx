import { useEffect } from "react";
import { Box, Divider, FormControl, FormControlLabel, Grid2, IconButton, InputLabel, MenuItem, Paper, Radio, RadioGroup, Select, Stack, TextField, Typography } from "@mui/material"
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from "react-i18next";
import { ContadorData, FormularioExtraccionData } from "../../../model";
import { useContador } from "../hooks/useContador";

interface ContadorProps {
    contador: ContadorData | null;
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
    onRegisterValidation?: (validateFn: () => boolean) => void;
    onRegisterAdd?: (fn: () => void) => void;
}

export const Contador = ({ contador, setFormData, onRegisterValidation, onRegisterAdd }: ContadorProps) => {
    const { state, validationMap, handleChange, handleAddContador, handleRemoveContador, validateContador } = useContador({ contador, setFormData });
    const { t } = useTranslation('gestion-proveedores');
    const { t: tForms } = useTranslation('forms');

    useEffect(() => {
        onRegisterValidation?.(validateContador);
        onRegisterAdd?.(handleAddContador);
    }, []);

    if (state.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                {t("ocr-extraccion.contador.noEncontrado")}
            </Typography>
        );
    }

    return (
        <Stack spacing={2}>
            {state.map((c, index) => {
                const validation = validationMap[index];
                return (
                    <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={2}>
                            {/* Header */}
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Typography variant="subtitle2">
                                    {t("ocr-extraccion.contador.titulo")} #{index + 1}
                                </Typography>
                                <IconButton size="small" color="error" onClick={() => handleRemoveContador(index)}>
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Box>

                            {/* Tipo y número de documento */}
                            <Grid2 container spacing={2}>
                                <Grid2 size={{ xs: 12, sm: 6 }}>
                                    <FormControl fullWidth>
                                        <InputLabel id={`tipo-doc-contador-${index}`}>{t("fields.tipoDocumentoSinAbreviar")}</InputLabel>
                                        <Select
                                            labelId={`tipo-doc-contador-${index}`}
                                            label={t("fields.tipoDocumentoSinAbreviar")}
                                            size="small"
                                            value={c.tipoDocumento || ''}
                                            onChange={(e) => handleChange(index, 'tipoDocumento', e.target.value)}
                                            error={validation?.tipoDocumento.hasError}
                                        >
                                            <MenuItem value="cc">{tForms("formularios.tipoDocumento.cedulaCiudadania")}</MenuItem>
                                            <MenuItem value="ext">{tForms("formularios.tipoDocumento.extranjero")}</MenuItem>
                                            <MenuItem value="ce">{tForms("formularios.tipoDocumento.cedulaExtrnajeria")}</MenuItem>
                                            <MenuItem value="pa">{tForms("formularios.tipoDocumento.pasaporte")}</MenuItem>
                                            <MenuItem value="pt">{tForms("formularios.tipoDocumento.permisoProteccionTemporal")}</MenuItem>
                                            <MenuItem value="ti">{tForms("formularios.tipoDocumento.tarjetaIdentidad")}</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid2>
                                <Grid2 size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        required
                                        label={t("fields.numeroDocumento")}
                                        fullWidth
                                        size="small"
                                        value={c.documento || ''}
                                        onChange={(e) => handleChange(index, 'documento', e.target.value)}
                                        placeholder="Ej: 1234567890"
                                        error={validation?.numeroIdentificacion.hasError}
                                        helperText={validation?.numeroIdentificacion.msn}
                                        inputProps={{ maxLength: 15 }}
                                    />
                                </Grid2>
                            </Grid2>

                            {/* Nombres y Apellidos */}
                            <Grid2 container spacing={2}>
                                <Grid2 size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        required
                                        label={t("nombres")}
                                        fullWidth
                                        size="small"
                                        value={c.nombre || ''}
                                        onChange={(e) => handleChange(index, 'nombre', e.target.value)}
                                        error={validation?.primerNombre.hasError}
                                        helperText={validation?.primerNombre.msn}
                                        inputProps={{ maxLength: 50 }}
                                    />
                                </Grid2>
                                <Grid2 size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        required
                                        label={t("apellidos")}
                                        fullWidth
                                        size="small"
                                        value={c.apellido || ''}
                                        onChange={(e) => handleChange(index, 'apellido', e.target.value)}
                                        error={validation?.primerApellido.hasError}
                                        helperText={validation?.primerApellido.msn}
                                        inputProps={{ maxLength: 50 }}
                                    />
                                </Grid2>
                            </Grid2>

                            <Divider />

                            {/* PEP 1 */}
                            <Grid2 size={{ xs: 12 }}>
                                <Stack spacing={0} direction="column">
                                    <Typography variant="caption" color="text.secondary">
                                        {t("fields.esPersonaPEP")}
                                    </Typography>
                                    <RadioGroup
                                        row
                                        value={c.isPep ? "1" : "0"}
                                        onChange={(e) => handleChange(index, 'isPep', e.target.value === "1")}
                                        name={`contador-isPep-${index}`}
                                    >
                                        <FormControlLabel value="1" control={<Radio size="small" />} label={t("si")} />
                                        <FormControlLabel value="0" control={<Radio size="small" />} label={t("no")} />
                                    </RadioGroup>
                                </Stack>
                            </Grid2>

                            {/* PEP 2 */}
                            <Grid2 size={{ xs: 12 }}>
                                <Stack spacing={0} direction="column">
                                    <Typography variant="caption" color="text.secondary">
                                        {t("fields.administraRecursos")}
                                    </Typography>
                                    <RadioGroup
                                        row
                                        value={c.hasVinculoPep ? "1" : "0"}
                                        onChange={(e) => handleChange(index, 'hasVinculoPep', e.target.value === "1")}
                                        name={`contador-hasVinculoPep-${index}`}
                                    >
                                        <FormControlLabel value="1" control={<Radio size="small" />} label={t("si")} />
                                        <FormControlLabel value="0" control={<Radio size="small" />} label={t("no")} />
                                    </RadioGroup>
                                </Stack>
                            </Grid2>
                        </Stack>
                    </Paper>
                );
            })}
        </Stack>
    );
};
