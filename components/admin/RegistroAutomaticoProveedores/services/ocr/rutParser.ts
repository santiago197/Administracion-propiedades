import type {
  RUTData,
  HeaderData,
  IdentificacionData,
  UbicacionData,
  ClasificacionData,
  ResponsabilidadesData,
  ResponsabilidadItem,
  RepresentanteLegalData,
  SocioData,
  RevisorFiscalData,
  ContadorData,
} from '../../model/OCRResponse.model';

// Secciones del RUT identificadas por encabezados
const SECTION_MARKERS = {
  HEADER: /REGISTRO\s*[ÚU]NICO\s*TRIBUTARIO|FORMULARIO\s*DEL\s*RUT/i,
  IDENTIFICACION: /IDENTIFICACI[ÓO]N/i,
  UBICACION: /UBICACI[ÓO]N/i,
  CLASIFICACION: /CLASIFICACI[ÓO]N/i,
  RESPONSABILIDADES: /^Responsabilidades.*Calidades.*Atributos|^RESPONSABILIDADES.*TRIBUTARIAS|^RESPONSABILIDADES\s*$/i,
  REPRESENTANTES: /REPRESENTACI[ÓO]N\s*LEGAL|REPRS?\s*LEGAL/i,
  SOCIOS: /SOCIOS\s*Y\/?O\s*MIEMBROS|SOCIOS/i,
  REVISOR_FISCAL: /REVISOR\s*FISCAL/i,
  CONTADOR: /^CONTADOR\s*$/i,
} as const;

/**
 * Parsea las líneas extraídas de un PDF del RUT colombiano
 * y lo convierte a la estructura RUTData.
 * Usa un enfoque basado en líneas para preservar la relación header/datos
 * donde los encabezados de campo están en una línea y los datos en la siguiente.
 *
 * @param lines - Array de líneas de texto reconstruidas
 * @returns RUTData con toda la información extraída
 */
export function parseRUTText(lines: string[]): RUTData {
  const sections = splitIntoSectionLines(lines);

  // Parsear todas las secciones
  // Pasar las líneas originales completas al header para detectar tipo de contribuyente
  const header = parseHeaderFromLines(sections.header, lines);
  const identificacion = parseIdentificacion(
    limitSection(
      sections.identificacion.join('\n'),
      /IDENTIFICACI[ÓO]N/i,
      /UBICACI[ÓO]N/i
    )
  );

  // Sincronizar NIT y DV entre header e identificación
  // El header tiene prioridad porque incluye el DV para persona natural
  if (header.nit && header.dv) {
    // Si header tiene NIT y DV, copiarlos a identificación si no tiene DV
    if (!identificacion.dv) {
      identificacion.dv = header.dv;
    }
    // Asegurar que el NIT coincida
    if (identificacion.numeroIdentificacion !== header.nit) {

      identificacion.numeroIdentificacion = header.nit;
    }
  } else if (!header.nit && identificacion.numeroIdentificacion) {
    // Fallback: Si header no tiene NIT pero identificación sí, copiar al header
    header.nit = identificacion.numeroIdentificacion;
    header.dv = identificacion.dv || '';
  }

  return {
    header,
    identificacion,
    ubicacion: parseUbicacionFromLines(sections.ubicacion),
    clasificacion: parseClasificacionFromLines(sections.clasificacion),
    responsabilidades: parseResponsabilidades(sections.responsabilidades.join('\n')),
    representantesLegales: parseRepresentantesLegales(sections.representantes.join('\n')),
    socios: parseSocios(sections.socios.join('\n')),
    revisorFiscalPrincipal: parseRevisorFiscal(sections.revisorFiscal.join('\n'), 'PRIN'),
    revisorFiscalSuplente: parseRevisorFiscal(sections.revisorFiscal.join('\n'), 'SUPL'),
    contador: parseContador(sections.contador.join('\n')),
  };
}

// --- División en secciones basada en líneas ---

interface SectionLinesMap {
  header: string[];
  identificacion: string[];
  ubicacion: string[];
  clasificacion: string[];
  responsabilidades: string[];
  representantes: string[];
  socios: string[];
  revisorFiscal: string[];
  contador: string[];
}

function splitIntoSectionLines(lines: string[]): SectionLinesMap {
  const sections: SectionLinesMap = {
    header: [],
    identificacion: [],
    ubicacion: [],
    clasificacion: [],
    responsabilidades: [],
    representantes: [],
    socios: [],
    revisorFiscal: [],
    contador: [],
  };

  let currentSection: keyof SectionLinesMap = 'header';



  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // IMPORTANTE: Las líneas con "Identificación Tributaria (NIT)" y "6. DV" son del HEADER
    // NO deben cambiar la sección a "identificacion"
    const isHeaderNITLine = /(?:5\.)?\s*(?:N[úu]mero\s+de\s+)?Identificaci[oó]n\s+Tributaria.*NIT.*6\.?\s*DV/i.test(trimmed);

    if (isHeaderNITLine) {
      // Esta línea es parte del header, no cambiar sección
      sections[currentSection].push(trimmed);
      continue;
    }

    // Detectar cambios de sección
    let sectionChanged = false;

    // Detectar inicio de datos del Contador por campo 148 (más confiable que el texto "Contador")
    if (currentSection === 'revisorFiscal' && /\b148\.\s*Tipo de documento/i.test(trimmed)) {
      currentSection = 'contador';
      sectionChanged = true;
    }

    if (sectionChanged) {
      // Ya se detectó cambio por campo 148
    } else if (SECTION_MARKERS.CONTADOR.test(trimmed)) {
      currentSection = 'contador';
      sectionChanged = true;

    } else if (SECTION_MARKERS.REVISOR_FISCAL.test(trimmed)) {
      currentSection = 'revisorFiscal';
      sectionChanged = true;

    } else if (SECTION_MARKERS.SOCIOS.test(trimmed)) {
      currentSection = 'socios';
      sectionChanged = true;

    } else if (SECTION_MARKERS.REPRESENTANTES.test(trimmed)) {
      currentSection = 'representantes';
      sectionChanged = true;
    } else if (SECTION_MARKERS.RESPONSABILIDADES.test(trimmed)) {
      currentSection = 'responsabilidades';
      sectionChanged = true;
    } else if (SECTION_MARKERS.CLASIFICACION.test(trimmed)) {
      currentSection = 'clasificacion';
      sectionChanged = true;
    } else if (SECTION_MARKERS.UBICACION.test(trimmed)) {
      currentSection = 'ubicacion';
      sectionChanged = true;
    } else if (SECTION_MARKERS.IDENTIFICACION.test(trimmed)) {
      // SOLO cambiar a identificación si es una línea que SOLO dice "IDENTIFICACIÓN"
      // y NO es una línea de datos del header
      const isSectionHeaderOnly = /^IDENTIFICACI[ÓO]N\s*$/i.test(trimmed);
      if (isSectionHeaderOnly) {
        currentSection = 'identificacion';
        sectionChanged = true;
      }
    }

    sections[currentSection].push(trimmed);
  }
  return sections;
}

// --- Utilidades de extracción ---

/** Extrae todos los dígitos individuales de un texto, ignorando espacios y letras */
function extractAllDigits(text: string): string {
  return (text.match(/\d/g) || []).join('');
}

/**
 * Calcula el dígito de verificación para cédulas colombianas según el algoritmo del RUT.
 * @param cedula Número de cédula (7-10 dígitos)
 * @returns Dígito de verificación (0-9)
 */
function calcularDigitoVerificacion(cedula: string): string {
  // Asegurar que solo tenemos dígitos
  const digits = cedula.replace(/[^0-9]/g, '');

  if (digits.length < 7 || digits.length > 10) {
    console.warn('⚠️ [DV_CALC] Longitud de cédula inválida:', digits.length);
    return '';
  }

  let sumaImpares = 0;
  let sumaPares = 0;

  // Sumar dígitos en posiciones impares (índices 0, 2, 4, 6, 8)
  for (let i = 0; i < digits.length; i += 2) {
    sumaImpares += parseInt(digits[i], 10);
  }

  // Sumar dígitos en posiciones pares (índices 1, 3, 5, 7, 9)
  for (let i = 1; i < digits.length; i += 2) {
    sumaPares += parseInt(digits[i], 10);
  }

  // Multiplicar suma de impares por 3
  const sumaImparesX3 = sumaImpares * 3;

  // Sumar ambos resultados
  const sumaTotal = sumaImparesX3 + sumaPares;

  // Obtener residuo de dividir entre 11
  const residuo = sumaTotal % 11;

  // DV = 11 - residuo (si residuo es 0, DV es 0)
  const dv = residuo === 0 ? 0 : 11 - residuo;
  return dv.toString();
}


/**
 * Parsea una línea de datos de persona del RUT (Revisor Fiscal / Contador).
 * Formato: "Cédula de Ciudadanía   1   3   5   2   2   5   4   9   1   9   2   8   1   7   6   8"
 *
 * Estructura de dígitos/letras después del texto del tipo de documento:
 *   - tipoDocCodigo: primeros 2 dígitos (ej: "13" = Cédula de Ciudadanía)
 *   - numeroIdentificacion: 8-10 dígitos según el tipo de documento
 *   - dv: 1 dígito después del número de identificación
 *   - tarjetaProfesional: 5-7 caracteres alfanuméricos restantes
 */
