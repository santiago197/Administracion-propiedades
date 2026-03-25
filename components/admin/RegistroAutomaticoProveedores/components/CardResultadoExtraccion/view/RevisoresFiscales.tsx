import { useEffect } from "react";
import {
    Box, FormControl, FormControlLabel, Grid2, IconButton, MenuItem,
    Paper, Radio, RadioGroup, Select, Stack, TextField, Typography, InputLabel, Tooltip
} from "@mui/material"
import { useTranslation } from "react-i18next";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FormularioExtraccionData } from "../../../model"
import { normalizarTipoDocumento } from "../../../utilities/tipoDocumento";
import { useRevisoresFiscales } from "../hooks/useRevisoresFiscales";
import { TipoRegistroCamaraComercioRepresentacion } from "../../../../CamaraComercio/model/camaraComercio.model";
import { Validationforms } from "../../../../../../../Helper";


interface RevisoresFiscalesProps {
    formData: FormularioExtraccionData;
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
    onRegisterValidation?: (validateFn: () => boolean) => void;
    onRegisterAdd?: (fn: () => void) => void;
}

export const RevisoresFiscales = ({
    formData,
    setFormData,
    onRegisterValidation,
    onRegisterAdd,
}: RevisoresFiscalesProps) => {
    const { state, validationMap, handleRevisorChange, handleRemoveRevisor, handleAddRevisor, validateRevisores } = useRevisoresFiscales({
        revisorPrincipal: formData.revisorFiscalPrincipal,
        revisorSuplente: formData.revisorFiscalSuplente,
        setFormData,
    });
    const { t } = useTranslation("gestion-proveedores");
    const { t: tForms } = useTranslation("forms");

    useEffect(() => {
        onRegisterValidation?.(validateRevisores);
        onRegisterAdd?.(handleAddRevisor);
    }, []);

    if (!state || state.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                {t("ocr-extraccion.revisoresFiscales.noEncontrados")}
            </Typography>
        );
    }

    return (
        <Stack spacing={2}>
            <Box>

                <Stack spacing={2}>
                    {state.map((revisor, index) => {
                        const validation = validationMap[index];
                        const isFirma = revisor.tipoRepresentacion === TipoRegistroCamaraComercioRepresentacion.Firma;
                        const tipoLabel = revisor.tipoRepresentacion === TipoRegistroCamaraComercioRepresentacion.Principal
                            ? t("fields.tipoRepresentacion.principal")
                            : revisor.tipoRepresentacion === TipoRegistroCamaraComercioRepresentacion.Suplente
                                ? t("fields.tipoRepresentacion.suplente")
                                : t("fields.tipoRepresentacion.firma");

                        return (
                            <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                {/* Header */}
                                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2">
                                        {t("info-legal.drawer.revisorFiscal")} {tipoLabel} #{index + 1}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleRemoveRevisor(index)}
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
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
                                        <Typography variant="caption" color="text.secondary">{t("ocr-extraccion.revisoresFiscales.etiquetaTipo")}</Typography>
                                        <RadioGroup
                                            row
                                            value={revisor.tipoRepresentacion}
                                            onChange={(e) => handleRevisorChange(index, 'tipoRepresentacion', Number(e.target.value) as TipoRegistroCamaraComercioRepresentacion)}
                                        >
                                            <FormControlLabel value={TipoRegistroCamaraComercioRepresentacion.Principal} control={<Radio size="small" />} label={t("fields.tipoRepresentacion.principal")} />
                                            <FormControlLabel value={TipoRegistroCamaraComercioRepresentacion.Suplente} control={<Radio size="small" />} label={t("fields.tipoRepresentacion.suplente")} />
                                            <FormControlLabel value={TipoRegistroCamaraComercioRepresentacion.Firma} control={<Radio size="small" />} label={t("fields.tipoRepresentacion.firma")} />
                                        </RadioGroup>
                                    </FormControl>

                                    {/* Campos de Firma */}
                                    {isFirma && (
                                        <>
                                            <Grid2 container spacing={2}>
                                                <Grid2 size={{ xs: 12, sm: 6 }}>
                                                    <FormControl fullWidth>
                                                        <InputLabel id={`tipo-doc-firma-${index}`}>{t("fields.tipoDocumentoSinAbreviar")}</InputLabel>
                                                        <Select
                                                            labelId={`tipo-doc-firma-${index}`}
                                                            label={t("fields.tipoDocumentoSinAbreviar")}
                                                            size="small"
                                                            value="nit"
                                                            disabled
                                                        >
                                                            <MenuItem value="nit">{tForms("formularios.tipoDocumento.nit")}</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Grid2>

                                                <Grid2 size={{ xs: 10, sm: 5 }}>
                                                    <TextField
                                                        required
                                                        size="small"
                                                        label={t("ocr-extraccion.revisoresFiscales.numeroNit")}
                                                        fullWidth
                                                        value={revisor.razonSocialDoc || ''}
                                                        onChange={(e) => handleRevisorChange(index, 'razonSocialDoc', e.target.value)}
                                                        error={validation?.nit?.hasError || false}
                                                        helperText={validation?.nit?.msn}
                                                        inputProps={{ maxLength: 9 }}
                                                    />
                                                </Grid2>

                                                <Grid2 size={{ xs: 2, sm: 1 }}>
                                                    <Tooltip title={t("ocr-extraccion.revisoresFiscales.digitoVerificacion")}>
                                                        <Typography variant="h6" color="text.secondary" sx={{
                                                            border: '1px solid rgba(0, 0, 0, 0.25)', height: 30, borderRadius: '4px',
                                                            display: 'flex', justifyContent: 'center', alignItems: 'center'
                                                        }}>
                                                            {revisor.razonSocialDoc ? new Validationforms().calcularDigitoVerificacion(revisor.razonSocialDoc) : '-'}
                                                        </Typography>
                                                    </Tooltip>
                                                </Grid2>
                                            </Grid2>

                                            <Grid2 size={12}>
                                                <TextField
                                                    required
                                                    size="small"
                                                    label={t("ocr-extraccion.revisoresFiscales.razonsocial")}
                                                    fullWidth
                                                    value={revisor.razonSocialNombre || ''}
                                                    onChange={(e) => handleRevisorChange(index, 'razonSocialNombre', e.target.value)}
                                                    error={validation?.sociedadDesignada?.hasError || false}
                                                    helperText={validation?.sociedadDesignada?.msn}
                                                    inputProps={{ maxLength: 50 }}
                                                />
                                            </Grid2>

                                            <Grid2 size={12}>
                                                <Typography variant="caption" color="text.secondary">{t("ocr-extraccion.revisoresFiscales.infoRepresentanteFirma")}</Typography>
                                            </Grid2>
                                        </>
                                    )}

                                    {/* Detalle del cargo - solo para Personal */}
                                    {!isFirma && (
                                        <Grid2 size={12}>
                                            <TextField
                                                required
                                                size="small"
                                                label={t("fields.detallesCargo")}
                                                fullWidth
                                                value={revisor.cargo || ''}
                                                onChange={(e) => handleRevisorChange(index, 'cargo', e.target.value)}
                                                error={validation?.tarjetaProfesional?.hasError || false}
                                                helperText={validation?.tarjetaProfesional?.msn}
                                                inputProps={{ maxLength: 50 }}
                                            />
                                        </Grid2>
                                    )}

                                    {/* Detalle del cargo - para representante de Firma */}
                                    {isFirma && (
                                        <Grid2 size={12}>
                                            <TextField
                                                required
                                                size="small"
                                                label={t("fields.detallesCargo")}
                                                fullWidth
                                                value={revisor.cargo || ''}
                                                onChange={(e) => handleRevisorChange(index, 'cargo', e.target.value)}
                                                error={validation?.tarjetaProfesional?.hasError || false}
                                                helperText={validation?.tarjetaProfesional?.msn}
                                                inputProps={{ maxLength: 50 }}
                                            />
                                        </Grid2>
                                    )}

                                    {/* Tipo y número de documento */}
                                    <Grid2 container spacing={2}>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <FormControl fullWidth>
                                                <InputLabel id={`tipo-doc-${index}`}>{t("fields.tipoDocumentoSinAbreviar")}</InputLabel>
                                                <Select
                                                    labelId={`tipo-doc-${index}`}
                                                    label={t("fields.tipoDocumentoSinAbreviar")}
                                                    size="small"
                                                    value={normalizarTipoDocumento(revisor.tipoDocumento).toLowerCase()}
                                                    onChange={(e) => handleRevisorChange(index, 'tipoDocumento', e.target.value)}
                                                >
                                                    <MenuItem value="ext">{tForms("formularios.tipoDocumento.extranjero")}</MenuItem>
                                                    <MenuItem value="cc">{tForms("formularios.tipoDocumento.cedulaCiudadania")}</MenuItem>
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
                                                value={revisor.documento}
                                                onChange={(e) => handleRevisorChange(index, 'documento', e.target.value)}
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
                                                value={revisor.nombre}
                                                onChange={(e) => handleRevisorChange(index, 'nombre', e.target.value)}
                                                error={validation?.primerNombre.hasError}
                                                helperText={validation?.primerNombre.msn}
                                                inputProps={{ maxLength: 25 }}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                required
                                                label={t("apellidos")}
                                                fullWidth
                                                size="small"
                                                value={revisor.apellido}
                                                onChange={(e) => handleRevisorChange(index, 'apellido', e.target.value)}
                                                error={validation?.primerApellido.hasError}
                                                helperText={validation?.primerApellido.msn}
                                                inputProps={{ maxLength: 25 }}
                                            />
                                        </Grid2>
                                    </Grid2>

                                    {/* PEP 1 */}
                                    <Stack spacing={0} direction="column">
                                        <Typography variant="caption" color="text.secondary">
                                            {t("fields.esPersonaPEP")}
                                        </Typography>
                                        <RadioGroup
                                            row
                                            value={revisor.isPep ? "1" : "0"}
                                            onChange={(e) => handleRevisorChange(index, 'isPep', e.target.value === "1")}
                                            name={`revisor-isPep-${index}`}
                                        >
                                            <FormControlLabel value="1" control={<Radio size="small" />} label={t("si")} />
                                            <FormControlLabel value="0" control={<Radio size="small" />} label={t("no")} />
                                        </RadioGroup>
                                    </Stack>

                                    {/* PEP 2 */}
                                    <Stack spacing={0} direction="column">
                                        <Typography variant="caption" color="text.secondary">
                                            {t("fields.administraRecursos")}
                                        </Typography>
                                        <RadioGroup
                                            row
                                            value={revisor.hasVinculoPep ? "1" : "0"}
                                            onChange={(e) => handleRevisorChange(index, 'hasVinculoPep', e.target.value === "1")}
                                            name={`revisor-hasVinculoPep-${index}`}
                                        >
                                            <FormControlLabel value="1" control={<Radio size="small" />} label={t("si")} />
                                            <FormControlLabel value="0" control={<Radio size="small" />} label={t("no")} />
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
