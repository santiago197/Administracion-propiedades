// Valores válidos del selector de tipo de documento
// NIT usa mayúsculas para coincidir con el valor del MenuItem
export const normalizarTipoDocumento = (tipo: string): string => {
    if (!tipo?.trim()) return 'cc';
    const tipoLower = tipo.toLowerCase().trim();
    const mapeo: Record<string, string> = {
        // Cédula de ciudadanía
        'cédula de ciudadanía': 'cc',
        'cedula de ciudadania': 'cc',
        'cédula de ciudadaní': 'cc',
        'cc': 'cc',
        // Cédula de extranjería
        'cédula de extranjería': 'ce',
        'cedula de extranjeria': 'ce',
        'ce': 'ce',
        // Pasaporte
        'pasaporte': 'pa',
        'pa': 'pa',
        // NIT (valor en el selector es 'NIT' en mayúsculas)
        'nit': 'NIT',
        // Tarjeta de identidad
        'tarjeta de identidad': 'ti',
        'ti': 'ti',
        // Extranjero
        'extranjero': 'ext',
        'ext': 'ext',
        // Permiso protección temporal
        'permiso protección temporal': 'pt',
        'permiso proteccion temporal': 'pt',
        'pt': 'pt',
    };

    return mapeo[tipoLower] ?? 'cc';
};