function parsePersonaDataLine(dataLine: string, logPrefix: string = '🔶'): {
  tipoDocumento: string;
  tipoDocCodigo: string;
  numeroIdentificacion: string;
  dv: string;
  tarjetaProfesional: string;
} {
  const result = { tipoDocumento: '', tipoDocCodigo: '', numeroIdentificacion: '', dv: '', tarjetaProfesional: '' };

  // console.log(`${logPrefix} [PERSONA] Procesando línea:`, dataLine);

  // Extraer nombre del tipo de documento (texto al inicio, antes de los dígitos)
  const textMatch = dataLine.match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\s+\d)/);
  if (textMatch) {
    result.tipoDocumento = normalizeTipoDocumento(textMatch[1].trim());
  }
  // console.log(`${logPrefix} [PERSONA] Tipo documento:`, result.tipoDocumento);

  // Extraer solo la porción de datos (dígitos y letras después del texto)
  const afterText = textMatch ? dataLine.substring(textMatch[0].length) : dataLine;
  const dataChars = (afterText.match(/[A-Z0-9]/g) || []).join('');
  // console.log(`${logPrefix} [PERSONA] Caracteres de datos:`, dataChars, 'length:', dataChars.length);

  if (dataChars.length < 4) {
    console.warn(`${logPrefix} [PERSONA] No hay suficientes datos`);
    return result;
  }

  // Extraer tipoDocCodigo (primeros 2 dígitos)
  result.tipoDocCodigo = dataChars.substring(0, 2);

  // El resto de caracteres contiene: numeroId + DV + tarjeta
  const remaining = dataChars.substring(2);
  const remainingDigits = remaining.replace(/[^0-9]/g, '');

  // console.log(`${logPrefix} [PERSONA] tipoDocCodigo:`, result.tipoDocCodigo);
  // console.log(`${logPrefix} [PERSONA] Caracteres restantes:`, remaining);
  //console.log(`${logPrefix} [PERSONA] Dígitos restantes:`, remainingDigits, 'length:', remainingDigits.length);

  // Determinar longitud de número de identificación basándose en el total de dígitos
  // Estructura: tipoDocCodigo(2) + numeroId(8-10) + DV(1) + tarjeta(5-7)
  // Total típico: 16-20 caracteres

  let numIdLength = 10; // Por defecto para cédula de 10 dígitos

  if (result.tipoDocCodigo === '31') {
    // NIT siempre tiene 9 dígitos
    numIdLength = 9;
  } else {
    // Para CC: determinar si es 7, 8, 9 o 10 dígitos basándose en el total
    // Tarjeta profesional típicamente es 5-7 caracteres
    // Si remainingDigits tiene 13-14 dígitos: probablemente 7-8(numId) + 1(DV) + 5-6(tarjeta)
    // Si remainingDigits tiene 15 dígitos: probablemente 9(numId) + 1(DV) + 5(tarjeta)
    // Si remainingDigits tiene 16+ dígitos: probablemente 10(numId) + 1(DV) + 5(tarjeta)
    const totalDigits = remainingDigits.length;

    if (totalDigits <= 13) {
      numIdLength = 7;
    } else if (totalDigits === 14) {
      numIdLength = 8;
    } else if (totalDigits === 15) {
      numIdLength = 9;
    } else {
      numIdLength = 10;
    }

    // console.log(`${logPrefix} [PERSONA] numIdLength determinado:`, numIdLength, 'basado en totalDigits:', totalDigits);
  }

  // Estructura: numeroId (8-10) + DV (1) + tarjeta (resto, puede tener letras)
  // Los últimos dígitos son: numId + DV
  // La tarjeta profesional puede tener letras y números (típicamente 5-7 caracteres)

  // Buscar letras en los datos (indica que hay tarjeta profesional con letra)
  const letterMatch = remaining.match(/[A-Z]/);

  if (letterMatch && letterMatch.index !== undefined) {
    // Hay letra: ajustar numIdLength basándose en posición de la letra
    // Tarjeta profesional típicamente 5-7 caracteres, así que trabajamos hacia atrás
    const digitsBeforeLetter = remaining.substring(0, letterMatch.index).replace(/[^0-9]/g, '');
    const totalDigitsBeforeLetter = digitsBeforeLetter.length;

    //console.log(`${logPrefix} [PERSONA] Letra encontrada en posición:`, letterMatch.index);
    //console.log(`${logPrefix} [PERSONA] Dígitos antes de letra:`, digitsBeforeLetter, 'length:', totalDigitsBeforeLetter);

    // Intentar diferentes longitudes de tarjeta (5-7 dígitos) y encontrar la que tenga sentido
    // La tarjeta tiene: N dígitos + letra(s)
    // Antes de la letra: numId + DV + dígitos de tarjeta
    // Cédulas colombianas: 7-10 dígitos típicamente

    let bestNumIdLength = numIdLength; // Usar el calculado por defecto
    let bestTarjetaLength = 0;
    let hasDV = false; // Para saber si se encontró DV explícito

    // Probar longitudes típicas de cédulas colombianas (de mayor a menor)
    // Primero intentar CON DV: numId + DV(1) + tarjeta(5-7)
    // Si no encaja, intentar SIN DV: numId + tarjeta(6-7) y calcular DV
    // En caso de empate, preferir numId MÁS LARGO (cédulas recientes tienen 10 dígitos)
    for (let tryNumId of [10, 9, 8, 7]) {
      // Opción 1: CON DV explícito
      const tryIdPlusDv = tryNumId + 1;
      if (totalDigitsBeforeLetter >= tryIdPlusDv) {
        const tarjetaDigits = totalDigitsBeforeLetter - tryIdPlusDv;
        // Tarjeta profesional típicamente 5-7 dígitos
        if (tarjetaDigits >= 5 && tarjetaDigits <= 7) {
          // Preferir si: no tenemos candidato, o este tiene numId más largo
          if (bestTarjetaLength === 0 || tryNumId > bestNumIdLength) {
            bestNumIdLength = tryNumId;
            bestTarjetaLength = tarjetaDigits;
            hasDV = true;
            //   console.log(`${logPrefix} [PERSONA] Candidato CON DV - numIdLength:`, tryNumId, `(tarjeta ${tarjetaDigits} dígitos + letra)`);
          }
        }
      }

      // Opción 2: SIN DV (será calculado)
      if (totalDigitsBeforeLetter >= tryNumId) {
        const tarjetaDigitsSinDV = totalDigitsBeforeLetter - tryNumId;
        // Si SIN DV, tarjeta debe ser 6-7 dígitos (típico para tarjetas profesionales)
        if (tarjetaDigitsSinDV >= 6 && tarjetaDigitsSinDV <= 7) {
          // Preferir si: no tenemos candidato, o este tiene numId más largo
          if (bestTarjetaLength === 0 || tryNumId > bestNumIdLength) {
            bestNumIdLength = tryNumId;
            bestTarjetaLength = tarjetaDigitsSinDV;
            hasDV = false;
            //   console.log(`${logPrefix} [PERSONA] Candidato SIN DV - numIdLength:`, tryNumId, `(tarjeta ${tarjetaDigitsSinDV} dígitos + letra, DV calculado)`);
          }
        }
      }
    }

    if (bestTarjetaLength > 0) {
      numIdLength = bestNumIdLength;
      // console.log(`${logPrefix} [PERSONA] Seleccionado numIdLength:`, numIdLength, `(tarjeta ${bestTarjetaLength} dígitos + letra)`);
    }

    // Extraer numId, DV y tarjeta
    if (totalDigitsBeforeLetter >= numIdLength) {
      result.numeroIdentificacion = digitsBeforeLetter.substring(0, numIdLength);

      // Verificar si hay DV explícito o debemos calcularlo
      const remainingAfterNumId = totalDigitsBeforeLetter - numIdLength;

      if (remainingAfterNumId >= 6) {
        // Si quedan 6+ dígitos, probablemente NO hay DV explícito (todos son tarjeta)
        // Calcular DV
        result.dv = calcularDigitoVerificacion(result.numeroIdentificacion);
        result.tarjetaProfesional = digitsBeforeLetter.substring(numIdLength) + remaining.substring(letterMatch.index);
        //  console.log(`${logPrefix} [PERSONA] DV calculado:`, result.dv);
      } else {
        // Hay DV explícito
        result.dv = digitsBeforeLetter[numIdLength];

        // Tarjeta: dígitos restantes + letra + resto
        if (remainingAfterNumId > 1) {
          result.tarjetaProfesional = digitsBeforeLetter.substring(numIdLength + 1) + remaining.substring(letterMatch.index);
        } else {
          result.tarjetaProfesional = remaining.substring(letterMatch.index);
        }
        //  console.log(`${logPrefix} [PERSONA] DV explícito:`, result.dv);
      }
    } else {
      // Fallback
      if (totalDigitsBeforeLetter >= 2) {
        result.dv = digitsBeforeLetter[totalDigitsBeforeLetter - 1];
        result.numeroIdentificacion = digitsBeforeLetter.substring(0, totalDigitsBeforeLetter - 1);
      }
      result.tarjetaProfesional = remaining.substring(letterMatch.index);
    }
  } else {
    // No hay letra: toda la tarjeta es numérica
    // Ejemplo CON DV: "52254919 2 81768" -> numId(8) + DV(1) + tarjeta(5)
    // Ejemplo SIN DV: "1056074506 2632931" -> numId(10) + tarjeta(7, DV calculado)

    if (remainingDigits.length >= numIdLength + 1) {
      result.numeroIdentificacion = remainingDigits.substring(0, numIdLength);

      const remainingAfterNumId = remainingDigits.length - numIdLength;

      // Si quedan 6+ dígitos, probablemente NO hay DV explícito
      if (remainingAfterNumId >= 6) {
        // Calcular DV
        result.dv = calcularDigitoVerificacion(result.numeroIdentificacion);
        result.tarjetaProfesional = remainingDigits.substring(numIdLength);
        //  console.log(`${logPrefix} [PERSONA] SIN LETRA - DV calculado:`, result.dv);
      } else {
        // Hay DV explícito
        result.dv = remainingDigits[numIdLength];

        // Tarjeta profesional: el resto
        if (remainingDigits.length > numIdLength + 1) {
          result.tarjetaProfesional = remainingDigits.substring(numIdLength + 1);
        }
        // console.log(`${logPrefix} [PERSONA] SIN LETRA - DV explícito:`, result.dv);
      }
    } else if (remainingDigits.length >= 2) {
      // Fallback: último dígito es DV, el resto es numId
      result.dv = remainingDigits[remainingDigits.length - 1];
      result.numeroIdentificacion = remainingDigits.substring(0, remainingDigits.length - 1);
      // console.log(`${logPrefix} [PERSONA] SIN LETRA - Fallback, DV:`, result.dv);
    }
  }

  // console.log(`${logPrefix} [PERSONA] Resultado:`, {
  //   tipoDocCodigo: result.tipoDocCodigo,
  //   numeroIdentificacion: result.numeroIdentificacion,
  //   dv: result.dv,
  //   tarjetaProfesional: result.tarjetaProfesional,
  // });

  return result;
}



