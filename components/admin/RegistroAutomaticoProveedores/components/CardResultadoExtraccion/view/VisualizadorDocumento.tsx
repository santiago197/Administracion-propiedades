import { Box, Paper, Typography, useTheme } from "@mui/material"

interface VisualizadorDocumentoProps {
    fileName?: string;
    fileUrl?: string;
}
export const VisualizadorDocumento = ({ fileName, fileUrl }: VisualizadorDocumentoProps) => {
    const theme = useTheme();
    return (
        <Paper
            elevation={0}
            sx={{
                height: 'calc(100vh - 170px)',
                // minHeight: 600,
                border: `2px solid ${theme.palette.divider}`,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: 'grey.50'
            }}
        >

            {/* Área del documento */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0,
                    overflow: 'auto'
                }}
            >
                {fileUrl ? (
                    <Box
                        component="iframe"
                        src={fileUrl}
                        sx={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            borderRadius: 1
                        }}
                    />
                ) : (
                    <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                            Vista previa del documento
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                            {fileName}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    )
}
