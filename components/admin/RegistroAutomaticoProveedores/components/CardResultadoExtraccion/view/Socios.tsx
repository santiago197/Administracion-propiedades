import { useEffect, useContext } from "react";
import { Box, Collapse, FormControl, FormControlLabel, Grid2, IconButton, InputLabel, InputAdornment, MenuItem, Paper, Radio, RadioGroup, Select, Stack, TextField, Typography, useTheme, Divider, Tooltip } from "@mui/material"
import { useTranslation } from "react-i18next";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { SocioData, FormularioExtraccionData } from "../../../model"
import { normalizarTipoDocumento } from "../../../utilities/tipoDocumento";
import { useSocios } from "../hooks/useSocios";
import { AuthContext } from "../../../../../../../context";
import { UploadDocument } from "../../../../../../../SharedComponents/Documento";
import { AdjuntoTerceroDTO } from "../../../../DocumentosAdjuntos/Model/AdjuntosDTO";


interface SociosProps {
    socios: SocioData[];
    setFormData: React.Dispatch<React.SetStateAction<FormularioExtraccionData>>;
    expandedSections: Set<string>;
    onRegisterValidation?: (validateFn: () => boolean) => void;
    onRegisterAdd?: (fn: () => void) => void;
}

export const Socios = ({ socios, setFormData, expandedSections, onRegisterValidation, onRegisterAdd }: SociosProps) => {
    const theme = useTheme();
    const { storeUsuario } = useContext(AuthContext);
    const { t } = useTranslation("gestion-proveedores");
    const { t: tForms } = useTranslation("forms");

    const {
        state,
        isSocioMap,
        validationMap,
        setSocioParticipacion,
        handleSocioChange,
        validateSocios,
        handleAddSocio,
        handleRemoveSocio,
    } = useSocios({ socios, setFormData });

    useEffect(() => {
        onRegisterValidation?.(validateSocios);
        onRegisterAdd?.(handleAddSocio);
    }, []);
    if (!state || state.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" pl={2}>
                {t("ocr-extraccion.socios.noEncontrados")}
            </Typography>
        );
    }
    return (
        <Paper
            elevation={0}
            sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden'
            }}
        >
            <Collapse in={expandedSections.has('socios')}>
                <Box sx={{ p: 2, pt: 0 }}>
                    <Stack spacing={2}>
                        {state.map((socio, index) => {
                            const isSocio = isSocioMap[index] ?? (normalizarTipoDocumento(socio.tipoDocumento) === 'NIT' ? 1 : 0);
                            const validation = validationMap[index];
                            const tipoDoc = normalizarTipoDocumento(socio.tipoDocumento);

                            return (
                                <Paper
                                    key={index}
                                    variant="outlined"
                                    sx={{ p: 2, borderRadius: 1 }}
                                >
                                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2">
                                            {t("info-legal.estados.socio")} #{index + 1}
                                        </Typography>
                                        <Tooltip title={t("eliminar")}>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRemoveSocio(index)}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>

                                    <Grid2 container spacing={2}>
                                        {/* Pregunta de participación y Radios */}
                                        <Grid2 size={12}>
                                            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                                                <Typography variant="caption" color="text.secondary">{t("info-legal.drawer.tienePorcentajeParticipacion")}</Typography>
                                                <FormControl>
                                                    <RadioGroup
                                                        row
                                                        value={isSocio}
                                                        onChange={(e) => setSocioParticipacion(index, Number(e.target.value))}
                                                        aria-labelledby="demo-controlled-radio-buttons-group"
                                                        name="controlled-radio-buttons-group"
                                                    >
                                                        <FormControlLabel sx={{ marginLeft: 0 }} value="1" control={<Radio />} label={t("si")} />
                                                        <FormControlLabel sx={{ marginLeft: 0 }} value="0" control={<Radio />} label={t("no")} />
                                                    </RadioGroup>
                                                </FormControl>
                                            </Stack>
                                        </Grid2>

                                        {/* Porcentaje de participación */}
                                        {isSocio === 1 && (
                                            <Grid2 size={12}>
                                                <Stack spacing={1}>
                                                    <Typography variant="caption" color="text.secondary">{t("info-legal.drawer.cantidadPorcentaje")}</Typography>
                                                    <TextField
                                                        required
                                                        fullWidth
                                                        size="small"
                                                        label={t("info-legal.drawer.porcentajeParticipacion")}
                                                        value={socio.porcentaje?.toString().replace("e", "") || ''}
                                                        onChange={(e) => handleSocioChange(index, 'porcentaje', e.target.value)}
                                                        InputProps={{
                                                            endAdornment: <InputAdornment position="end">%</InputAdornment>
                                                        }}
                                                        inputProps={{ maxLength: 10 }}
                                                        error={validation?.porcentajeParticipacion.hasError}
                                                        helperText={validation?.porcentajeParticipacion.msn}
                                                    />
                                                </Stack>
                                            </Grid2>
                                        )}

                                        {/* Fila 1: Detalle del cargo + Nombres */}
                                        <Grid2 size={{ xs: 12, sm: isSocio === 1 ? 6 : 12 }}>
                                            <TextField
                                                label={t("fields.detallesCargo")}
                                                fullWidth
                                                size="small"
                                                value={socio.cargo || ''}
                                                onChange={(e) => handleSocioChange(index, 'cargo', e.target.value)}
                                                inputProps={{ maxLength: 50 }}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                label={t("nombres")}
                                                required
                                                fullWidth
                                                size="small"
                                                value={socio.nombre || ''}
                                                onChange={(e) => handleSocioChange(index, 'nombre', e.target.value)}
                                                error={validation?.primerNombre.hasError}
                                                helperText={validation?.primerNombre.msn}
                                                inputProps={{ maxLength: 25 }}
                                            />
                                        </Grid2>

                                        {/* Fila 2: Apellidos + Tipo de documento */}
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                label={t("apellidos")}
                                                required
                                                fullWidth
                                                size="small"
                                                value={socio.apellido || ''}
                                                onChange={(e) => handleSocioChange(index, 'apellido', e.target.value)}
                                                error={validation?.primerApellido.hasError}
                                                helperText={validation?.primerApellido.msn}
                                                inputProps={{ maxLength: 25 }}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <FormControl fullWidth>
                                                <InputLabel id="demo-simple-select-label">{t("fields.tipoDocumentoSinAbreviar")}</InputLabel>
                                                <Select
                                                    size="small"
                                                    labelId="demo-simple-select-label"
                                                    id="demo-simple-select"
                                                    value={tipoDoc}
                                                    label={t("fields.tipoDocumentoSinAbreviar")}
                                                    onChange={(e) => handleSocioChange(index, 'tipoDocumento', e.target.value)}
                                                >
                                                    {isSocio ? <MenuItem value={"NIT"}>{tForms("formularios.tipoDocumento.nit")}</MenuItem> : null}
                                                    <MenuItem value={"ext"}>{tForms("formularios.tipoDocumento.extranjero")}</MenuItem>
                                                    <MenuItem value={"cc"}>{tForms("formularios.tipoDocumento.cedulaCiudadania")}</MenuItem>
                                                    <MenuItem value={"ti"}>{tForms("formularios.tipoDocumento.tarjetaIdentidad")}</MenuItem>
                                                    <MenuItem value={"ce"}>{tForms("formularios.tipoDocumento.cedulaExtrnajeria")}</MenuItem>
                                                    <MenuItem value={"pa"}>{tForms("formularios.tipoDocumento.pasaporte")}</MenuItem>
                                                    <MenuItem value={"pt"}>{tForms("formularios.tipoDocumento.permisoProteccionTemporal")}</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid2>

                                        {/* Fila 3: Número de documento + País de residencia */}
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                label={t("fields.numeroDocumento")}
                                                required
                                                fullWidth
                                                size="small"
                                                value={socio.documento}
                                                onChange={(e) => handleSocioChange(index, 'documento', e.target.value)}
                                                placeholder="Ej: 1234567890"
                                                error={validation?.numeroIdentificacion.hasError}
                                                helperText={validation?.numeroIdentificacion.msn}
                                                inputProps={{ maxLength: 25 }}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                label={t("fields.paisResidencia")}
                                                fullWidth
                                                size="small"
                                                value={socio.paisResidencia || ''}
                                                onChange={(e) => handleSocioChange(index, 'paisResidencia', e.target.value)}
                                            />
                                        </Grid2>

                                        {/* Pregunta PEP 1 */}
                                        <Grid2 size={12}>
                                            <FormControl size="small">
                                                <Typography variant="caption" color="text.secondary">{t("fields.esPersonaPEP")}</Typography>
                                                <RadioGroup
                                                    row
                                                    value={socio.isPep ? "1" : "0"}
                                                    onChange={(e) => handleSocioChange(index, 'isPep', e.target.value === "1")}
                                                    name={`isPep-${index}`}
                                                >
                                                    <FormControlLabel sx={{ marginLeft: 0 }} value="1" control={<Radio size="small" />} label={t("si")} />
                                                    <FormControlLabel sx={{ marginLeft: 0 }} value="0" control={<Radio size="small" />} label={t("no")} />
                                                </RadioGroup>
                                            </FormControl>
                                        </Grid2>

                                        {/* Pregunta PEP 2 */}
                                        <Grid2 size={12}>
                                            <FormControl size="small">
                                                <Typography variant="caption" color="text.secondary">{t("fields.administraRecursos")}</Typography>
                                                <RadioGroup
                                                    row
                                                    value={socio.hasVinculoPep ? "1" : "0"}
                                                    onChange={(e) => handleSocioChange(index, 'hasVinculoPep', e.target.value === "1")}
                                                    name={`hasVinculoPep-${index}`}
                                                >
                                                    <FormControlLabel sx={{ marginLeft: 0 }} value="1" control={<Radio size="small" />} label={t("si")} />
                                                    <FormControlLabel sx={{ marginLeft: 0 }} value="0" control={<Radio size="small" />} label={t("no")} />
                                                </RadioGroup>
                                            </FormControl>
                                        </Grid2>

                                        {/* Adjunto para socios jurídicos (NIT) */}
                                        {isSocio && tipoDoc.toLowerCase() === "nit" ? (
                                            <>
                                                <Grid2 size={12}>
                                                    <Typography variant="caption" color="text.primary">{t("info-legal.label")}</Typography>
                                                </Grid2>
                                                <Grid2 size={12}>
                                                    <Divider />
                                                </Grid2>
                                                <Grid2 size={12} >
                                                    <UploadDocument
                                                        idOrigen={storeUsuario.user.id.toString()}
                                                        idOrigen2={socio.documentoAdjunto.tipoAdjunto.id.toString()}
                                                        tipo='tercero'
                                                        file={socio.documentoAdjunto}
                                                        uploadedCompleted={(file) => {
                                                            const adjuntoCompleto: AdjuntoTerceroDTO = {
                                                                adjunto: file,
                                                                tipoAdjunto: socio.documentoAdjunto.tipoAdjunto
                                                            };
                                                            handleSocioChange(index, 'documentoAdjunto', adjuntoCompleto)
                                                        }}
                                                        selected={true}
                                                        obligatorio={true}
                                                    />
                                                </Grid2>
                                            </>
                                        ) : null}
                                    </Grid2>
                                </Paper>
                            );
                        })}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}