function extractFieldValue(text: string, fieldNumber: number): string {

  const lines = text.split(/\r?\n/);

  const fieldRegex = new RegExp(`^${fieldNumber}\\.`);

  for (let i = 0; i < lines.length; i++) {

    if (!fieldRegex.test(lines[i].trim())) continue;

    // el valor está en la siguiente línea válida
    for (let j = i + 1; j < lines.length; j++) {

      const value = lines[j].trim();

      if (!value) continue;

      // ignorar otros headers
      if (/^\d+\./.test(value)) continue;

      return sanitizeValue(value);
    }
  }

  return "";
}
function sanitizeValue(value: string): string {

  return value
    .replace(/\s{2,}/g, " ")
    .replace(/[^\wÁÉÍÓÚÑáéíóúñ\s&.,-]/g, "")
    .trim();
}

/**
 * Normaliza el nombre del tipo de documento a su código estándar.
 * @param tipoDoc - Nombre del tipo de documento (ej: "Cédula de Ciudada", "NIT")
 * @returns Código corto (ej: "CC", "NIT", "CE", etc.)
 */
function normalizeTipoDocumento(tipoDoc: string): string {
  const doc = tipoDoc.toLowerCase().trim();

  if (doc.includes('jurídica')) return 'NIT';
  if (doc.includes('cédula') && doc.includes('ciudada')) return 'CC';
  if (doc.includes('cédula') && doc.includes('extranjería')) return 'CE';
  if (doc === 'nit') return 'NIT';
  if (doc.includes('tarjeta') && doc.includes('identidad')) return 'TI';
  if (doc.includes('tarjeta') && doc.includes('extranjería')) return 'TE';
  if (doc.includes('pasaporte')) return 'PA';
  if (doc.includes('registro') && doc.includes('civil')) return 'RC';
  if (doc.includes('documento') && doc.includes('extranjero')) return 'DE';

  return tipoDoc; // Si no coincide, devolver el original
}

/**
 * Parsea una línea de datos de ubicación con el formato:
 * "COLOMBIA   1   6   9   Bogotá D.C.   1   1   Bogotá, D.C.   0   0   1"
 * Extrae país, código país (3 dígitos), departamento, código dpto (2 dígitos), 
 * ciudad, código municipio (3 dígitos).
 */
function parseLocationDataLine(dataLine: string): {
  pais: string;
  codigoPais: string;
  departamento: string;
  codigoDepartamento: string;
  ciudad: string;
  codigoMunicipio: string;
} | null {

  // Extraer todos los dígitos
  const allDigits = extractAllDigits(dataLine);

  // Esperamos al menos 8 dígitos: 3 (país) + 2 (dpto) + 3 (municipio)
  if (allDigits.length < 8) {
    console.warn('⚠️ [UBICACION] No hay suficientes dígitos para códigos');
    return null;
  }

  // Extraer códigos desde el inicio (son los primeros 8 dígitos):
  // Primeros 3 dígitos = código país
  const codigoPais = allDigits.substring(0, 3);
  // Siguientes 2 dígitos = código departamento
  const codigoDepartamento = allDigits.substring(3, 5);
  // Siguientes 3 dígitos = código municipio
  const codigoMunicipio = allDigits.substring(5, 8);

  // Ahora extraer los nombres de texto
  // Estrategia: dividir por los códigos numéricos y tomar los segmentos de texto

  // Remover todos los dígitos sueltos (con espacios) de la línea
  let cleanLine = dataLine;

  // Reemplazar secuencias de dígitos espaciados por un separador
  cleanLine = cleanLine.replace(/(?:\d\s*)+/g, '|');

  // Dividir por el separador y limpiar
  const segments = cleanLine
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let pais = '';
  let departamento = '';
  let ciudad = '';

  if (segments.length >= 3) {
    pais = segments[0];
    departamento = segments[1];
    ciudad = segments[2];
  } else if (segments.length === 2) {
    pais = segments[0];
    departamento = segments[1];
  } else if (segments.length === 1) {
    pais = segments[0];
  }


  return {
    pais,
    codigoPais,
    departamento,
    codigoDepartamento,
    ciudad,
    codigoMunicipio
  };
}

// --- Parsers de secciones (basados en líneas) ---

/**
 * Parsea la sección header usando el patrón de líneas.
 * Línea header: "5. Número de Identificación Tributaria (NIT) 6. DV 12. Dirección seccional ..."
 * O también: "Identificación Tributaria (NIT)   6. DV  12. Dirección seccional ..."
 * Línea datos:  "9   0   0   6   3   2   6   6   4   7   Impuestos de Medellín   1   1"
 * 
 * IMPORTANTE: 
 * - Persona jurídica: NIT = 9 dígitos, DV = dígito 10
 * - Persona natural: NIT = 10 dígitos, DV = dígito 11
 */
function parseHeaderFromLines(lines: string[], allLines: string[]): HeaderData {
  let nit = '', dv = '', concepto = '', numeroFormulario = '', direccionSeccional = '', codDireccionSeccional = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // NIT y DV: línea con "NIT" y "DV", datos en la siguiente línea
    // Patrón flexible: puede empezar con "5." o directamente con "Identificación"
    if (/(?:5\.)?\s*(?:N[úu]mero\s+de\s+)?Identificaci[oó]n\s+Tributaria.*NIT/i.test(line) && /6\.?\s*DV/i.test(line)) {

      if (i + 1 < lines.length) {
        const dataLine = lines[i + 1];

        // Extraer todos los dígitos
        const allDigits = extractAllDigits(dataLine);

        // Intentar detectar si es persona natural o jurídica
        // Buscar en TODAS las líneas del documento (no solo en header)
        let isPersonaNatural = false;
        for (let j = 0; j < allLines.length; j++) {
          if (/Persona\s+natural/i.test(allLines[j])) {
            isPersonaNatural = true;
            break;
          } else if (/Persona\s+jur[ií]dica/i.test(allLines[j])) {
            break;
          }
        }

        // Extraer NIT y DV según el tipo
        // Formato línea: "1   0   0   7   1   6   1   7   0   4   3   Impuestos de Bogotá   3   2"
        // Primeros 10/9 dígitos: NIT
        // Siguiente dígito: DV
        // Texto: Dirección seccional
        // Últimos 2 dígitos: Código dirección seccional

        if (isPersonaNatural) {
          // Persona natural: 10 dígitos NIT + 1 DV + texto + código seccional
          if (allDigits.length >= 11) {
            nit = allDigits.substring(0, 10);
            dv = allDigits[10];

            // Código dirección seccional: últimos dígitos después del texto
            if (allDigits.length >= 13) {
              codDireccionSeccional = allDigits.substring(allDigits.length - 2);
            }
          } else if (allDigits.length === 10) {
            nit = allDigits;
            console.warn('⚠️ [HEADER] Solo 10 dígitos - NIT sin DV (persona natural)');
          }
        } else {
          // Persona jurídica: 9 dígitos NIT + 1 DV + texto + código seccional
          if (allDigits.length >= 10) {
            nit = allDigits.substring(0, 9);
            dv = allDigits[9];

            // Código dirección seccional: últimos dígitos después del texto
            if (allDigits.length >= 12) {
              codDireccionSeccional = allDigits.substring(allDigits.length - 2);
            }

          } else if (allDigits.length === 9) {
            nit = allDigits;
            console.warn('⚠️ [HEADER] Solo 9 dígitos - NIT sin DV (persona jurídica)');
          }
        }

        // Dirección seccional: buscar texto entre los dígitos del NIT/DV y el código seccional
        // Remover todos los dígitos y extraer el texto
        const textParts = dataLine.split(/\d/).filter(p => p.trim().length > 2);
        if (textParts.length > 0) {
          direccionSeccional = textParts[textParts.length - 1].trim();
        }
      }
    }

    // Concepto
    const conceptoMatch = line.match(
      /Concepto[.\s:]*(\d)\s*(\d)\s*([^\d\n]+)/i
    );

    if (conceptoMatch) {
      concepto = `${conceptoMatch[1]}${conceptoMatch[2]} ${conceptoMatch[3].trim()}`;
    }


    // Número formulario
    const formularioMatch = line.match(/(?:FORMULARIO|No\.?\s*Formulario)[.\s:]*(\d{6,15})/i);
    if (formularioMatch) {
      numeroFormulario = formularioMatch[1].trim();
    }
  }
  return { concepto, numeroFormulario, nit, dv, direccionSeccional, codDireccionSeccional: codDireccionSeccional || null };
}

/**
 * Parsea la sección ubicación usando el patrón de líneas.
 * Patrón header/datos:
 *   "38. País  39. Departamento  40. Ciudad/Municipio"
 *   "COLOMBIA   1   6   9   Bogotá D.C.   1   1   Bogotá, D.C.   0   0   1"
 * Estructura de datos:
 *   - País (texto) + código país (3 dígitos)
 *   - Departamento (texto con posibles puntos/comas) + código departamento (2 dígitos)
 *   - Ciudad (texto con posibles puntos/comas) + código municipio (3 dígitos)
 * Patrón header/datos:
 *   "41. Dirección principal"
 *   "CL 2   20   50"
 * Datos en la misma línea del título:
 *   "42. Correo electrónico contabilidad@aireverde.co"
 *   "43. Código postal    44. Teléfono 1 6 0 4 4 4 8 4 9 1 9   45. Teléfono 2 3 1 1 3 2 8 8 7 3 9"
 */
function parseUbicacionFromLines(lines: string[]): UbicacionData {
  let pais = '', codigoPais: string | null = null;
  let departamento = '', codigoDepartamento: string | null = null;
  let ciudad = '', codigoMunicipio: string | null = null;
  let direccion = '', email = '';
  let codigoPostal: string | null = null, telefono1 = '', telefono2: string | null = null;


  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // País, Departamento, Ciudad: header "38. País" → datos en la siguiente línea
    if (/38\.?\s*Pa[ií]s/i.test(line) && /39\.?\s*Departamento/i.test(line)) {

      if (i + 1 < lines.length) {
        const dataLine = lines[i + 1];

        // Extraer segmentos usando patrón: Texto seguido de dígitos
        // Patrón esperado: "TEXTO   XXX   TEXTO   XX   TEXTO   XXX"
        // donde XXX son códigos numéricos

        const result = parseLocationDataLine(dataLine);

        if (result) {
          pais = result.pais;
          codigoPais = result.codigoPais;
          departamento = result.departamento;
          codigoDepartamento = result.codigoDepartamento;
          ciudad = result.ciudad;
          codigoMunicipio = result.codigoMunicipio;

        } else {
          console.warn('⚠️ [UBICACION] No se pudo parsear la línea de ubicación');
        }
      }
    }

    // Dirección: header "41. Dirección" → datos en la siguiente línea
    if (/41\.?\s*Direcci[oó]n/i.test(line)) {
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        // Si la siguiente línea NO es otro header de campo, es la dirección
        if (!/42\.?\s*Correo/i.test(nextLine) && !/^\d{2}\.\s/.test(nextLine)) {
          direccion = nextLine.replace(/\s{2,}/g, ' ').trim();
        }
      }
    }

    // Correo: "42. Correo electrónico ..." con email en la misma línea o siguiente
    // La línea puede contener también teléfonos después del email
    // Ej: "diservaventas@hotmail.com   3   1   2   7   1   6   5   8   6   2   3   0   4   3   4   0   5   8   4   1"
    if (/42\.?\s*Correo/i.test(line)) {
      // console.log('📧 [UBICACION] Línea con marcador 42. Correo:', line);

      // Primero intentar extraer de la misma línea
      let emailMatch = line.match(/([\w.-]+@[\w.-]+\.\w{2,})/);

      if (emailMatch) {
        email = emailMatch[1];
        // console.log('📧 [UBICACION] Email extraído de la misma línea:', email);

        // Extraer teléfonos de la parte después del email
        const afterEmail = line.substring(line.indexOf(email) + email.length);
        // console.log('📧 [UBICACION] Texto después del email:', afterEmail);

        // Extraer todos los dígitos
        const allDigitsAfterEmail = extractAllDigits(afterEmail);
        // console.log('📧 [UBICACION] Dígitos después del email:', allDigitsAfterEmail);

        // Si tenemos suficientes dígitos, extraer teléfonos
        // Estructura típica: Teléfono1(10) + CodigoPostal(variable) + Teléfono2(10)
        // O simplemente: Teléfono1(10) + Teléfono2(10)
        if (allDigitsAfterEmail.length >= 10) {
          // Primer teléfono: primeros 10 dígitos
          telefono1 = allDigitsAfterEmail.substring(0, 10);
          // console.log('📧 [UBICACION] Teléfono 1 extraído:', telefono1);

          // Si hay más dígitos, buscar segundo teléfono
          if (allDigitsAfterEmail.length >= 20) {
            // Segundo teléfono: siguientes 10 dígitos (posición 10-20)
            telefono2 = allDigitsAfterEmail.substring(10, 20);
            // console.log('📧 [UBICACION] Teléfono 2 extraído:', telefono2);
          }
        }

      } else if (i + 1 < lines.length) {
        // Si no está en la misma línea, buscar en la siguiente
        const nextLine = lines[i + 1];
        // console.log('📧 [UBICACION] Buscando en línea siguiente:', nextLine);
        emailMatch = nextLine.match(/([\w.-]+@[\w.-]+\.\w{2,})/);
        if (emailMatch) {
          email = emailMatch[1];
          //   console.log('📧 [UBICACION] Email extraído de línea siguiente:', email);
        }
      }


    }

    // Teléfonos y código postal: datos en la misma línea del título
    if (/43\.?\s*C[oó]digo\s*postal/i.test(line)) {
      // Código postal: dígitos entre "43. Código postal" y "44."
      const postalMatch = line.match(/43\.?\s*C[oó]digo\s*postal\s*([\d\s]*?)(?:\s*44\.|$)/i);
      if (postalMatch) {
        const digits = extractAllDigits(postalMatch[1]);
        codigoPostal = digits || null;
      }

      // Teléfono 1: dígitos entre "44. Teléfono 1" y "45."
      const tel1Match = line.match(/44\.?\s*Tel[eé]fono\s*1\s+([\d\s]+?)(?:\s*45\.|$)/i);
      if (tel1Match) {
        telefono1 = extractAllDigits(tel1Match[1]);
      }

      // Teléfono 2: dígitos después de "45. Teléfono 2"
      const tel2Match = line.match(/45\.?\s*Tel[eé]fono\s*2\s+([\d\s]+)/i);
      if (tel2Match) {
        const digits = extractAllDigits(tel2Match[1]);
        telefono2 = digits || null;
      }
    }
  }

  // Priorizar celular colombiano (3XX) sobre teléfono fijo
  if (telefono2 && telefono2.startsWith('3') && !telefono1.startsWith('3')) {
    [telefono1, telefono2] = [telefono2, telefono1];
  }

  return {
    pais,
    codigoPais,
    departamento,
    codigoDepartamento,
    ciudad,
    codigoMunicipio,
    direccion,
    email,
    codigoPostal,
    telefono1,
    telefono2
  };
}

/**
 * Parsea la sección clasificación usando el patrón de líneas.
 * Línea header: "46. Código  47. Fecha inicio actividad 48. Código  49. ..."
 * Línea datos:  "4   3   2   2   2   0   1   3   0   7   0   5   4   2   9   0 ..."
 *
 * Layout posicional de dígitos:
 *   46. Código actividad principal: 4 dígitos
 *   47. Fecha inicio actividad principal: 8 dígitos (YYYYMMDD)
 *   48. Código actividad secundaria: 4 dígitos
 *   49. Fecha inicio actividad secundaria: 8 dígitos (YYYYMMDD)
 *   50. Código otra actividad 1: 4 dígitos
 *   50. Código otra actividad 2: 4 dígitos (si hay suficientes)
 */
function parseClasificacionFromLines(lines: string[]): ClasificacionData {
  let actividadPrincipal = '', fechaInicioActividadPrincipal = '';
  let actividadSecundaria: string | null = null, fechaInicioActividadSecundaria: string | null = null;
  let otraActividad1: string | null = null, otraActividad2: string | null = null;
  let ocupacion: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Códigos de actividad: header con "46. Código" → datos en la siguiente línea
    if (/46\.?\s*C[oó]digo/i.test(line)) {
      if (i + 1 < lines.length) {
        const dataLine = lines[i + 1];
        const digits = extractAllDigits(dataLine);

        let pos = 0;

        // 46. Código actividad principal (4 dígitos)
        if (digits.length >= pos + 4) {
          actividadPrincipal = digits.substring(pos, pos + 4);
          pos += 4;
        }

        // 47. Fecha inicio actividad principal (8 dígitos)
        if (digits.length >= pos + 8) {
          fechaInicioActividadPrincipal = digits.substring(pos, pos + 8);
          pos += 8;
        }

        // 48. Código actividad secundaria (4 dígitos)
        if (digits.length >= pos + 4) {
          const code = digits.substring(pos, pos + 4);
          actividadSecundaria = code === '0000' ? null : code;
          pos += 4;
        }

        // 49. Fecha inicio actividad secundaria (8 dígitos)
        if (digits.length >= pos + 8) {
          const date = digits.substring(pos, pos + 8);
          fechaInicioActividadSecundaria = date === '00000000' ? null : date;
          pos += 8;
        }

        // 50. Código otra actividad 1 (4 dígitos)
        if (digits.length >= pos + 4) {
          const code = digits.substring(pos, pos + 4);
          otraActividad1 = code === '0000' ? null : code;
          pos += 4;
        }

        // 50. Código otra actividad 2 (4 dígitos, si quedan suficientes)
        if (digits.length >= pos + 4) {
          const code = digits.substring(pos, pos + 4);
          otraActividad2 = code === '0000' ? null : code;
          pos += 4;
        }
      }
    }
  }

  return {
    actividadPrincipal,
    fechaInicioActividadPrincipal,
    actividadSecundaria,
    fechaInicioActividadSecundaria,
    otraActividad1,
    otraActividad2,
    ocupacion,
  };
}
function parseIdentificacion(text: string): IdentificacionData {
  // Detectar tipo de contribuyente PRIMERO
  const tipoContribuyente =
    text.includes("Persona natural") || text.includes("sucesión ilíquida")
      ? "Persona natural"
      : text.includes("Persona jurídica") || text.includes("Persona jur")
        ? "Persona jurídica"
        : "";

  const isPersonaNatural = tipoContribuyente === "Persona natural";

  let tipoDocumento = extractFieldValue(text, 24);

  // Normalizar el tipo de documento
  if (tipoDocumento) {
    tipoDocumento = normalizeTipoDocumento(tipoDocumento);

  }

  let numeroIdentificacionRaw = extractFieldValue(text, 26);

  // Para persona natural, campos 24-26 suelen estar en la misma línea
  // Formato: "Persona natural o sucesión ilíquida   2   Cédula de Ciudadanía   1   3   1 0 0 7 1 6 1 7 0 4"
  let tipoDocCodigo = '';
  if (isPersonaNatural) {
    // Buscar la línea que contiene campos 24, 25 y 26
    const lines = text.split(/\r?\n/);
    const campoLine = lines.find(l => l.includes('24. Tipo de contribuyente'));

    if (campoLine && lines.indexOf(campoLine) < lines.length - 1) {
      const dataLine = lines[lines.indexOf(campoLine) + 1];

      // Extraer tipo de documento (texto hasta el código de 2 dígitos)
      // "Persona natural o sucesión ilíquida   2   Cédula de Ciudadanía   1   3   ..."
      const partes = dataLine.split(/\s{2,}/); // Separar por múltiples espacios

      // Buscar el nombre del tipo de documento (Cédula, Tarjeta, etc)
      const tipoDocIndex = partes.findIndex(p => /Cédula|Tarjeta|Pasaporte|Extranjería/i.test(p));
      if (tipoDocIndex >= 0) {
        tipoDocumento = partes[tipoDocIndex];

        // Los siguientes 2 elementos son dígitos del código de tipo doc
        if (tipoDocIndex + 2 < partes.length) {
          const dig1 = partes[tipoDocIndex + 1]?.trim();
          const dig2 = partes[tipoDocIndex + 2]?.trim();

          if (/^\d$/.test(dig1) && /^\d$/.test(dig2)) {
            tipoDocCodigo = dig1 + dig2;

            // El resto son los dígitos del número de identificación
            const restoParts = partes.slice(tipoDocIndex + 3);
            numeroIdentificacionRaw = restoParts.join(' ');
          }
        }
      }
    }
  }

  const razonSocial = extractFieldValue(text, 35);

  const nombreComercialRaw = extractFieldValue(text, 36);

  const sigla = extractFieldValue(text, 37);

  let numeroIdentificacion = '';
  let dv = '';


  // Para persona natural no hay DV en identificación, solo número de cédula (10 dígitos)
  // Para persona jurídica sí hay NIT (9 dígitos) + DV (1 dígito)

  const nitLength = isPersonaNatural ? 10 : 9;
  const extractDV = !isPersonaNatural; // Solo extraer DV para persona jurídica


  // Estrategia 1: Usar regex mejorado para extraer número de identificación del campo 26
  if (numeroIdentificacionRaw) {
    // Para persona natural: extraer 10 dígitos (cédula)
    // Para persona jurídica: extraer 9 dígitos + 1 DV
    const digitPattern = isPersonaNatural ? /^((?:\d\s*){10})/ : /^((?:\d\s*){9,10})/;
    const nitMatch = numeroIdentificacionRaw.match(digitPattern);

    if (nitMatch) {
      const digits = nitMatch[1].replace(/\s/g, '');
      if (digits.length >= nitLength) {
        numeroIdentificacion = digits.substring(0, nitLength);
        if (extractDV) {
          dv = digits[nitLength] || '';
        }

      }
    } else {
      // Fallback: extraer todos los dígitos
      const allDigits = extractAllDigits(numeroIdentificacionRaw);

      if (allDigits.length >= nitLength) {
        numeroIdentificacion = allDigits.substring(0, nitLength);
        if (extractDV) {
          dv = allDigits[nitLength] || '';
        }
      }
    }
  }
  // Estrategia 2: Si campo 26 no tiene suficientes dígitos, intentar desde campo 36 (nombreComercial)
  // Nota: Esta estrategia normalmente solo aplica para persona jurídica
  if (!numeroIdentificacion && nombreComercialRaw && !isPersonaNatural) {

    const digitPattern = /^((?:\d\s*){9,10})/;
    const nitMatch = nombreComercialRaw.match(digitPattern);

    if (nitMatch) {
      const digits = nitMatch[1].replace(/\s/g, '');
      if (digits.length >= nitLength) {
        numeroIdentificacion = digits.substring(0, nitLength);
        if (extractDV) {
          dv = digits[nitLength] || '';
        }

      }
    } else {
      // Fallback: extraer todos los dígitos
      const digitsFromNombre = extractAllDigits(nombreComercialRaw);

      if (digitsFromNombre.length >= nitLength) {
        numeroIdentificacion = digitsFromNombre.substring(0, nitLength);
        if (extractDV) {
          dv = digitsFromNombre[nitLength] || '';
        }

      }
    }
  }

  // Estrategia 3: Buscar campo 5 (NIT del header) dentro del texto completo de identificación
  // Nota: Para persona natural, el header tiene NIT con DV, pero en identificación solo se usa el número sin DV
  if (!numeroIdentificacion) {

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/5\.?\s*N[úu]mero\s+de\s+Identificaci[oó]n\s+Tributaria.*NIT.*6\.?\s*DV/i.test(line)) {

        if (i + 1 < lines.length) {
          const dataLine = lines[i + 1];

          const allDigits = extractAllDigits(dataLine);
          if (allDigits.length >= nitLength) {
            numeroIdentificacion = allDigits.substring(0, nitLength);
            // Para persona jurídica extraer DV, para persona natural no
            if (extractDV) {
              dv = allDigits[nitLength] || '';
            }


            break;
          }
        }
      }
    }
  }

  if (!numeroIdentificacion) {
    console.warn('⚠️ [IDENTIFICACION] No se pudo extraer NIT/DV de ninguna fuente');
  }

  // Limpiar nombreComercial: remover dígitos sueltos del inicio si parecen ser el NIT
  let nombreComercial = nombreComercialRaw;
  if (nombreComercial && numeroIdentificacion) {
    const digitPattern = /^(?:\d\s*){9,}\s*/;
    if (digitPattern.test(nombreComercial)) {
      nombreComercial = nombreComercial.replace(digitPattern, '').trim();
    }
  }

  // Extraer nombres (campos 31-34)
  let primerApellido = '';
  let segundoApellido = '';
  let primerNombre = '';
  let otrosNombres = '';

  // Para persona natural, extraer nombres directamente de la línea sin sanitizar
  if (isPersonaNatural) {

    const lines = text.split(/\r?\n/);
    const nombreFieldIndex = lines.findIndex(l => l.includes('31. Primer apellido'));

    if (nombreFieldIndex >= 0 && nombreFieldIndex + 1 < lines.length) {
      const nombreLine = lines[nombreFieldIndex + 1].trim();

      // Separar por espacios múltiples (2 o más)
      const nombresParts = nombreLine.split(/\s{2,}/).filter(p => p.trim() && !/^\d+\./.test(p));

      if (nombresParts.length >= 3) {
        primerApellido = nombresParts[0].trim();
        segundoApellido = nombresParts[1].trim();
        primerNombre = nombresParts[2].trim();
        otrosNombres = nombresParts.slice(3).join(' ').trim();

      } else if (nombresParts.length === 2) {
        primerApellido = nombresParts[0].trim();
        primerNombre = nombresParts[1].trim();

      } else if (nombresParts.length === 1) {
        // Solo un nombre, asumir que es primer apellido
        primerApellido = nombresParts[0].trim();

      }
    }
  } else {
    // Para persona jurídica, usar extractFieldValue normal
    primerApellido = extractFieldValue(text, 31);
    segundoApellido = extractFieldValue(text, 32);
    primerNombre = extractFieldValue(text, 33);
    otrosNombres = extractFieldValue(text, 34);
  }
  const result = {
    tipoContribuyente,
    tipoDocumento: normalizeTipoDocumento(tipoDocumento),
    tipoDocCodigo: isPersonaNatural ? tipoDocCodigo : undefined,
    numeroIdentificacion,
    dv: extractDV ? dv : '', // DV vacío para persona natural
    razonSocial,
    nombreComercial,
    sigla,
    primerApellido,
    segundoApellido,
    primerNombre,
    otrosNombres,
    fechaExpedicion: "",
    lugarExpedicionPais: "",
    lugarExpedicionDepartamento: "",
    lugarExpedicionCiudad: ""
  };

  return result;
}


/**
 * Parsea la sección de responsabilidades del RUT.
 * Extrae código (2 dígitos) y nombre de cada responsabilidad desde las líneas descriptivas.
 * Formato por línea: "XX- Nombre responsabilidad" o "XX - Nombre responsabilidad"
 * Puede haber 2 responsabilidades por línea separadas por 2+ espacios:
 *   "05- Impto. renta y compl. régimen ordinar  52 - Facturador electrónico"
 */
function parseResponsabilidades(text: string): ResponsabilidadesData {
  const items: ResponsabilidadItem[] = [];
  const codigosVistos = new Set<string>();
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    // Separar por 2+ espacios para manejar múltiples responsabilidades por línea
    const segments = line.split(/\s{2,}/);

    for (const segment of segments) {
      const trimmed = segment.trim();
      // Patrón: "XX- Nombre" o "XX - Nombre" donde XX son 2 dígitos
      const match = trimmed.match(/^(\d{2})\s*-\s*(.+)$/);
      if (match) {
        const codigo = match[1];
        const nombre = match[2].trim();
        // Evitar duplicados
        if (!codigosVistos.has(codigo)) {
          codigosVistos.add(codigo);
          items.push({ codigo, nombre });
        }
      }
    }
  }

  return { codigos: items };
}


/**
 * Casillas del RUT para Representantes Legales (por bloque):
 * 98: Representación (REPRS LEGAL PRIN/SUPL)
 * 99: Código
 * 100: Tipo de documento
 * 101: Número de identificación
 * 102: DV
 * 103: Fecha expedición
 * 104: Primer apellido
 * 105: Segundo apellido
 * 106: Primer nombre
 * 107: Otros nombres
 * 108: Razón social
 * 109: Fecha inicio vinculación
 */

function parseRepresentantesLegales(text: string): RepresentanteLegalData[] {
  if (!text.trim()) {
    return [];
  }

  // console.log('🟣 [REPRS_LEGALES] Iniciando parsing de representantes legales');

  const representantes: RepresentanteLegalData[] = [];

  // Dividir en bloques buscando "REPRS LEGAL PRIN" o "REPRS LEGAL SUPL"
  const bloques = text.split(/(?=REPRS?\s+LEGAL\s+(?:PRIN|SUPL))/i);

  // console.log('🟣 [REPRS_LEGALES] Total de bloques encontrados:', bloques.length);

  for (let idx = 0; idx < bloques.length; idx++) {
    const bloque = bloques[idx];
    const trimmed = bloque.trim();
    if (!trimmed) continue;

    // console.log(`🟣 [REPRS_LEGALES] Procesando bloque ${idx}:`, trimmed.substring(0, 100));

    // Detectar tipo de representante desde el inicio del bloque
    // Formato: "REPRS LEGAL PRIN   1   8 2   0   1   3   0   7   1   3"
    //                           ↑ código (2 dígitos) ↑ fecha (8 dígitos)
    const tipoMatch = trimmed.match(/^(REPRS?\s+LEGAL\s+(PRIN|SUPL))\s+((?:\d\s*){2})((?:\d\s*){8})/i);
    if (!tipoMatch) {
      // console.log(`🟣 [REPRS_LEGALES] Bloque ${idx} sin match de tipo, saltando`);
      continue;
    }

    const tipoRepTexto = tipoMatch[2]; // "PRIN" o "SUPL"
    const codRepresentante = extractAllDigits(tipoMatch[3]); // 2 dígitos
    const fechaInicio = extractAllDigits(tipoMatch[4]); // 8 dígitos

    // console.log(`🟣 [REPRS_LEGALES] Bloque ${idx} - Tipo: ${tipoRepTexto}, Código: ${codRepresentante}, Fecha: ${fechaInicio}`);

    const tipoRepresentante = tipoRepTexto.toUpperCase() === 'PRIN' ? 'Principal' : 'Suplente';

    const lines = trimmed.split(/\r?\n/);

    // Buscar tipo de documento (campo 100)
    let tipoDocumento = '';
    let tipoDocCodigo = '';
    let numeroIdentificacion = '';
    let dv = '';

    const tipoDocLineIndex = lines.findIndex(l => l.includes('100. Tipo de documento'));
    if (tipoDocLineIndex >= 0 && tipoDocLineIndex + 1 < lines.length) {
      const dataLine = lines[tipoDocLineIndex + 1];

      // console.log(`🟣 [REPRS_LEGALES] Bloque ${idx} - Línea de datos doc:`, dataLine);

      // Validar que no sea solo un header numérico
      if (/^\d+$/.test(dataLine.trim()) || /^\d+\./.test(dataLine.trim())) {
        // console.log(`🟣 [REPRS_LEGALES] Bloque ${idx} - Solo headers sin datos, saltando`);
        continue;
      }

      // Formato: "Cédula de Ciudadaní   1   3 7   9   4   6   8   1   6   8"
      // Extraer: texto + código tipo doc (2) + número identificación (10)

      // Extraer todos los dígitos
      const allDigits = extractAllDigits(dataLine);
      // console.log(`🟣 [REPRS_LEGALES] Bloque ${idx} - Dígitos extraídos:`, allDigits, 'length:', allDigits.length);

      // Validar que tengamos al menos tipoDocCodigo(2) + numId mínimo(7) = 9 dígitos
      if (allDigits.length >= 9) {
        // Primeros 2 dígitos: código tipo documento
        tipoDocCodigo = allDigits.substring(0, 2);

        // Extraer texto del tipo de documento (sin dígitos)
        const parts = dataLine.split(/\s{2,}/);
        if (parts.length > 0) {
          tipoDocumento = parts[0].replace(/\d/g, '').trim();
          // Normalizar el tipo de documento
          tipoDocumento = normalizeTipoDocumento(tipoDocumento);
        }

        // console.log(`🟣 [REPRS_LEGALES] Bloque ${idx} - TipoDoc extraído: ${tipoDocumento}, TipoDocCodigo: ${tipoDocCodigo}`);

        // Extraer número de identificación y DV
        const esNIT = /NIT/i.test(tipoDocumento);
        // console.log(`🟣 [REPRS_LEGALES] Bloque ${idx} - Es NIT: ${esNIT}, TipoDoc: ${tipoDocumento}`);

        if (esNIT && allDigits.length >= 12) {
          // Para NIT: tipoDocCodigo(2) + numeroId(9) + DV(1) = 12 dígitos mínimo
          numeroIdentificacion = allDigits.substring(2, 11); // 9 dígitos
          dv = allDigits[11]; // dígito 10
        } else {
          // Para Cédula: tipoDocCodigo(2) + numeroId(7-10 dígitos)
          // El DV está en la línea siguiente (campo 102)
          const numIdLength = allDigits.length - 2; // Todos los dígitos menos el tipoDocCodigo

          if (numIdLength >= 7 && numIdLength <= 10) {
            numeroIdentificacion = allDigits.substring(2); // Los dígitos restantes

            // Buscar DV en línea siguiente
            if (tipoDocLineIndex + 2 < lines.length) {
              const dvLine = lines[tipoDocLineIndex + 2].trim();


              if (/^\d$/.test(dvLine)) {
                dv = dvLine;
              }
            }
          }
        }
      }
    }

    if (!numeroIdentificacion) {
      continue;
    }

    // Buscar nombres (campos 104-107)
    let primerApellido = '';
    let segundoApellido = '';
    let primerNombre = '';
    let otrosNombres = '';

    const nombresLineIndex = lines.findIndex(l => l.includes('104. Primer apellido'));
    if (nombresLineIndex >= 0 && nombresLineIndex + 1 < lines.length) {
      const nombresLine = lines[nombresLineIndex + 1].trim();


      // Dividir por cualquier espacio (uno o más)
      const nombresParts = nombresLine.split(/\s+/).filter(p => p.trim() && !/^\d+\./.test(p));

      // Asignar según posiciones: apellido1 apellido2 nombre1 [nombre2...]
      if (nombresParts.length >= 3) {
        primerApellido = nombresParts[0];
        segundoApellido = nombresParts[1];
        primerNombre = nombresParts[2];
        otrosNombres = nombresParts.slice(3).join(' ') || '';
      } else if (nombresParts.length === 2) {
        primerApellido = nombresParts[0];
        primerNombre = nombresParts[1];
        segundoApellido = '';
      } else if (nombresParts.length === 1) {
        primerApellido = nombresParts[0];
        segundoApellido = '';
        primerNombre = '';
      }

    }

    // console.log(`🟣 [REPRS_LEGALES] Bloque ${idx} - Agregando representante:`, {
    //   tipo: tipoRepresentante,
    //   tipoDoc: tipoDocumento,
    //   numId: numeroIdentificacion,
    //   dv,
    //   nombre: `${primerApellido} ${segundoApellido} ${primerNombre} ${otrosNombres}`.trim()
    // });

    representantes.push({
      tipoRepresentacion: tipoRepresentante,
      codRepresentante,
      tipoDocumento,
      tipoDocCodigo,
      numeroIdentificacion,
      dv,
      fechaExpedicion: null,
      lugarExpedicionPais: null,
      lugarExpedicionDepartamento: null,
      lugarExpedicionCiudad: null,
      primerApellido,
      segundoApellido,
      primerNombre,
      otrosNombres,
      razonSocial: null,
      fechaInicioVinculacion: fechaInicio,
    });

  }

  // console.log(`🟣 [REPRS_LEGALES] Total de representantes procesados: ${representantes.length}`);
  return representantes;
}

/**
 * Casillas del RUT para Socios (por bloque):
 * 111: Tipo de documento
 * 112: Número de identificación
 * 113: DV
 * 114: Nacionalidad
 * 115: Primer apellido
 * 116: Segundo apellido
 * 117: Primer nombre
 * 118: Otros nombres
 * 119: Razón social
 * 120: Valor capital del socio
 * 121: % Participación
 * 122: Fecha de ingreso
 * 123: Fecha de retiro
 */

function parseSocios(text: string): SocioData[] {
  if (!text.trim()) return [];

  const socios: SocioData[] = [];

  // Dividir en bloques por "111. Tipo de documento"
  const bloques = text.split(/(?=111\.\s*Tipo de documento)/);



  for (let bloqueIdx = 0; bloqueIdx < bloques.length; bloqueIdx++) {
    const bloque = bloques[bloqueIdx];
    if (!bloque.trim() || !/111\.\s*Tipo de documento/.test(bloque)) {
      continue;
    }

    // console.log(`🔵 [SOCIOS] ==================== PROCESANDO BLOQUE ${bloqueIdx} ====================`);
    // console.log(`🔵 [SOCIOS] Longitud del bloque: ${bloque.length} caracteres`);
    // console.log(`🔵 [SOCIOS] Primeros 200 caracteres:`, bloque.substring(0, 200));

    // Buscar la línea con tipo de documento, número de identificación y nacionalidad
    // Formato: "Cédula de Ciudada   1   3 3   0   2   7   0   1   7   4  COLOMBIA   1   6   9"
    // o: "NIT   3   1 9   0   0   3   6   8   4   7   0 3  COLOMBIA   1   6   9"
    const bloqueLines = bloque.split('\n');

    let tipoDocumento = '';
    let tipoDocCodigo: string | null = null;
    let numeroIdentificacion = '';
    let dv: string | null = null;
    let nacionalidad: string | null = null;
    let codPaisNacionalidad: string | null = null;

    // Buscar la línea que contiene el tipo de documento y datos
    // Esta línea viene después de "111. Tipo de documento 112. Número..."
    let docLineIndex = -1;
    for (let i = 0; i < bloqueLines.length; i++) {
      const line = bloqueLines[i];
      // La línea de datos tiene formato: "Texto   dígitos espaciados   TEXTO   dígitos"
      if (/^(Cédula|NIT|Tarjeta|Pasaporte)/i.test(line.trim()) && /\d/.test(line)) {
        docLineIndex = i;
        break;
      }
    }

    if (docLineIndex >= 0) {
      const docLine = bloqueLines[docLineIndex];

      // Extraer tipo de documento (texto al inicio)
      const tipoMatch = docLine.match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\s+\d)/);
      if (tipoMatch) {
        tipoDocumento = normalizeTipoDocumento(tipoMatch[1].trim());
      }

      // Extraer todos los dígitos de la línea
      const allDigits = extractAllDigits(docLine);

      // Extraer nacionalidad (palabra en mayúsculas entre dígitos)
      const nacionalidadMatch = docLine.match(/\d\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+\d/);
      if (nacionalidadMatch) {
        nacionalidad = nacionalidadMatch[1].trim();
      }

      if (allDigits.length >= 12) {
        // Estructura: tipoDocCodigo(2) + numeroIdentificacion(7-10) + codPaisNacionalidad(3)
        // Mínimo: 2 + 7 + 3 = 12 dígitos
        tipoDocCodigo = allDigits.substring(0, 2);
        codPaisNacionalidad = allDigits.substring(allDigits.length - 3);

        // Número de identificación: lo que queda en el medio
        // Para cédula: 7-10 dígitos (a veces OCR pierde dígitos), para NIT: 9 dígitos + 1 DV
        numeroIdentificacion = allDigits.substring(2, allDigits.length - 3);

        // console.log(`🔵 [SOCIOS] Bloque ${bloqueIdx} - allDigits:`, allDigits);
        // console.log(`🔵 [SOCIOS] Bloque ${bloqueIdx} - tipoDocCodigo:`, tipoDocCodigo);
        // console.log(`🔵 [SOCIOS] Bloque ${bloqueIdx} - numeroIdentificacion:`, numeroIdentificacion);
        // console.log(`🔵 [SOCIOS] Bloque ${bloqueIdx} - codPaisNacionalidad:`, codPaisNacionalidad);

        // Si es NIT (código 31), el último dígito del numeroIdentificacion es el DV
        if (tipoDocCodigo === '31' && numeroIdentificacion.length > 1) {
          dv = numeroIdentificacion[numeroIdentificacion.length - 1];
          numeroIdentificacion = numeroIdentificacion.substring(0, numeroIdentificacion.length - 1);
        }

      } else {
        // console.log(`🔵 [SOCIOS] Bloque ${bloqueIdx} - allDigits insuficientes:`, allDigits, `(${allDigits.length} dígitos, se requieren >= 12)`);
      }
    }

    if (!numeroIdentificacion) {
      // console.log(`🔵 [SOCIOS] ⚠️ Bloque ${bloqueIdx} omitido - Sin número de identificación`);
      continue;
    }

    // Extraer nombres (buscar después de "115. Primer apellido...")
    let primerApellido: string | null = null;
    let segundoApellido: string | null = null;
    let primerNombre: string | null = null;
    let otrosNombres: string | null = null;

    // Buscar la línea con los nombres (después del header "115. Primer apellido...")
    let nombresLineIndex = -1;
    for (let i = 0; i < bloqueLines.length; i++) {
      if (/115\.\s*Primer apellido/.test(bloqueLines[i])) {
        // La línea de nombres está en la siguiente línea no vacía
        for (let j = i + 1; j < bloqueLines.length; j++) {
          const line = bloqueLines[j].trim();
          if (line && !/^\d+\./.test(line)) {
            nombresLineIndex = j;
            break;
          }
        }
        break;
      }
    }

    if (nombresLineIndex >= 0) {
      const nombresLine = bloqueLines[nombresLineIndex];

      // Dividir por espacios (intentar primero con espacios múltiples, luego simples)
      let partes = nombresLine.trim().split(/\s{2,}/);

      // Si solo hay una parte, intentar dividir por espacios simples
      if (partes.length === 1) {
        partes = nombresLine.trim().split(/\s+/);
      }


      // Asignar nombres según cantidad de partes
      if (partes.length === 1) {
        primerApellido = partes[0]?.trim() || null;
      } else if (partes.length === 2) {
        primerApellido = partes[0]?.trim() || null;
        primerNombre = partes[1]?.trim() || null;
      } else if (partes.length === 3) {
        primerApellido = partes[0]?.trim() || null;
        segundoApellido = partes[1]?.trim() || null;
        primerNombre = partes[2]?.trim() || null;
      } else if (partes.length >= 4) {
        primerApellido = partes[0]?.trim() || null;
        segundoApellido = partes[1]?.trim() || null;
        primerNombre = partes[2]?.trim() || null;
        // Todo lo demás va a otros nombres
        otrosNombres = partes.slice(3).join(' ').trim() || null;
      }

    }

    // Extraer razón social (si existe, después de "119. Razón social")
    let razonSocial: string | null = null;
    for (let i = 0; i < bloqueLines.length; i++) {
      if (/119\.\s*Razón social/.test(bloqueLines[i])) {
        for (let j = i + 1; j < bloqueLines.length; j++) {
          const line = bloqueLines[j].trim();
          if (line && !/^\d+\./.test(line)) {
            razonSocial = line;
            break;
          }
        }
        break;
      }
    }

    // Extraer fecha de ingreso (campo 122, 8 dígitos espaciados)
    let fechaDeIngreso: string | null = null;
    for (let i = 0; i < bloqueLines.length; i++) {
      if (/122\.\s*Fecha de ingreso/.test(bloqueLines[i])) {
        // La fecha está en la siguiente línea con formato "2   0   2   0   0   1   0   1"
        for (let j = i + 1; j < bloqueLines.length; j++) {
          const line = bloqueLines[j];
          const digitos = extractAllDigits(line);
          if (digitos.length === 8) {
            fechaDeIngreso = digitos;
            break;
          }
        }
        break;
      }
    }

    socios.push({
      tipoDocCodigo,
      tipoDocumento,
      numeroIdentificacion,
      dv,
      fechaExpedicion: null,
      lugarExpedicionPais: null,
      lugarExpedicionDepartamento: null,
      lugarExpedicionCiudad: null,
      nacionalidad,
      codPaisNacionalidad,
      primerApellido,
      segundoApellido,
      primerNombre,
      otrosNombres,
      razonSocial,
      porcentajeParticipacion: null,
      fechaInicioVinculacion: null,
      fechaDeIngreso,
    });

    // console.log(`🔵 [SOCIOS] ✅ Socio ${socios.length} agregado:`, primerApellido, segundoApellido, primerNombre, otrosNombres, '- CC:', numeroIdentificacion);
  }

  // console.log('🔵 [SOCIOS] ==================== RESUMEN ====================');
  // console.log('🔵 [SOCIOS] Total extraídos:', socios.length);
  // socios.forEach((s, i) => {
  //   console.log(`   ${i + 1}. ${s.primerApellido} ${s.segundoApellido} ${s.primerNombre} ${s.otrosNombres || ''} - CC: ${s.numeroIdentificacion}`);
  // });

  return socios;
}

/**
 * Casillas del RUT para Revisor Fiscal y Contador:
 *
 * Revisor Fiscal Principal: 124-135
 *   124: Tipo documento, 125: Número identificación, 126: DV,
 *   127: Número tarjeta profesional,
 *   128: Primer apellido, 129: Segundo apellido,
 *   130: Primer nombre, 131: Otros nombres,
 *   132: NIT sociedad, 133: DV sociedad, 134: Sociedad o firma designada,
 *   135: Fecha de nombramiento
 *
 * Revisor Fiscal Suplente: 136-147
 *   136: Tipo documento, 137: Número identificación, 138: DV,
 *   139: Número tarjeta profesional,
 *   140: Primer apellido, 141: Segundo apellido,
 *   142: Primer nombre, 143: Otros nombres,
 *   144: NIT sociedad, 145: DV sociedad, 146: Sociedad o firma designada,
 *   147: Fecha de nombramiento
 */

function parseRevisorFiscal(text: string, tipo: 'PRIN' | 'SUPL'): RevisorFiscalData | null {
  if (!text.trim()) {
    return null;
  }

  // Campos del revisor fiscal según tipo
  // Principal: 124-135, Suplente: 136-147
  const f = tipo === 'PRIN'
    ? { tipoDoc: 124, apellido1: 128, fechaNombramiento: 135, nit: 132, dv: 133, sociedad: 134 }
    : { tipoDoc: 136, apellido1: 140, fechaNombramiento: 147, nit: 144, dv: 145, sociedad: 146 };

  const lines = text.split(/\r?\n/);

  // --- Extraer tipo documento, número identificación, DV y tarjeta profesional ---
  let personaData = { tipoDocumento: '', tipoDocCodigo: '', numeroIdentificacion: '', dv: '', tarjetaProfesional: '' };

  const tipoDocLabel = `${f.tipoDoc}. Tipo de documento`;
  const tipoDocLineIndex = lines.findIndex(l => l.includes(tipoDocLabel));

  if (tipoDocLineIndex >= 0 && tipoDocLineIndex + 1 < lines.length) {
    const dataLine = lines[tipoDocLineIndex + 1];

    // Validar que la línea no sea otro header (campo numérico)
    if (!/^\d+\./.test(dataLine.trim())) {
      const logPrefix = tipo === 'PRIN' ? '🟣 [REV_FISCAL_PRIN]' : '🟣 [REV_FISCAL_SUPL]';
      personaData = parsePersonaDataLine(dataLine, logPrefix);
    } else {
      // console.log(`🟣 [REVISOR_FISCAL_${tipo}] Solo headers, sin datos registrados`);
      return null;
    }
  }

  if (!personaData.numeroIdentificacion) {
    // console.log(`🟣 [REVISOR_FISCAL_${tipo}] No hay número de identificación`);
    return null;
  }

  // --- Extraer nombres (campos 128-131 para principal, 140-143 para suplente) ---
  let primerApellido = '';
  let segundoApellido = '';
  let primerNombre = '';
  let otrosNombres = '';

  const nombresLabel = `${f.apellido1}. Primer apellido`;
  const nombresLineIndex = lines.findIndex(l => l.includes(nombresLabel));

  if (nombresLineIndex >= 0 && nombresLineIndex + 1 < lines.length) {
    const nombresLine = lines[nombresLineIndex + 1].trim();

    const nombresParts = nombresLine.split(/\s{2,}/).filter(p => p.trim() && !/^\d+\./.test(p));

    if (nombresParts.length >= 4) {
      primerApellido = nombresParts[0];
      segundoApellido = nombresParts[1];
      primerNombre = nombresParts[2];
      otrosNombres = nombresParts.slice(3).join(' ');
    } else if (nombresParts.length === 3) {
      primerApellido = nombresParts[0];
      segundoApellido = nombresParts[1];
      primerNombre = nombresParts[2];
    } else if (nombresParts.length === 2) {
      primerApellido = nombresParts[0];
      primerNombre = nombresParts[1];
    } else if (nombresParts.length === 1) {
      primerApellido = nombresParts[0];
    }

  }

  // --- Extraer fecha de nombramiento ---
  // Formato: "Revisor fiscal principal  135. Fecha de nombramiento"
  //          "2   0   2   5   1   0   0   2"
  let fechaNombramiento = '';
  const fechaLabel = `${f.fechaNombramiento}. Fecha`;
  const fechaLineIndex = lines.findIndex(l => l.includes(fechaLabel));
  if (fechaLineIndex >= 0 && fechaLineIndex + 1 < lines.length) {
    const fechaLine = lines[fechaLineIndex + 1];
    const fechaDigits = extractAllDigits(fechaLine);
    if (fechaDigits.length >= 8) {
      fechaNombramiento = fechaDigits.substring(0, 8);

    }
  }

  // --- Extraer NIT, DV y Sociedad o firma designada (casillas 132/144, 133/145, 134/146) ---
  let nitRevisor = '';
  let dvRevisor = '';
  let sociedadDesignada = '';

  const nitLabel = `${f.nit}. Número de Identificación Tributaria`;
  const nitLineIndex = lines.findIndex(l => l.includes(nitLabel));
  if (nitLineIndex >= 0 && nitLineIndex + 1 < lines.length) {
    const nitDataLine = lines[nitLineIndex + 1].trim();
    // Validar que no sea otro header
    if (!/^\d+\./.test(nitDataLine)) {
      const nitDigits = extractAllDigits(nitDataLine);
      // El NIT tiene 9 caracteres numéricos, DV es 1 carácter
      if (nitDigits.length >= 10) {
        nitRevisor = nitDigits.substring(0, 9);
        dvRevisor = nitDigits.substring(9, 10);
        // El resto de la línea es la sociedad designada
        const societyPart = nitDataLine.replace(/\d+/g, '').trim();
        if (societyPart) {
          sociedadDesignada = societyPart;
        }
      } else if (nitDigits.length >= 9) {
        nitRevisor = nitDigits.substring(0, 9);
      }
    }
  }

  // Si no encontramos la sociedad designada en la línea anterior, buscar en la siguiente
  if (!sociedadDesignada && nitLineIndex >= 0 && nitLineIndex + 2 < lines.length) {
    const dvLabel = `${f.dv}. DV`;
    const dvLineIndex = lines.findIndex(l => l.includes(dvLabel));
    if (dvLineIndex >= 0 && dvLineIndex + 1 < lines.length) {
      const societyLine = lines[dvLineIndex + 1].trim();
      if (!/^\d+\./.test(societyLine)) {
        // Extraer la parte textual (no numérica)
        const textParts = societyLine.split(/\d+/).filter(p => p.trim());
        if (textParts.length > 0) {
          sociedadDesignada = textParts.join('').trim();
        }
      }
    }
  }

  const result = {
    tipoDocumento: personaData.tipoDocumento,
    tipoDocCodigo: personaData.tipoDocCodigo,
    numeroIdentificacion: personaData.numeroIdentificacion,
    dv: personaData.dv,
    fechaExpedicion: null,
    lugarExpedicionPais: null,
    lugarExpedicionDepartamento: null,
    lugarExpedicionCiudad: null,
    primerApellido: primerApellido || null,
    segundoApellido: segundoApellido || null,
    primerNombre: primerNombre || null,
    otrosNombres: otrosNombres || null,
    tarjetaProfesional: personaData.tarjetaProfesional || null,
    fechaInicioVinculacion: fechaNombramiento || null,
    nit: nitRevisor || null,
    sociedadDesignada: sociedadDesignada || null,
  };
  return result;
}

/**
 * Casillas del RUT para Contador: 148-159
 *   148: Tipo documento, 149: Número identificación, 150: DV,
 *   151: Número tarjeta profesional,
 *   152: Primer apellido, 153: Segundo apellido,
 *   154: Primer nombre, 155: Otros nombres,
 *   156: NIT sociedad, 157: DV sociedad, 158: Sociedad o firma designada,
 *   159: Fecha de nombramiento
 */

function parseContador(text: string): ContadorData | null {

  if (!text.trim()) {
    return null;
  }

  const lines = text.split(/\r?\n/);

  // --- Extraer tipo documento, número identificación, DV y tarjeta profesional (campo 148) ---
  let personaData = { tipoDocumento: '', tipoDocCodigo: '', numeroIdentificacion: '', dv: '', tarjetaProfesional: '' };

  const tipoDocLineIndex = lines.findIndex(l => l.includes('148. Tipo de documento'));
  if (tipoDocLineIndex >= 0 && tipoDocLineIndex + 1 < lines.length) {
    const dataLine = lines[tipoDocLineIndex + 1];

    // Validar que la línea no sea otro header (campo numérico)
    if (!/^\d+\./.test(dataLine.trim())) {
      personaData = parsePersonaDataLine(dataLine, '🟠 [CONTADOR]');
    } else {
      // console.log('🟠 [CONTADOR] Solo headers, sin datos registrados');
      return null;
    }
  }

  if (!personaData.numeroIdentificacion) {
    // console.log('🟠 [CONTADOR] No hay número de identificación');
    return null;
  }

  // --- Buscar nombres (campos 152-155) ---
  let primerApellido = '';
  let segundoApellido = '';
  let primerNombre = '';
  let otrosNombres = '';

  const nombresLineIndex = lines.findIndex(l => l.includes('152. Primer apellido'));
  if (nombresLineIndex >= 0 && nombresLineIndex + 1 < lines.length) {
    const nombresLine = lines[nombresLineIndex + 1].trim();

    const nombresParts = nombresLine.split(/\s{2,}/).filter(p => p.trim() && !/^\d+\./.test(p));

    if (nombresParts.length >= 4) {
      primerApellido = nombresParts[0];
      segundoApellido = nombresParts[1];
      primerNombre = nombresParts[2];
      otrosNombres = nombresParts.slice(3).join(' ');
    } else if (nombresParts.length === 3) {
      primerApellido = nombresParts[0];
      segundoApellido = nombresParts[1];
      primerNombre = nombresParts[2];
    } else if (nombresParts.length === 2) {
      primerApellido = nombresParts[0];
      primerNombre = nombresParts[1];
    } else if (nombresParts.length === 1) {
      primerApellido = nombresParts[0];
    }

  }

  // --- Buscar fecha de nombramiento (campo 159) ---
  let fechaNombramiento = '';
  const fechaLineIndex = lines.findIndex(l => l.includes('159. Fecha'));
  if (fechaLineIndex >= 0 && fechaLineIndex + 1 < lines.length) {
    const fechaLine = lines[fechaLineIndex + 1];
    const fechaDigits = extractAllDigits(fechaLine);
    if (fechaDigits.length >= 8) {
      fechaNombramiento = fechaDigits.substring(0, 8);
    }
  }

  // --- Extraer NIT, DV y Sociedad o firma designada (casillas 156, 157, 158) ---
  let nitContador = '';
  let dvContador = '';
  let sociedadDesignada = '';

  const nitLabel = '156. Número de Identificación Tributaria';
  const nitLineIndex = lines.findIndex(l => l.includes(nitLabel));
  if (nitLineIndex >= 0 && nitLineIndex + 1 < lines.length) {
    const nitDataLine = lines[nitLineIndex + 1].trim();
    // Validar que no sea otro header
    if (!/^\d+\./.test(nitDataLine)) {
      const nitDigits = extractAllDigits(nitDataLine);
      // El NIT tiene 9 caracteres numéricos, DV es 1 carácter
      if (nitDigits.length >= 10) {
        nitContador = nitDigits.substring(0, 9);
        dvContador = nitDigits.substring(9, 10);
        // El resto de la línea es la sociedad designada
        const societyPart = nitDataLine.replace(/\d+/g, '').trim();
        if (societyPart) {
          sociedadDesignada = societyPart;
        }
      } else if (nitDigits.length >= 9) {
        nitContador = nitDigits.substring(0, 9);
      }
    }
  }

  // Si no encontramos la sociedad designada en la línea anterior, buscar en la siguiente
  if (!sociedadDesignada && nitLineIndex >= 0 && nitLineIndex + 2 < lines.length) {
    const dvLabel = '157. DV';
    const dvLineIndex = lines.findIndex(l => l.includes(dvLabel));
    if (dvLineIndex >= 0 && dvLineIndex + 1 < lines.length) {
      const societyLine = lines[dvLineIndex + 1].trim();
      if (!/^\d+\./.test(societyLine)) {
        // Extraer la parte textual (no numérica)
        const textParts = societyLine.split(/\d+/).filter(p => p.trim());
        if (textParts.length > 0) {
          sociedadDesignada = textParts.join('').trim();
        }
      }
    }
  }

  const result = {
    tipoDocumento: personaData.tipoDocumento,
    tipoDocCodigo: personaData.tipoDocCodigo,
    numeroIdentificacion: personaData.numeroIdentificacion,
    dv: personaData.dv,
    fechaExpedicion: null,
    lugarExpedicionPais: null,
    lugarExpedicionDepartamento: null,
    lugarExpedicionCiudad: null,
    primerApellido: primerApellido || null,
    segundoApellido: segundoApellido || null,
    primerNombre: primerNombre || null,
    otrosNombres: otrosNombres || null,
    tarjetaProfesional: personaData.tarjetaProfesional || null,
    fechaInicioVinculacion: fechaNombramiento || null,
    nit: nitContador || null,
    sociedadDesignada: sociedadDesignada || null,
  };

  return result;
}

function limitSection(text: string, start: RegExp, end: RegExp): string {

  const startMatch = text.search(start);

  if (startMatch === -1) return text;

  const endMatch = text.slice(startMatch).search(end);

  if (endMatch === -1) return text.slice(startMatch);

  return text.slice(startMatch, startMatch + endMatch);
}
