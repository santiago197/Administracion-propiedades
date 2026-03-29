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

/**
 * Parser especializado para RUT escaneados con OCR.
 * Incluye normalización de texto, corrección de errores comunes de OCR
 * y lógica más tolerante para extracción de datos.
 */

// Marcadores de sección con variaciones comunes de OCR
const SECTION_MARKERS_SCANNED = {
  HEADER: /REGISTRO\s*[UÚ0O]NICO\s*TRIBUTARIO|FORMULARIO\s*DEL\s*RUT|REG[I1]STRO.*TR[I1]BUTAR[I1]O/i,
  // Requiere palabra más completa para evitar falsos positivos con "IDENT N"
  IDENTIFICACION: /^[I1]DENT[I1]F[I1]CAC[I1][ÓO0]N\s*$|IDENT[I1]F[I1]CAC[I1][ÓO0]N\s*[A-Z]{2,}/i,
  UBICACION: /^UB[I1]CAC[I1][ÓO0]N|UBICAC[I1][ÓO0]N\d+/i,
  CLASIFICACION: /^CLAS[I1]F[I1]CAC[I1][ÓO0]N|[€—-]\s*[EC€]?L?AS[I1]F[I1]CAC[I1][ÓO0]N/i,
  RESPONSABILIDADES: /Rasp[óo]nsabilidades.*Calidades.*Atributos|RESPONSAB[I1]L[I1]DADES.*CAL[I1]DADES/i,
  // Representación (casillas 98-110) - Más flexible
  REPRESENTANTES: /98\.\s*Representaci[óo]n|Representaci[óo]n|REPRS\s*LEGAL/i,
  SOCIOS: /SOC[I1]OS\s*Y?\/?\s*[O0]?\s*M[I1]EMBROS|SOC[I1]OS/i,
  // Revisor Fiscal (casillas 124-147) - Más flexible
  REVISOR_FISCAL: /Rev[i1]sor\s*F[i1]scal\s*y\s*Contador|Rev[i1]sor\s*F[i1]scal|124\.\s*Tipo/i,
  // Contador (casillas 148-159) - Más flexible
  CONTADOR: /148\.\s*Tipo|Contador/i,
} as const;

/**
 * Normaliza texto escaneado corrigiendo errores comunes de OCR.
 */
function normalizeScannedText(text: string): string {
  if (!text) return '';

  let normalized = text;

  // Convertir a mayúsculas para procesamiento uniforme
  normalized = normalized.toUpperCase();

  // Aplicar correcciones selectivas
  // (En contextos específicos, no globalmente)

  // Limpiar espacios múltiples
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Extrae NIT/identificación de texto con tolerancia a errores OCR.
 */
function extractNITFromScanned(text: string): { nit: string; dv: string } | null {
  // Patrones para NIT con variaciones OCR
  const nitPatterns = [
    // Formato: 123456789-1 o 123.456.789-1
    /(\d[\d\.\s]{7,12}\d)\s*[-–—]\s*(\d)/,
    // Formato: NIT: 123456789-1
    /N[I1]T[\s:]+(\d[\d\.\s]{7,12}\d)\s*[-–—]\s*(\d)/,
    // Formato solo números sin DV
    /(?:^|\s)(\d{8,10})(?:\s|$)/,
  ];

  for (const pattern of nitPatterns) {
    const match = text.match(pattern);
    if (match) {
      const nit = match[1].replace(/[\.\s]/g, '');
      const dv = match[2] || '';
      if (nit.length >= 8 && nit.length <= 10) {
        return { nit, dv };
      }
    }
  }

  return null;
}


function extractEmailFromScanned(text: string): string {
  // Paso 1: Buscar línea que contenga "Correo electrónico" o email pattern
  // Incluye variantes OCR: "Correb elecuónico", "@", dominio conocido, patrón GcQ
  const emailLine = text.split('\n').find(line =>
    /correo|email|e-mail/i.test(line) ||
    /@/.test(line) ||
    /[a-z0-9]+[GcQ]\s*[a-z0-9]+\.com/i.test(line) ||
    /\b(?:gmail|hotmail|yahoo|outlook|live|msn|icloud)\.com\b/i.test(line) ||
    /42[\.\s]+[A-Za-z]+\s+[A-Za-záéíóúñ]+/i.test(line)
  );

  if (!emailLine) {
    return '';
  }

 

  // Paso 2: Extraer solo la parte después de "42. Correo electrónico" o variantes OCR
  // Variante limpia: "42. Correo electrónico lopezmendes@gmail.com"
  // Variante OCR:    "42 Correb elecuónico karolmendezmola E gmail.com e"
  let emailPart = emailLine;
  const markerMatch = emailLine.match(/42[\.\s]+[A-Za-z]+\s+[A-Za-záéíóúñ]+\s+(.+)/i);
  if (markerMatch) {
    emailPart = markerMatch[1];
    // console.log('📧 [EMAIL] Parte después del marcador:', emailPart);
  }

  // Paso 3: Limpiar la parte del email
  let cleaned = emailPart.toLowerCase().trim();

  // Paso 4: Corrección de artefactos OCR usados como sustitutos de "@"
  // "(O" como sustituto de @: "casago1017 (O gmail.com" → "casago1017@gmail.com"
  cleaned = cleaned.replace(/([a-z0-9])\s*\(o\s*/gi, '$1@');
  // "Q" o "q" como sustituto directo de @: "IcastroQti360.com.co" → "Icastro@ti360.com.co"
  cleaned = cleaned.replace(/([a-z0-9])q([a-z0-9]+\.(com|co|net|org|edu|gov))/gi, '$1@$2');
  // "cQ" pegado al dominio: "eliasorozcocQhotmail.com" → "eliasorozco@hotmail.com"
  cleaned = cleaned.replace(/([a-z0-9])cq([a-z0-9]+\.(com|co|net|org|edu|gov))/gi, '$1@$2');
  // "cQ" con espacio antes del dominio: "fundacrescendofecQ gmail.com" → "fundacrescendofe@gmail.com"
  cleaned = cleaned.replace(/([a-z0-9])cq\s+([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/gi, '$1@$2');
  // "G " antes del dominio: "sandramariaG gmail.com" → "sandramaria@gmail.com"
  cleaned = cleaned.replace(/([a-z0-9])g\s+(gmail|hotmail|yahoo|outlook|live|msn|icloud)/gi, '$1@$2');
  // "E" pegada sin espacio antes del dominio: "isabel.bernaltE hotmail.com" → "isabel.bernalt@hotmail.com"
  cleaned = cleaned.replace(/([a-z0-9._-])e\s+([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/g, '$1@$2');
  // "espacio+E+espacio" como @: "karolmendezmola E gmail.com" → "karolmendezmola@gmail.com"
  cleaned = cleaned.replace(/([a-z0-9._-])\s+e\s+([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/g, '$1@$2');

  // Paso 5: Remover espacios alrededor de @
  cleaned = cleaned.replace(/\s*@\s*/g, '@');

  // Paso 6: Correcciones sutiles en emails (NO convertir números que son legítimos)
  // Solo corregir acentos que claramente son errores OCR
  const emailCorrected = cleaned
    .replace(/[áäà]/g, 'a')
    .replace(/[éëè]/g, 'e');

  // Paso 7: Buscar patrón de email (permite números en el usuario)
  const emailPattern = /[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/;
  const match = emailCorrected.match(emailPattern);

  if (match) {
    // console.log('📧 [EMAIL] Extraído:', match[0]);
    return match[0];
  }

  // console.log('📧 [EMAIL] No se pudo extraer email');
  return '';
}



/**
 * Divide el texto en secciones basándose en marcadores tolerantes a OCR.
 */
function splitIntoSectionsScanned(lines: string[]): {
  header: string[];
  identificacion: string[];
  ubicacion: string[];
  clasificacion: string[];
  responsabilidades: string[];
  representantesLegales: string[];
  socios: string[];
  revisorFiscalPrincipal: string[];
  revisorFiscalSuplente: string[];
  contador: string[];
} {
  // console.log('🔵 [SPLIT SCANNED] Iniciando división de secciones...');

  const sections = {
    header: [] as string[],
    identificacion: [] as string[],
    ubicacion: [] as string[],
    clasificacion: [] as string[],
    responsabilidades: [] as string[],
    representantesLegales: [] as string[],
    socios: [] as string[],
    revisorFiscalPrincipal: [] as string[],
    revisorFiscalSuplente: [] as string[],
    contador: [] as string[],
  };

  let currentSection: keyof typeof sections = 'header';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalized = normalizeScannedText(line);

    // Detectar cambio de sección
    // IMPORTANTE: Verificar marcadores en orden de aparición en el documento

    // IDENTIFICACIÓN debe ser completa, no solo "IDENT N"
    if (SECTION_MARKERS_SCANNED.IDENTIFICACION.test(line) ||
      SECTION_MARKERS_SCANNED.IDENTIFICACION.test(normalized)) {
      // if (currentSection !== 'identificacion') {
      //   console.log(`🔵 [SPLIT] Línea ${i}: Cambio a IDENTIFICACION`);
      //   console.log(`🔵 [SPLIT] Línea detectada:`, line.slice(0, 60));
      // }
      currentSection = 'identificacion';
      continue;
    }
    // UBICACIÓN
    else if (SECTION_MARKERS_SCANNED.UBICACION.test(line) ||
      SECTION_MARKERS_SCANNED.UBICACION.test(normalized)) {
      if (currentSection !== 'ubicacion') {
        // console.log(`🔵 [SPLIT] Línea ${i}: Cambio a UBICACION`);
        // console.log(`🔵 [SPLIT] Línea detectada:`, line.slice(0, 60));
      }
      currentSection = 'ubicacion';
      // No hacer continue, permitir que la línea se agregue
      // continue;
    }
    // CLASIFICACIÓN
    else if (SECTION_MARKERS_SCANNED.CLASIFICACION.test(line) ||
      SECTION_MARKERS_SCANNED.CLASIFICACION.test(normalized)) {
      if (currentSection !== 'clasificacion') {
        //  console.log(`🔵 [SPLIT] Línea ${i}: Cambio a CLASIFICACION`);
        //console.log(`🔵 [SPLIT] Línea detectada:`, line.slice(0, 60));
      }
      currentSection = 'clasificacion';
      // No hacer continue
    }
    // RESPONSABILIDADES
    else if (SECTION_MARKERS_SCANNED.RESPONSABILIDADES.test(line) ||
      SECTION_MARKERS_SCANNED.RESPONSABILIDADES.test(normalized)) {
      if (currentSection !== 'responsabilidades') {
        // console.log(`🔵 [SPLIT] Línea ${i}: Cambio a RESPONSABILIDADES`);
        // console.log(`🔵 [SPLIT] Línea detectada:`, line.slice(0, 60));
      }
      currentSection = 'responsabilidades';
      continue;
    }
    // REPRESENTANTES (casilla 98)
    else if (SECTION_MARKERS_SCANNED.REPRESENTANTES.test(line)) {
      if (currentSection !== 'representantesLegales') {
        // console.log(`🔵 [SPLIT] Línea ${i}: Cambio a REPRESENTANTES`);
        // console.log(`🔵 [SPLIT] Línea detectada:`, line.slice(0, 60));
      }
      currentSection = 'representantesLegales';
      // No hacer continue
    }
    // SOCIOS
    else if (SECTION_MARKERS_SCANNED.SOCIOS.test(normalized)) {
      if (currentSection !== 'socios') {
        // console.log(`🔵 [SPLIT] Línea ${i}: Cambio a SOCIOS`);
      }
      currentSection = 'socios';
      continue;
    }
    // REVISOR FISCAL (casilla 124) - ambos principal y suplente
    else if (SECTION_MARKERS_SCANNED.REVISOR_FISCAL.test(line)) {
      if (currentSection !== 'revisorFiscalPrincipal') {
        // console.log(`🔵 [SPLIT] Línea ${i}: Cambio a REVISOR_FISCAL (comenzando con principal)`);
        // console.log(`🔵 [SPLIT] Línea detectada:`, line.slice(0, 60));
      }
      currentSection = 'revisorFiscalPrincipal';
      // No hacer continue
    }
    // REVISOR FISCAL SUPLENTE (casilla 136) - detectar cambio dentro de revisor fiscal
    else if (currentSection === 'revisorFiscalPrincipal' && /136\.\s*Tipo\s*de\s*documento/i.test(line)) {
      // console.log(`🔵 [SPLIT] Línea ${i}: Cambio a REVISOR_FISCAL_SUPLENTE`);
      // console.log(`🔵 [SPLIT] Línea detectada:`, line.slice(0, 60));
      currentSection = 'revisorFiscalSuplente';
      // No hacer continue
    }
    // CONTADOR (casilla 148)
    else if (SECTION_MARKERS_SCANNED.CONTADOR.test(line)) {
      if (currentSection !== 'contador') {
        // console.log(`🔵 [SPLIT] Línea ${i}: Cambio a CONTADOR`);
        // console.log(`🔵 [SPLIT] Línea detectada:`, line.slice(0, 60));
      }
      currentSection = 'contador';
      // No hacer continue
    }

    // Agregar línea a la sección actual
    if (line.trim()) {
      sections[currentSection].push(line);
    }
  }

  // Log resumen de secciones
  // console.log('🔵 [SPLIT] Resumen de líneas por sección:');
  // console.log('   - header:', sections.header.length);
  // console.log('   - identificacion:', sections.identificacion.length);
  // console.log('   - ubicacion:', sections.ubicacion.length);
  // console.log('   - clasificacion:', sections.clasificacion.length);
  // console.log('   - responsabilidades:', sections.responsabilidades.length);
  // console.log('   - representantesLegales:', sections.representantesLegales.length);
  // console.log('   - socios:', sections.socios.length);
  // console.log('   - revisorFiscalPrincipal:', sections.revisorFiscalPrincipal.length);
  // console.log('   - revisorFiscalSuplente:', sections.revisorFiscalSuplente.length);
  // console.log('   - contador:', sections.contador.length);

  return sections;
}

/**
 * Parsea el encabezado de un RUT escaneado.
 */
function parseHeaderScanned(lines: string[]): HeaderData {
  // console.log('🔷 [HEADER SCANNED] Procesando header con', lines.length, 'líneas');

  const text = lines.join('\n');
  const textUpper = text.toUpperCase();

  // ====== CONCEPTO ======
  // Buscar "2. Concepto" con código y descripción
  // Ejemplo: "2. Concepto [0 [2] Actualización -"
  let concepto = '';
  const conceptoMatch = text.match(/2\.\s*Concepto\s*\[?\s*0?\s*\[?\s*(\d)\s*\]?\s*([A-ZÁ-Úa-zá-ú]+)/i);
  if (conceptoMatch) {
    const codigo = conceptoMatch[1].trim().padStart(2, '0'); // "2" -> "02"
    const descripcion = conceptoMatch[2].trim();
    concepto = `${codigo} ${descripcion}`;
  }

  // ====== NÚMERO DE FORMULARIO ======
  // Buscar "4. Número de formulario" seguido de dígitos
  // Ejemplo: "| 4. Número de formulario 14945032135"
  let numeroFormulario = '';
  const formularioPatterns = [
    /4\.\s*N[úu]mero\s+de\s+formulario\s+(\d{10,15})/i,
    /4\.\s*N[úu]mero.*formulario\s+(\d{10,15})/i,
    /formulario\s+(\d{10,15})/i,
  ];

  for (const pattern of formularioPatterns) {
    const match = textUpper.match(pattern);
    if (match) {
      numeroFormulario = match[1].trim();
      // console.log('🔷 [HEADER] Número de formulario:', numeroFormulario);
      break;
    }
  }

  // ====== NIT Y DV ======
  // Estrategia 1: Buscar línea con patrón "123513965 3|1 |"
  // Esta es la línea debajo de "5. Número de Identificación Tributaria (NIT)"
  let nit = '';
  let dv = '';

  // Buscar línea que contenga el NIT (formato: dígitos con espacios y separadores)
  // Ejemplo: "123513965 3|1 |reesosdca 2"
  for (const line of lines) {
    // Buscar patrón: 9-10 dígitos con espacios opcionales, seguido de pipe y 1 dígito
    const nitPattern = /(\d[\d\s]{7,10}\d)\s*\|?\s*(\d)\s*\|/;
    const match = line.match(nitPattern);

    if (match) {
      nit = match[1].replace(/\s/g, ''); // Remover espacios
      dv = match[2];
      // console.log('🔷 [HEADER] NIT encontrado en línea:', line.slice(0, 50));
      // console.log('🔷 [HEADER] NIT extraído:', nit, 'DV:', dv);
      break;
    }
  }

  // Estrategia 2: Si no se encontró, buscar después de marcador "5. Número"
  if (!nit) {
    const nitIndex = lines.findIndex(l =>
      /5\.\s*N[úu]mero.*Identificaci[óo]n.*Tributaria.*NIT/i.test(l)
    );

    if (nitIndex !== -1 && nitIndex + 1 < lines.length) {
      const nitLine = lines[nitIndex + 1];
      // Extraer todos los dígitos de la línea siguiente
      const digits = nitLine.replace(/\D/g, '');

      if (digits.length >= 10) {
        // Asumiendo que los primeros 9-10 dígitos son el NIT
        if (digits.length === 10) {
          nit = digits.slice(0, 9);
          dv = digits[9];
        } else if (digits.length >= 11) {
          nit = digits.slice(0, 10);
          dv = digits[10];
        }
        // console.log('🔷 [HEADER] NIT encontrado (estrategia 2):', nit, 'DV:', dv);
      }
    }
  }

  // Estrategia 3: Buscar NIT en formato estándar con guión
  if (!nit) {
    const nitStandardMatch = textUpper.match(/(\d{9,10})\s*[-–—]\s*(\d)/);
    if (nitStandardMatch) {
      nit = nitStandardMatch[1];
      dv = nitStandardMatch[2];
      // console.log('🔷 [HEADER] NIT encontrado (estrategia 3):', nit, 'DV:', dv);
    }
  }

  // ====== DIRECCIÓN SECCIONAL ======
  // Buscar después de "12. Dirección seccional" o texto similar
  let direccionSeccional = '';
  const seccionalPatterns = [
    /12\.\s*Direcci[óo]n\s+seccional\s+([A-Za-zÁ-ÚáÚ\s]+?)(?:\n|Buz[óo]n|$)/i,
    /seccional\s+([A-Za-zÁ-ÚáÚ\s]{3,30})(?:\n|Buz[óo]n|$)/i,
  ];

  for (const pattern of seccionalPatterns) {
    const match = text.match(pattern);
    if (match) {
      direccionSeccional = match[1].trim();
    //  console.log('🔷 [HEADER] Dirección seccional:', direccionSeccional);
      break;
    }
  }

  // console.log('🔷 [HEADER] Resultado final:', {
  //   concepto,
  //   numeroFormulario,
  //   nit,
  //   dv,
  //   direccionSeccional,
  // });

  return {
    concepto: concepto || '02 - Actualización',
    numeroFormulario,
    nit,
    dv,
    direccionSeccional,
  };
}

/**
 * Parsea identificación de RUT escaneado.
 */
function parseIdentificacionScanned(lines: string[]): IdentificacionData {
  // console.log('🔶 [IDENTIFICACION SCANNED] Procesando identificación con', lines.length, 'líneas');
  // console.log('🔶 [IDENTIFICACION] Líneas recibidas:');
  lines.forEach((line, i) => console.log(`   ${i}: ${line.slice(0, 60)}`));

  const text = lines.join('\n');
  const normalized = normalizeScannedText(text);

  // Detectar tipo de contribuyente
  const esPersonaNatural = /PERSON[A4]\s*N[A4]TUR[A4]L/i.test(normalized) ||
    /PERSONA\s*NATURAL/i.test(text) ||
    /sucesi[óo]n\s*il[íi]quida/i.test(text);
  const esPersonaJuridica = /PERSON[A4]\s*JUR[I1]D[I1]C[A4]/i.test(normalized) ||
    /PERSONA\s*JUR[ÍI]DICA/i.test(text);

  console.log('🔶 [IDENTIFICACION] Tipo:', esPersonaNatural ? 'PERSONA NATURAL' : esPersonaJuridica ? 'Persona jurídica' : 'NO DETECTADO');

  const identificacion: IdentificacionData = {
    tipoContribuyente: esPersonaJuridica ? 'Persona jurídica' :
      esPersonaNatural ? 'Persona natural' : '',
    tipoDocumento: null,
    numeroIdentificacion: null,
    fechaExpedicion: null,
    lugarExpedicionPais: null,
    lugarExpedicionDepartamento: null,
    lugarExpedicionCiudad: null,
    primerApellido: null,
    segundoApellido: null,
    primerNombre: null,
    otrosNombres: null,
    razonSocial: null,
    nombreComercial: null,
    sigla: null,
    dv: null,
  };

  // ====== EXTRAER TIPO DE DOCUMENTO ======
  // Solo para persona natural
  if (esPersonaNatural && !esPersonaJuridica) {
    if (/C[ÉE]DUL[A4]\s+DE\s+C[I1]UD[A4]D[A4]N[IÍ1][A4]/i.test(text) ||
      /C[éÉ]dula\s+de\s+Ciudadan[íÍ]a/i.test(text)) {
      identificacion.tipoDocumento = 'CC';
      // Si es Cédula de Ciudadanía, el país de expedición es Colombia por defecto
      identificacion.lugarExpedicionPais = 'COLOMBIA';
      // console.log('🔶 [IDENTIFICACION] Tipo documento: Cédula de Ciudadanía → País: COLOMBIA');
    }
  }

  // ====== EXTRAER NIT Y FECHA DE EXPEDICIÓN (PERSONA NATURAL) ======
  // Buscar línea con patrón: "Persona natural... 13 1235139653 7) 20170418"
  // El NIT tiene 10 dígitos para persona natural, seguido de ") " y 8 dígitos de fecha
  if (esPersonaNatural && !esPersonaJuridica) {
    for (const line of lines) {
      // Patrón más flexible para capturar NIT y fecha
      const nitFechaPattern = /(\d{10})\s+\d+\)\s*(\d{8})/;
      const match = line.match(nitFechaPattern);

      if (match) {
        identificacion.numeroIdentificacion = match[1];
        // console.log('🔶 [IDENTIFICACION] NIT encontrado (persona natural):', identificacion.numeroIdentificacion);

        // Fecha está en el mismo patrón (formato YYYYMMDD)
        const fechaStr = match[2]; // "20170418"
        if (fechaStr && fechaStr.length === 8) {
          const year = fechaStr.substring(0, 4);
          const month = fechaStr.substring(4, 6);
          const day = fechaStr.substring(6, 8);
          identificacion.fechaExpedicion = `${day}/${month}/${year}`;
          // console.log('🔶 [IDENTIFICACION] Fecha expedición:', identificacion.fechaExpedicion);
        }
        break;
      }
    }

    // Patrón adicional: CC (10 dígitos) + DV (1 dígito) pegados sin separador al inicio de línea
    // Ejemplo: "10024888782 texto..." → CC=1002488878, DV=2
    if (!identificacion.numeroIdentificacion) {
      for (const line of lines) {
        const ccDvMatch = line.match(/^(\d{10})(\d)(?:\s|$)/);
        if (ccDvMatch) {
          identificacion.numeroIdentificacion = ccDvMatch[1];
          identificacion.dv = ccDvMatch[2];
          // console.log('🔶 [IDENTIFICACION] CC+DV (10+1 dígitos):', identificacion.numeroIdentificacion, 'DV:', identificacion.dv);
          break;
        }
      }
    }
  }

  // Fallback: usar función genérica de extracción de NIT solo si no es persona jurídica
  // Para persona jurídica, el NIT ya debería haberse extraído en el bloque anterior
  if (!identificacion.numeroIdentificacion && !esPersonaJuridica) {
    const nitResult = extractNITFromScanned(text);
    if (nitResult) {
      identificacion.numeroIdentificacion = nitResult.nit;
      identificacion.dv = nitResult.dv;
      // console.log('🔶 [IDENTIFICACION] NIT encontrado (fallback):', identificacion.numeroIdentificacion);
    }
  }


 // console.log('🔶 [IDENTIFICACION] Buscando lugar de expedición...');

  for (const line of lines) {
    // Buscar líneas que contengan "COLOMBIA" y dígitos
    if (/COLOMB[I1A]/i.test(line) && /\d/.test(line)) {
      console.log('🔶 [IDENTIFICACION] Línea candidata:', line);

      // Extraer código de país (3 dígitos al inicio)
      // Patrón: "COLOMBIA 1 6 9" o "COLOMBIA169"
      const paisMatch = line.match(/COLOMB[I1A]\s*(\d)\s*(\d)\s*(\d)/i);

      if (paisMatch) {
        const codigoPais = paisMatch[1] + paisMatch[2] + paisMatch[3];
        identificacion.lugarExpedicionPais = 'COLOMBIA';
        console.log('🔶 [IDENTIFICACION] Código país:', codigoPais);

        // Extraer departamento (nombre textual)
        // Buscar texto después del código de país
        // Puede estar sin espacios: "ValledelCauca" o con espacios: "Valle del Cauca"
        const deptoMatch = line.match(/\d{3}\s*\|?\s*([A-Za-zÁ-Úá-ú]+(?:del)?[A-Za-zÁ-Úá-ú]*)/i);

        if (deptoMatch) {
          let departamento = deptoMatch[1].trim();

          // Normalizar nombres comunes
          if (/ValledelCauca/i.test(departamento)) {
            identificacion.lugarExpedicionDepartamento = 'Valle del Cauca';
          } else if (/Valle.*Cauca/i.test(departamento)) {
            identificacion.lugarExpedicionDepartamento = 'Valle del Cauca';
          } else if (/Antioquia/i.test(departamento)) {
            identificacion.lugarExpedicionDepartamento = 'Antioquia';
          } else if (/Cundinamarca/i.test(departamento)) {
            identificacion.lugarExpedicionDepartamento = 'Cundinamarca';
          } else {
            identificacion.lugarExpedicionDepartamento = departamento;
          }

          console.log('🔶 [IDENTIFICACION] Departamento:', identificacion.lugarExpedicionDepartamento);
        }

        // Extraer código de municipio
        // Puede aparecer como: "109", "1 0 9", "PA 109", "1039" (al final)

        // Estrategia 1: Buscar 3 dígitos al final separados con espacios
        let codigoMunicipio = '';
        const municipioPattern1 = line.match(/\s+(\d)\s+(\d)\s+(\d)\s*$/);

        if (municipioPattern1) {
          codigoMunicipio = municipioPattern1[1] + municipioPattern1[2] + municipioPattern1[3];
          console.log('🔶 [IDENTIFICACION] Código municipio (espaciado):', codigoMunicipio);
        } else {
          // Estrategia 2: Buscar patrón "PA 109" o similar al final
          const municipioPattern2 = line.match(/[A-Z]{2}\s+(\d{3})\s*$/);

          if (municipioPattern2) {
            codigoMunicipio = municipioPattern2[1];
            console.log('🔶 [IDENTIFICACION] Código municipio (después de letras):', codigoMunicipio);
          } else {
            // Estrategia 3: Buscar 3-4 dígitos al final
            const municipioPattern3 = line.match(/\s+(\d{3,4})\s*$/);

            if (municipioPattern3) {
              const codigo = municipioPattern3[1];
              // Si son 4 dígitos, tomar los últimos 3
              codigoMunicipio = codigo.length === 4 ? codigo.slice(-3) : codigo;
              console.log('🔶 [IDENTIFICACION] Código municipio (numérico):', codigoMunicipio);
            }
          }
        }

        // Extraer ciudad directamente del texto OCR (no usar códigos)
        if (!identificacion.lugarExpedicionCiudad) {
          // Buscar nombre de ciudad en el texto antes del código
          // Ejemplo: "Valle del Cauca 7/6 uenayehtura 1039" → "Buenaventura"

          if (/[ub]ena[vy]?[eht]*ura/i.test(line)) {
            identificacion.lugarExpedicionCiudad = 'Buenaventura';
            console.log('🔶 [IDENTIFICACION] Ciudad por OCR: Buenaventura');
          } else if (/Cal[i1l]/i.test(line)) {
            identificacion.lugarExpedicionCiudad = 'Cali';
            console.log('🔶 [IDENTIFICACION] Ciudad por OCR: Cali');
          } else if (/Palmira/i.test(line)) {
            identificacion.lugarExpedicionCiudad = 'Palmira';
            console.log('🔶 [IDENTIFICACION] Ciudad por OCR: Palmira');
          } else if (/Tulu[aá]/i.test(line)) {
            identificacion.lugarExpedicionCiudad = 'Tuluá';
            console.log('🔶 [IDENTIFICACION] Ciudad por OCR: Tuluá');
          }
        }

        // Si encontramos datos válidos, salir del loop
        if (identificacion.lugarExpedicionDepartamento || identificacion.lugarExpedicionCiudad) {
          console.log('🔶 [IDENTIFICACION] Lugar expedición completo:', {
            pais: identificacion.lugarExpedicionPais,
            departamento: identificacion.lugarExpedicionDepartamento,
            ciudad: identificacion.lugarExpedicionCiudad
          });
          break;
        }
      }
    }
  }

  // ====== EXTRAER NOMBRES (PERSONA NATURAL) ======
  if (esPersonaNatural) {
    // Estrategia 1: Línea de etiquetas "31. Primer apelido 32. Segundo apelido 34. Primer nombre"
    // seguida de valores en una sola línea: "APELLIDO1 APELLIDO2 NOMBRE1 [NOMBRE2]"
    for (let i = 0; i < lines.length - 1; i++) {
      if (/31\.\s*Primer\s+apel{1,2}ido/i.test(lines[i]) && /34\.\s*Primer\s+nombre/i.test(lines[i])) {
        const tokens = lines[i + 1].trim().match(/[A-ZÁÉÍÓÚÑ]{3,}/g);
        if (tokens && tokens.length >= 2) {
          identificacion.primerApellido = tokens[0];
          identificacion.segundoApellido = tokens[1] || null;
          identificacion.primerNombre = tokens[2] || null;
          identificacion.otrosNombres = tokens[3] || null;
          console.log('🔶 [IDENTIFICACION] Nombres por etiquetas 31/34:', tokens);
        }
        break;
      }
    }

    // Estrategia 2: Línea con 3-4 palabras en mayúsculas (apellidos + nombres en una sola línea)
    // Ejemplo: "MENDEZ MOLA KAROL MICHEL"
    if (!identificacion.primerApellido) {
      for (const line of lines) {
        const cuatroMatch = line.trim().match(
          /^([A-ZÁÉÍÓÚÑ]{3,})\s+([A-ZÁÉÍÓÚÑ]{3,})\s+([A-ZÁÉÍÓÚÑ]{3,})(?:\s+([A-ZÁÉÍÓÚÑ]{3,}))?\s*$/
        );
        if (cuatroMatch) {
          identificacion.primerApellido = cuatroMatch[1];
          identificacion.segundoApellido = cuatroMatch[2];
          identificacion.primerNombre = cuatroMatch[3];
          identificacion.otrosNombres = cuatroMatch[4] || null;
          console.log('🔶 [IDENTIFICACION] Nombres línea única:', cuatroMatch[1], cuatroMatch[2], cuatroMatch[3], cuatroMatch[4]);
          break;
        }
      }
    }

    // Estrategia 3: DOS APELLIDOS al final de línea (con ruido OCR), NOMBRE en línea siguiente
    // Ejemplo: "CARDENAS CARDENAS «" → siguiente: "YADIRA"
    if (!identificacion.primerApellido) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const apellidosMatch = line.match(/^([A-ZÁÉÍÓÚÑ]{4,})\s+([A-ZÁÉÍÓÚÑ]{4,})\s*[«*_\-]?$/);

        if (apellidosMatch) {
          identificacion.primerApellido = apellidosMatch[1].trim();
          identificacion.segundoApellido = apellidosMatch[2].trim();
          console.log('🔶 [IDENTIFICACION] Apellidos encontrados:',
            identificacion.primerApellido,
            identificacion.segundoApellido
          );

          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            const nombreMatch = nextLine.match(/^[*\s_—]*([A-ZÁÉÍÓÚÑ]{4,})/);
            if (nombreMatch) {
              identificacion.primerNombre = nombreMatch[1].trim();
              console.log('🔶 [IDENTIFICACION] Primer nombre encontrado:', identificacion.primerNombre);
            }
          }
          break;
        }
      }
    }

    // Fallback: corrección específica de OCR para apellidos conocidos
    if (!identificacion.primerApellido) {
      for (const line of lines) {
        const lineUpper = line.trim().toUpperCase();
        if (/^[A-ZÁÉÍÓÚÑ]{4,}$/.test(lineUpper)) {
          if (lineUpper.includes('RDENAS')) {
            identificacion.primerApellido = 'CARDENAS';
            console.log('🔶 [IDENTIFICACION] Primer apellido (corregido OCR):', identificacion.primerApellido);
          }
        }
      }
    }
  }

  // ====== EXTRAER RAZÓN SOCIAL (PERSONA JURÍDICA) ======
  if (esPersonaJuridica) {
    // console.log('🔶 [IDENTIFICACION] Procesando razón social para persona jurídica...');

    for (let i = 0; i < lines.length; i++) {
      if (/35\.\s*Raz[óo]n\s+social/i.test(lines[i])) {
        console.log('🔶 [IDENTIFICACION] Encontrado marcador "35. Razón social" en línea', i);

        // La razón social está en la línea siguiente
        if (i + 1 < lines.length) {
          let razonSocial = lines[i + 1].trim();

          // Limpiar caracteres OCR no deseados al final
          razonSocial = razonSocial.replace(/\s*(NN|O\)|Tag\.|_|—)+\s*$/gi, '');

          // Correcciones comunes de OCR en abreviaturas
          razonSocial = razonSocial.replace(/\bAS\./gi, 'SAS');
          razonSocial = razonSocial.replace(/\bS\.A\./gi, 'S.A.');
          razonSocial = razonSocial.replace(/\bLTDA\./gi, 'LTDA');

          identificacion.razonSocial = razonSocial.trim();
          console.log('🔶 [IDENTIFICACION] Razón social:', identificacion.razonSocial);
        }
        break;
      }
    }

    // ====== EXTRAER SIGLA (PERSONA JURÍDICA) ======
    // La sigla aparece después de "36. Nombre comercial" y "37. Sigla"
    for (let i = 0; i < lines.length; i++) {
      if (/36\.\s*Nombre\s+comercial.*37.*Sigla/i.test(lines[i])) {
        console.log('🔶 [IDENTIFICACION] Encontrado marcador "37. Sigla" en línea', i);

        // La sigla está en la línea siguiente
        if (i + 1 < lines.length) {
          let sigla = lines[i + 1].trim();

          // Limpiar caracteres OCR no deseados
          sigla = sigla.replace(/\s*(NN|O\)|Tag\.|_|—|>|\d{2})+\s*$/gi, '');

          // Agregar espacios si están concatenados
          // "ABACOLTEJAS" → "ABACOL TEJAS"
          // Detectar palabras en mayúsculas concatenadas
          sigla = sigla.replace(/([A-Z]{5,})([A-Z]{4,})/g, '$1 $2');

          identificacion.sigla = sigla.trim();
          console.log('🔶 [IDENTIFICACION] Sigla:', identificacion.sigla);
        }
        break;
      }
    }

    // También extraer el NIT para persona jurídica (9 dígitos + 1 DV)
    if (!identificacion.numeroIdentificacion) {
      console.log('🔶 [IDENTIFICACION] Buscando NIT para persona jurídica...');

      for (const line of lines) {
        console.log('🔶 [IDENTIFICACION] Línea analizada:', line.slice(0, 80));

        // Estrategia 1: Extraer solo dígitos de la línea (ignorar letras/ruido OCR)
        // Ejemplo: "90060a4a499|g" → extraer dígitos → "900604499"
        const soloDigitos = line.replace(/[^\d]/g, '');
        console.log('🔶 [IDENTIFICACION] Solo dígitos extraídos:', soloDigitos);

        // Buscar al inicio de la línea un grupo de 9-10 dígitos
        // Si hay más dígitos, tomar solo los primeros 10
        if (soloDigitos.length >= 9) {
          // Tomar hasta 10 dígitos desde el inicio
          const nitPosible = soloDigitos.slice(0, 10);

          // Validar que parece un NIT válido (no todo ceros, empieza con dígito válido)
          if (!/^0+$/.test(nitPosible) && /^[1-9]/.test(nitPosible)) {
            if (nitPosible.length === 10) {
              identificacion.numeroIdentificacion = nitPosible.slice(0, 9);
              identificacion.dv = nitPosible[9];
            } else if (nitPosible.length === 9) {
              identificacion.numeroIdentificacion = nitPosible;
              identificacion.dv = null;
            }
            console.log('🔶 [IDENTIFICACION] NIT jurídico:', identificacion.numeroIdentificacion);
            console.log('🔶 [IDENTIFICACION] DV:', identificacion.dv);
            console.log('🔶 [IDENTIFICACION] Línea fuente:', line.slice(0, 60));
            break;
          }
        }

        // Estrategia 2 (fallback): Buscar patrón de dígitos consecutivos con limpieza OCR
        if (!identificacion.numeroIdentificacion) {
          // Limpiar caracteres OCR mal leídos comunes
          let cleanedLine = line.replace(/[oO]/g, '0').replace(/[lI]/g, '1');

          // Buscar patrón: 9-10 dígitos consecutivos
          const nitJuridicoPattern = /(\d{9,10})(?=[\s\|]|$)/;
          const match = cleanedLine.match(nitJuridicoPattern);

          if (match) {
            const nitCompleto = match[1];
            if (!/^0+$/.test(nitCompleto) && nitCompleto.length >= 9) {
              if (nitCompleto.length === 10) {
                identificacion.numeroIdentificacion = nitCompleto.slice(0, 9);
                identificacion.dv = nitCompleto[9];
              } else {
                identificacion.numeroIdentificacion = nitCompleto;
                identificacion.dv = null;
              }
              console.log('🔶 [IDENTIFICACION] NIT jurídico (fallback):', identificacion.numeroIdentificacion);
              console.log('🔶 [IDENTIFICACION] DV:', identificacion.dv);
              console.log('🔶 [IDENTIFICACION] Línea limpia:', cleanedLine.slice(0, 60));
              break;
            }
          }
        }
      }
    }

    // Para persona jurídica, el tipo de documento debe ser NIT o null
    identificacion.tipoDocumento = 'NIT';
  }

  // ====== EXTRAER NOMBRE COMERCIAL ======
  // Buscar "36. Nombre comercial" seguido de la línea con el nombre
  // Ejemplo: "RESTAURANTE SAZON SALOME 77 > o NN"
  for (let i = 0; i < lines.length; i++) {
    if (/36\.\s*Nombre\s+comercial/i.test(lines[i])) {
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        // Extraer texto antes de números o símbolos extraños
        const nombreMatch = nextLine.match(/^([A-ZÁÉÍÓÚÑ\s]{5,}?)(?:\s*\d+|>|NN|77)/i);
        if (nombreMatch) {
          identificacion.nombreComercial = nombreMatch[1].trim();
          console.log('🔶 [IDENTIFICACION] Nombre comercial:', identificacion.nombreComercial);
        }
      }
      break;
    }
  }

  // Fallback: buscar "RESTAURANTE" en el texto
  if (!identificacion.nombreComercial) {
    const restauranteMatch = text.match(/RESTAUR[A4]NTE\s+([A-ZÁÉÍÓÚÑ\s]+?)(?:\n|>|77|NN|\d{2})/i);
    if (restauranteMatch) {
      identificacion.nombreComercial = restauranteMatch[0].replace(/\d+|>|NN|77/g, '').trim();
      console.log('🔶 [IDENTIFICACION] Nombre comercial (fallback):', identificacion.nombreComercial);
    }
  }

  console.log('🔶 [IDENTIFICACION] Resultado final:', identificacion);

  return identificacion;
}

/**
 * Parsea ubicación de RUT escaneado.
 */
function parseUbicacionScanned(lines: string[]): UbicacionData {
  lines.forEach((line, i) => console.log(`   ${i}: ${line.slice(0, 70)}`));

  const text = lines.join('\n');

  const ubicacion: UbicacionData = {
    pais: '',
    departamento: '',
    ciudad: '',
    direccion: '',
    email: '',
    codigoPostal: null,
    telefono1: '',
    telefono2: null,
  };



  for (const line of lines) {
    if (/COLOMB[I1A]/i.test(line) && /\d/.test(line)) {

      // Extraer código de país (3 dígitos)
      // [I1] = I o error OCR "1"; [A4]? = A final opcional (o error "4")
      // Ej: "COLOMBIA 1 6 9" → COLOMB+I+A+" "+1+" "+6+" "+9
      const paisMatch = line.match(/COLOMB[I1][A4]?\s+(\d)\s*(\d)\s*(\d)/i);

      if (paisMatch) {
        
        ubicacion.pais = 'COLOMBIA';

        // Verificar si tiene formato con pipes (|)
        if (line.includes('|')) {
          // Formato 2: "COLOMBIA 1 6 9 | Bogotá D.C. 1 1 | Bogotá, D.C. 001"
          const parts = line.split('|');
          parts.forEach((part, i) => console.log(`   Parte ${i}:`, part));

          if (parts.length >= 3) {
            // Parte 1: País y código
            // Parte 2: Departamento y código (2 dígitos)
            const deptoPart = parts[1].trim();

            // Buscar: TEXTO seguido de 1 o 2 dígitos separados por espacios
            const deptoMatch = deptoPart.match(/^(.+?)\s+(\d+)\s+(\d+)\s*$/i);

            if (deptoMatch) {
              console.log('🟢 [UBICACION] Match departamento:', deptoMatch);
              let departamento = deptoMatch[1].trim();
              const codDepto = deptoMatch[2] + deptoMatch[3];

              // Normalizar nombres de departamentos
              if (/Bogot[aá]\s*D\.?\s*C\.?/i.test(departamento)) {
                ubicacion.departamento = 'Bogotá D.C.';
              } else if (/ValledelCauca/i.test(departamento)) {
                ubicacion.departamento = 'Valle del Cauca';
              } else if (/Valle.*Cauca/i.test(departamento)) {
                ubicacion.departamento = 'Valle del Cauca';
              } else if (/Antioquia/i.test(departamento)) {
                ubicacion.departamento = 'Antioquia';
              } else if (/Cundinamarca/i.test(departamento)) {
                ubicacion.departamento = 'Cundinamarca';
              } else {
                ubicacion.departamento = departamento;
              }

              console.log('🟢 [UBICACION] Departamento:', ubicacion.departamento, '(código:', codDepto + ')');
            } else {
              console.log('❌ [UBICACION] No se pudo extraer departamento de:', deptoPart);
            }

            // Parte 3: Ciudad y código (3 dígitos)
            const ciudadPart = parts[2].trim();
            console.log('🟢 [UBICACION] Procesando ciudad:', ciudadPart);

            // Buscar: TEXTO seguido de 3 dígitos (pueden estar juntos o separados)
            const ciudadMatch = ciudadPart.match(/^(.+?)\s+(\d{3})\s*$/i) ||
              ciudadPart.match(/^(.+?)\s+(\d)\s+(\d)\s+(\d)\s*$/i);

            if (ciudadMatch) {
              console.log('🟢 [UBICACION] Match ciudad:', ciudadMatch);
              let ciudad = ciudadMatch[1].trim();
              let codCiudad = '';

              // Extraer código (puede estar en grupo 2 o grupos 2+3+4)
              if (ciudadMatch[3] && ciudadMatch[4]) {
                codCiudad = ciudadMatch[2] + ciudadMatch[3] + ciudadMatch[4];
              } else {
                codCiudad = ciudadMatch[2];
              }

              // Remover comas del nombre
              ciudad = ciudad.replace(/,/g, '');

              // Normalizar nombres de ciudades comunes
              if (/Bogot[aá]\s*D\.?\s*C\.?/i.test(ciudad)) {
                ubicacion.ciudad = 'Bogotá D.C.';
              } else if (/^cal[i1l]$/i.test(ciudad.trim())) {
                // Solo si es exactamente "cali", "cal1", etc.
                ubicacion.ciudad = 'Cali';
              } else {
                // Usar el nombre del texto directamente (es más confiable que el código)
                ubicacion.ciudad = ciudad.trim();
              }

              console.log('🟢 [UBICACION] Ciudad:', ubicacion.ciudad, '(código:', codCiudad + ')');
            } else {
              console.log('❌ [UBICACION] No se pudo extraer ciudad de:', ciudadPart);
            }
          } else {
            console.log('❌ [UBICACION] Se esperaban al menos 3 partes, pero se encontraron:', parts.length);
          }
        } else {
          // Formato 1: "COLOMBIA 1 6 9 |ValledelCauca — // </ 17 6 |cai 001"
          // Extraer departamento (buscar después del código de país)
          // Puede estar sin espacios: "ValledelCauca" o con espacios: "Valle del Cauca"
          const deptoMatch = line.match(/\d{3}\s*\|?\s*([A-Za-zÁ-Úá-ú]+(?:del)?[A-Za-zÁ-Úá-ú]*)/i);

          if (deptoMatch) {
            let departamento = deptoMatch[1].trim();

            // Normalizar departamentos sin espacio
            if (/ValledelCauca/i.test(departamento)) {
              ubicacion.departamento = 'Valle del Cauca';
            } else if (/Valle.*Cauca/i.test(departamento)) {
              ubicacion.departamento = 'Valle del Cauca';
            } else if (/Antioquia/i.test(departamento)) {
              ubicacion.departamento = 'Antioquia';
            } else if (/Cundinamarca/i.test(departamento)) {
              ubicacion.departamento = 'Cundinamarca';
            } else {
              ubicacion.departamento = departamento;
            }

            console.log('🟢 [UBICACION] Departamento:', ubicacion.departamento);
          }

          // Extraer ciudad por nombre OCR (no por código)
          // Ejemplo: "cai 001" o "Cal 001" → usar "Cal" y normalizarlo
          const ciudadOCRMatch = line.match(/\|\s*([a-zA-Z\s]+?)\s+\d{3}\s*$/i);

          if (ciudadOCRMatch) {
            const nombreOCR = ciudadOCRMatch[1].trim();

            // Normalizar nombres comunes
            if (/cai|cal[i1l]/i.test(nombreOCR)) {
              ubicacion.ciudad = 'Cali';
            } else if (/Bogot/i.test(nombreOCR)) {
              ubicacion.ciudad = 'Bogotá D.C.';
            } else if (/Medell[íi]n/i.test(nombreOCR)) {
              ubicacion.ciudad = 'Medellín';
            } else if (/[ub]ena[vy]?[eht]*ura/i.test(nombreOCR)) {
              ubicacion.ciudad = 'Buenaventura';
            } else {
              ubicacion.ciudad = nombreOCR;
            }

            console.log('🟢 [UBICACION] Ciudad por OCR:', ubicacion.ciudad, '← raw:', nombreOCR);
          }
        }

        break;
      }
    }
  }

  // ====== EXTRAER DIRECCIÓN ======
  // Buscar después de "41. Dirección principal"
  // Ejemplo: "CR42D 49 47 NN O)"

  for (let i = 0; i < lines.length; i++) {
    if (/41\.\s*Direcci[óo]n\s+principal/i.test(lines[i])) {
      console.log('🟢 [UBICACION] Encontrado marcador de dirección en línea', i);

      if (i + 1 < lines.length) {
        let direccionRaw = lines[i + 1].trim();

        // Limpiar caracteres OCR no deseados al final
        // "CR42D 49 47 NN O)" → "CR42D 49 47"
        direccionRaw = direccionRaw.replace(/\s*(NN|O\)|Tag\.|_|—)+\s*$/gi, '');

        // Normalizar espacios dentro de la dirección
        // "CR42D 49 47" → "CR 42D 49 47"
        direccionRaw = direccionRaw.replace(/^([A-Z]{2})(\d)/i, '$1 $2');

        ubicacion.direccion = direccionRaw.trim();
        console.log('🟢 [UBICACION] Dirección:', ubicacion.direccion);
      }
      break;
    }
  }

  // ====== EXTRAER EMAIL ======
  // Buscar después de "42. Correo electrónico"
  // Ejemplo: "lopezmendezsandramariaG gmail.com"

  for (const line of lines) {
    // Detecta variantes OCR: "42. Correo electrónico" o "42 Correb elecuónico"
    if (/42[\.\s]+[A-Za-z]+\s+[A-Za-záéíóúñ]+/i.test(line) && (/correo?b?/i.test(line) || /elec/i.test(line) || /\.com\b/i.test(line))) {
      console.log('🟢 [UBICACION] Línea con correo:', line);

      // Usar la función helper que maneja "G" por "@"
      ubicacion.email = extractEmailFromScanned(line);

      if (ubicacion.email) {
        console.log('🟢 [UBICACION] Email extraído:', ubicacion.email);
      }
      break;
    }
  }

  // Fallback para email si no se encontró
  if (!ubicacion.email) {
    ubicacion.email = extractEmailFromScanned(text);
    if (ubicacion.email) {
      console.log('🟢 [UBICACION] Email (fallback):', ubicacion.email);
    }
  }

  // ====== EXTRAER TELÉFONO ======
  // Teléfonos colombianos siempre tienen 10 dígitos (o 7 para fijos sin indicativo)
  // - Celulares: inician con 3 (10 dígitos)
  // - Fijos con indicativo: inician con 6XX (10 dígitos)
  // - Fijos sin indicativo: 7 dígitos
  // Ejemplo: "44. Teléfonó 1 60174341 8 3/45. Teléfono 2 313282223"
  //   → Teléfono1: "6017434183" (extraer dígitos después de marcador 44)
  //   → Teléfono2: "3132822231" (extraer dígitos después de marcador 45)

  const telefonosEncontrados: string[] = [];

  // Estrategia 1: Buscar marcadores 44 y 45 en el RUT
  for (const line of lines) {
    console.log('🟢 [UBICACION] Analizando línea para teléfonos:', line);

    // Buscar marcador "44. Teléfono 1" o "Teléfonó 1"
    if (/44\.\s*Tel[eéÉ]fon[oóÓ]\s*1/i.test(line)) {
      // Extraer dígitos después del marcador hasta el siguiente marcador o delimitador
      // Patrón: capturar dígitos (con espacios intercalados) hasta encontrar "/" o "45"
      const match = line.match(/44\.\s*Tel[eéÉ]fon[oóÓ]\s*1\s+([\d\s]+?)(?:\/|45|$)/i);
      if (match) {
        const digitos = match[1].replace(/\s/g, ''); // Remover espacios
        if (digitos.length >= 7 && digitos.length <= 10) {
          telefonosEncontrados.push(digitos);
          console.log('🟢 [UBICACION] Teléfono 1 (marcador 44):', digitos);
        }
      }
    }

    // Buscar marcador "45. Teléfono 2" o "Teléfonó 2"
    if (/45\.\s*Tel[eéÉ]fon[oóÓ]\s*2/i.test(line)) {
      // Extraer dígitos después del marcador hasta fin de línea o siguiente elemento
      const match = line.match(/45\.\s*Tel[eéÉ]fon[oóÓ]\s*2\s+([\d\s]+?)(?:\s|$)/i);
      if (match) {
        const digitos = match[1].replace(/\s/g, '').trim();
        if (digitos.length >= 7 && digitos.length <= 10) {
          telefonosEncontrados.push(digitos);
          console.log('🟢 [UBICACION] Teléfono 2 (marcador 45):', digitos);
        }
      }
    }
  }

  // Estrategia 2 (fallback): Buscar secuencias de dígitos consecutivos si no encontramos con marcadores
  if (telefonosEncontrados.length === 0) {
    for (const line of lines) {
      // Primero buscar celulares completos (10 dígitos que empiezan con 3)
      const celularMatch = line.match(/3\d{9}/g);
      if (celularMatch) {
        for (const celular of celularMatch) {
          if (!telefonosEncontrados.includes(celular)) {
            telefonosEncontrados.push(celular);
            console.log('🟢 [UBICACION] Celular encontrado:', celular);
          }
        }
      }

      // Buscar fijos con indicativo (6XX + 7 dígitos más)
      const fijoIndicativoMatch = line.match(/6\d{8,9}/g);
      if (fijoIndicativoMatch) {
        for (const fijo of fijoIndicativoMatch) {
          if (!telefonosEncontrados.includes(fijo)) {
            telefonosEncontrados.push(fijo);
            console.log('🟢 [UBICACION] Fijo con indicativo encontrado:', fijo);
          }
        }
      }

      // Buscar teléfono con ventana deslizante sobre todos los dígitos de la línea.
      // Maneja ruido OCR antes/después del número:
      //   "1 Comoros an Td 352707 0ames" → "13527070" → ventana[1:8]="3527070" ✓
      //   "1 C0m0r0s an Td 352707 0ames" → "10003527070" → ventana[4:11]="3527070" ✓
      // GUARD: solo procesar si hay al menos 5 dígitos consecutivos en la línea,
      // para no confundir códigos dispersos de ubicación ("1 6 9 | ... 1 1 | ... 001" → max run=3)
      // con números de teléfono reales ("352707" → run=6).
      const digitosEnLinea = line.replace(/[^\d]/g, '');
      const maxRunConsecutivo = Math.max(0, ...[...line.matchAll(/\d+/g)].map(m => m[0].length));

      if (digitosEnLinea.length >= 7 && maxRunConsecutivo >= 5) {
        let encontrado = false;

        // Prioridad 1: celular 10 dígitos (ventana, por si los dígitos no son consecutivos en la línea)
        if (!encontrado && digitosEnLinea.length >= 10) {
          for (let s = 0; s + 10 <= digitosEnLinea.length; s++) {
            const v = digitosEnLinea.slice(s, s + 10);
            if (/^3/.test(v) && !telefonosEncontrados.includes(v)) {
              telefonosEncontrados.push(v);
              console.log('🟢 [UBICACION] Celular ventana (10 dígitos):', v);
              encontrado = true;
              break;
            }
          }
        }

        // Prioridad 2: fijo local de 7 dígitos
        if (!encontrado) {
          for (let s = 0; s + 7 <= digitosEnLinea.length; s++) {
            const v = digitosEnLinea.slice(s, s + 7);
            if (/^[2-9]/.test(v) && !telefonosEncontrados.includes(v)) {
              telefonosEncontrados.push(v);
              console.log('🟢 [UBICACION] Fijo ventana (7 dígitos):', v);
              encontrado = true;
              break;
            }
          }
        }

        // Prioridad 3: número parcial de 6 dígitos
        // Caso: "1 Comoros an Td 352707 games" → digitosEnLinea="1352707"
        // ventana 7 falla ("1352707" empieza con 1), pero ventana 6 en s=1 → "352707" ✓
        if (!encontrado) {
          for (let s = 0; s + 6 <= digitosEnLinea.length; s++) {
            const v = digitosEnLinea.slice(s, s + 6);
            if (/^[2-9]/.test(v) && !telefonosEncontrados.includes(v)) {
              telefonosEncontrados.push(v);
              console.log('🟢 [UBICACION] Parcial ventana (6 dígitos):', v);
              encontrado = true;
              break;
            }
          }
        }
      }

      // Si ya encontramos al menos 2 teléfonos, parar
      if (telefonosEncontrados.length >= 2) break;
    }
  }

  // Asignar teléfonos encontrados
  if (telefonosEncontrados.length > 0) {
    // Priorizar teléfonos más largos (10 dígitos) sobre más cortos (7 dígitos)
    telefonosEncontrados.sort((a, b) => {
      // Celulares (empiezan con 3) primero
      if (a.startsWith('3') && !b.startsWith('3')) return -1;
      if (!a.startsWith('3') && b.startsWith('3')) return 1;
      // Luego por longitud
      return b.length - a.length;
    });

    // Si el primer teléfono es corto (7 dígitos) y hay uno que empieza con 3, intercambiar
    if (telefonosEncontrados[0].length === 7 && telefonosEncontrados.length > 1 && telefonosEncontrados[1].startsWith('3')) {
      [telefonosEncontrados[0], telefonosEncontrados[1]] = [telefonosEncontrados[1], telefonosEncontrados[0]];
    }

    ubicacion.telefono1 = telefonosEncontrados[0];
    console.log('🟢 [UBICACION] Teléfono principal:', ubicacion.telefono1);

    if (telefonosEncontrados.length > 1) {
      ubicacion.telefono2 = telefonosEncontrados[1];
      console.log('🟢 [UBICACION] Teléfono secundario:', ubicacion.telefono2);
    }
  }

  // Fallback: buscar cualquier secuencia de 10 dígitos que inicie con 3 o 6
  if (!ubicacion.telefono1) {
    const allDigitSequences = text.match(/\d{7,}/g);
    if (allDigitSequences) {
      // Primero buscar celular colombiano (3XX, 10 dígitos)
      const celular = allDigitSequences.find(d => d.length === 10 && d.startsWith('3'));
      if (celular) {
        ubicacion.telefono1 = celular;
      } else {
        // Si no hay celular, buscar fijo con indicativo (6XX, 10 dígitos) o fijo (7 dígitos)
        for (const digits of allDigitSequences) {
          if (digits.length === 10 && digits.startsWith('6')) {
            ubicacion.telefono1 = digits;
            break;
          } else if (digits.length === 7 && /^[2-8]/.test(digits)) {
            ubicacion.telefono1 = digits;
            break;
          }
        }
      }
    }
  }

  // Estrategia de teléfono parcial: Si encontramos números incompletos, completar con X
  // Buscar en líneas que contengan "44" o "45" (con o sin punto) + dígitos que empiecen con 3 o 6
  if (!ubicacion.telefono1) {
    for (const line of lines) {
      // Buscar líneas con marcador de teléfono (con o sin punto)
      if (/\b(44|45)[\.\s]|tel[eéÉ]fon[oóÓ]/i.test(line)) {
        console.log('🟢 [UBICACION] Línea candidata para teléfono parcial:', line);

        // Extraer todos los dígitos de la línea
        const todosDigitos = line.replace(/[^\d]/g, '');
        console.log('🟢 [UBICACION] Dígitos extraídos para teléfono parcial:', todosDigitos);

        // Buscar secuencias que empiecen con 3 (celular) o 6 (fijo)
        const celularParcial = todosDigitos.match(/3\d+/);
        const fijoParcial = todosDigitos.match(/6\d+/);

        if (celularParcial && celularParcial[0].length >= 4 && celularParcial[0].length < 10) {
          // Completar hasta 10 dígitos con X
          const digitosFaltantes = 10 - celularParcial[0].length;
          ubicacion.telefono1 = celularParcial[0] + 'X'.repeat(digitosFaltantes);
          console.log('🟢 [UBICACION] Teléfono parcial celular:', ubicacion.telefono1, `(${celularParcial[0].length} dígitos + ${digitosFaltantes} X)`);
          break;
        } else if (fijoParcial && fijoParcial[0].length >= 4 && fijoParcial[0].length < 10) {
          // Completar hasta 10 dígitos con X
          const digitosFaltantes = 10 - fijoParcial[0].length;
          ubicacion.telefono1 = fijoParcial[0] + 'X'.repeat(digitosFaltantes);
          console.log('🟢 [UBICACION] Teléfono parcial fijo:', ubicacion.telefono1, `(${fijoParcial[0].length} dígitos + ${digitosFaltantes} X)`);
          break;
        }
      }
    }
  }

  console.log('🟢 [UBICACION] Resultado final:', ubicacion);

  return ubicacion;
}

/**
 * Parsea clasificación de RUT escaneado.
 */
function parseClasificacionScanned(lines: string[]): ClasificacionData {
  console.log('🟡 [CLASIFICACION SCANNED] Procesando clasificación con', lines.length, 'líneas');
  console.log('🟡 [CLASIFICACION] Líneas recibidas:');
  lines.forEach((line, i) => console.log(`   ${i}: ${line.slice(0, 70)}`));

  const text = lines.join('\n');

  const clasificacion: ClasificacionData = {
    actividadPrincipal: '',
    fechaInicioActividadPrincipal: '',
    actividadSecundaria: null,
    fechaInicioActividadSecundaria: null,
    otraActividad1: null,
    otraActividad2: null,
    ocupacion: null,
  };

  // ====== EXTRAER CÓDIGO DE ACTIVIDAD PRINCIPAL Y FECHA ======
  // Buscar línea después de "46.Código" que contenga el patrón con código y fecha
  // Ejemplo formato 1: "|s 6 1 3][20230907]l|s [20400] |9 2 0 0|"
  // Ejemplo formato 2: "4752120071114 2 51" (código + fecha concatenados)
  // NOTA: "s" puede ser "5" mal reconocido por OCR

  for (let i = 0; i < lines.length; i++) {
    // Buscar marcador "46.Código"
    if (/46\.\s*C[óo]digo/i.test(lines[i])) {
      console.log('🟡 [CLASIFICACION] Encontrado marcador "46.Código" en línea', i);

      // La información está en la línea siguiente
      if (i + 1 < lines.length) {
        const dataLine = lines[i + 1];
        console.log('🟡 [CLASIFICACION] Línea de datos:', dataLine);

        // Extraer todos los dígitos de la línea
        const soloDigitos = dataLine.replace(/[^\d]/g, '');
        console.log('🟡 [CLASIFICACION] Solo dígitos:', soloDigitos);

        // Estrategia: Las actividades económicas SIEMPRE son grupos de 4 dígitos
        // Formato esperado: ACTIVIDAD_PRINCIPAL(4) + FECHA_PRINCIPAL(8) + ACTIVIDAD_SECUNDARIA(4) + FECHA_SECUNDARIA(8) + OTRAS...
        // Ejemplo: "4651)|2013,0321||9 57 204,3,0321 6202)4754"
        // Solo dígitos: "4651201303219572043032162024754"
        // Grupos: 4651 | 20130321 | 9572 | 04303216 | 2024754 (este último tiene más de 4)

        if (soloDigitos.length >= 4) {
          // 1. ACTIVIDAD PRINCIPAL: Primeros 4 dígitos
          clasificacion.actividadPrincipal = soloDigitos.slice(0, 4);
          console.log('🟡 [CLASIFICACION] Actividad principal:', clasificacion.actividadPrincipal);

          // 2. FECHA ACTIVIDAD PRINCIPAL: Siguientes 8 dígitos (si existen)
          if (soloDigitos.length >= 12) {
            const fechaStr = soloDigitos.slice(4, 12);
            const year = fechaStr.substring(0, 4);
            const month = fechaStr.substring(4, 6);
            const day = fechaStr.substring(6, 8);
            clasificacion.fechaInicioActividadPrincipal = `${day}/${month}/${year}`;
            console.log('🟡 [CLASIFICACION] Fecha inicio actividad principal:', clasificacion.fechaInicioActividadPrincipal);

            // 3. ACTIVIDAD SECUNDARIA: Siguientes 4 dígitos (posición 12-16)
            if (soloDigitos.length >= 16) {
              clasificacion.actividadSecundaria = soloDigitos.slice(12, 16);
              console.log('🟡 [CLASIFICACION] Actividad secundaria:', clasificacion.actividadSecundaria);

              // 4. FECHA ACTIVIDAD SECUNDARIA: Siguientes 8 dígitos (posición 16-24)
              if (soloDigitos.length >= 24) {
                const fechaSecStr = soloDigitos.slice(16, 24);
                const yearSec = fechaSecStr.substring(0, 4);
                const monthSec = fechaSecStr.substring(4, 6);
                const daySec = fechaSecStr.substring(6, 8);
                clasificacion.fechaInicioActividadSecundaria = `${daySec}/${monthSec}/${yearSec}`;
                console.log('🟡 [CLASIFICACION] Fecha inicio actividad secundaria:', clasificacion.fechaInicioActividadSecundaria);

                // 5. OTRAS ACTIVIDADES: Extraer grupos de 4 dígitos restantes (posición 24+)
                const restantes = soloDigitos.slice(24);
                console.log('🟡 [CLASIFICACION] Dígitos restantes:', restantes);

                // Buscar grupos de exactamente 4 dígitos en los restantes
                const otrasActMatch = restantes.match(/\d{4}/g);
                if (otrasActMatch && otrasActMatch.length > 0) {
                  clasificacion.otraActividad1 = otrasActMatch[0];
                  console.log('🟡 [CLASIFICACION] Otra actividad 1:', otrasActMatch[0]);

                  if (otrasActMatch.length > 1) {
                    clasificacion.otraActividad2 = otrasActMatch[1];
                    console.log('🟡 [CLASIFICACION] Otra actividad 2:', otrasActMatch[1]);
                  }
                }
              }
            }
          }
        }

        // Fallback: Si no se pudo extraer con el método de dígitos consecutivos,
        // intentar con separadores explícitos
        if (!clasificacion.actividadPrincipal) {
          // INTENTO 1: Código separado por pipe o slash de la fecha: "4290|20240102" o "9499/20180315"
          const pipeSepMatch = dataLine.match(/^(\d{4})[\|\/](\d{8})/);
          if (pipeSepMatch) {
            clasificacion.actividadPrincipal = pipeSepMatch[1];
            const fechaStr = pipeSepMatch[2];
            const year = fechaStr.substring(0, 4);
            const month = fechaStr.substring(4, 6);
            const day = fechaStr.substring(6, 8);
            clasificacion.fechaInicioActividadPrincipal = `${day}/${month}/${year}`;
            console.log('🟡 [CLASIFICACION] Código actividad (separador fallback):', pipeSepMatch[1]);
            console.log('🟡 [CLASIFICACION] Fecha inicio actividad (separador fallback):', clasificacion.fechaInicioActividadPrincipal);
          }
        }

        break;
      }
    }
  }

  // Fallback: buscar código en formato estándar si no se encontró
  if (!clasificacion.actividadPrincipal) {
    const codigoMatch = text.match(/C[ÓO0]D[I1]GO[\s:]+(\d{4,6})/i) ||
      text.match(/(\d{4})\s*\]?\s*\[?\s*\d{8}/);
    if (codigoMatch) {
      clasificacion.actividadPrincipal = codigoMatch[1];
      console.log('🟡 [CLASIFICACION] Código actividad (fallback):', codigoMatch[1]);
    }
  }

  // Fallback: buscar fecha si no se encontró
  if (!clasificacion.fechaInicioActividadPrincipal) {
    const fechaMatch = text.match(/\[?(\d{8})\]?/) ||
      text.match(/47\.\s*Fecha\s+[Ii]nicio.*?(\d{8})/i);

    if (fechaMatch) {
      const fechaStr = fechaMatch[1];
      if (fechaStr.length === 8) {
        const year = fechaStr.substring(0, 4);
        const month = fechaStr.substring(4, 6);
        const day = fechaStr.substring(6, 8);
        clasificacion.fechaInicioActividadPrincipal = `${day}/${month}/${year}`;
        console.log('🟡 [CLASIFICACION] Fecha inicio (fallback):', clasificacion.fechaInicioActividadPrincipal);
      }
    }
  }

  // ====== EXTRAER DESCRIPCIÓN DE ACTIVIDAD ======
  const actPrincipalMatch = text.match(/[A4]CT[I1]V[I1]D[A4]D\s*PR[I1]NC[I1]P[A4]L[\s:]+([A-Z0-9\s,.-]+?)(?:\n|Fecha)/i) ||
    text.match(/Expendio\s+a\s+la\s+mesa.*restaurante/i) ||
    text.match(/[A4]limentos\s+preparados/i);

  if (actPrincipalMatch && clasificacion.actividadPrincipal.length < 4) {
    // Solo usar descripción textual si no tenemos código numérico
    clasificacion.actividadPrincipal = actPrincipalMatch[1]?.trim() || actPrincipalMatch[0].trim();
    console.log('🟡 [CLASIFICACION] Descripción actividad:', clasificacion.actividadPrincipal);
  }

  // ====== ACTIVIDAD SECUNDARIA ======
  const actSecundariaMatch = text.match(/[A4]CT[I1]V[I1]D[A4]D\s*SECUND[A4]R[I1][A4][\s:]+([A-Z0-9\s,.-]+?)(?:\n|$)/i);
  if (actSecundariaMatch) {
    clasificacion.actividadSecundaria = actSecundariaMatch[1].trim();
    console.log('🟡 [CLASIFICACION] Actividad secundaria:', clasificacion.actividadSecundaria);
  }

  console.log('🟡 [CLASIFICACION] Resultado final:', clasificacion);

  return clasificacion;
}

/**
 * Parsea responsabilidades fiscales de RUT escaneado.
 */
function parseResponsabilidadesScanned(lines: string[]): ResponsabilidadesData {
  console.log('🟣 [RESPONSABILIDADES SCANNED] Procesando responsabilidades con', lines.length, 'líneas');
  console.log('🟣 [RESPONSABILIDADES] Líneas recibidas:');
  lines.forEach((line, i) => console.log(`   ${i}: ${line.slice(0, 70)}`));

  const items: ResponsabilidadItem[] = [];
  const codigosVistos = new Set<string>();

  // ====== ESTRATEGIA 1: BUSCAR TODOS LOS PATRONES "NN - Descripción" EN CADA LÍNEA ======
  // Busca códigos al inicio Y en medio de la línea
  // Ejemplo línea múltiple: "05- texto _52- Facturador-electrónico"
  // Maneja artefacto OCR "555 -" → código "55" (dígito triplicado)

  for (const line of lines) {
    const codeRegex = /(\d{2,3})\s*[-–—]\s*/g;
    const codeMatches = [...line.matchAll(codeRegex)];

    for (let i = 0; i < codeMatches.length; i++) {
      const m = codeMatches[i];
      const rawCode = m[1];
      // Normaliza 3 dígitos a 2 ("555" → "55", artefacto OCR)
      const codigo = rawCode.length === 3 ? rawCode.slice(-2) : rawCode;

      const nameStart = m.index! + m[0].length;
      const nameEnd = i + 1 < codeMatches.length ? codeMatches[i + 1].index! : line.length;

      const nombre = line.slice(nameStart, nameEnd)
        .replace(/[/_|«»<>*]+/g, ' ')  // reemplaza caracteres OCR por espacio
        .replace(/\s*[-–—]+\s*$/, '')  // elimina guiones al final
        .replace(/\s+/g, ' ')
        .trim();

      // Descarta si el nombre no comienza con letra (probable ruido OCR)
      if (!nombre.match(/^[A-Za-záéíóúÁÉÍÓÚñÑü]/)) continue;

      if (!codigosVistos.has(codigo)) {
        codigosVistos.add(codigo);
        items.push({ codigo, nombre });
        console.log('🟣 [RESPONSABILIDADES] Item extraído:', codigo, '-', nombre);
      }
    }
  }

  // ====== ESTRATEGIA 2: BUSCAR EN "53. Código" ======
  // Solo si no se encontró con la estrategia 1
  // Ejemplo: "53. Código |4 9 Ds ,"

  if (items.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      if (/53\.\s*C[óo]digo/i.test(lines[i])) {
        console.log('🟣 [RESPONSABILIDADES] Encontrado marcador "53. Código" en línea', i);

        // Buscar dígitos en la misma línea
        const codigoMatch = lines[i].match(/\|?\s*(\d)\s+(\d)/);

        if (codigoMatch) {
          const codigo = codigoMatch[1] + codigoMatch[2];
          if (!codigosVistos.has(codigo)) {
            codigosVistos.add(codigo);
            // Intentar encontrar el nombre en las siguientes líneas
            let nombre = '';

            // Buscar en las siguientes 3 líneas
            for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
              const descripcionMatch = lines[j].match(/^(\d{2})\s*[-–—]\s*([A-Za-zÁ-Úá-ú\s]+)/i);
              if (descripcionMatch && descripcionMatch[1] === codigo) {
                nombre = descripcionMatch[2].trim();
                break;
              }
            }

            items.push({ codigo, nombre });
            console.log('🟣 [RESPONSABILIDADES] Item extraído de "53. Código":', codigo, '-', nombre || '(sin nombre)');
          }
        }
      }
    }
  }

  // ====== ESTRATEGIA 3: FALLBACK GENÉRICO ======
  // Buscar cualquier patrón "NN - Texto" en todo el texto

  if (items.length === 0) {
    console.log('🟣 [RESPONSABILIDADES] Aplicando fallback genérico...');
    const text = lines.join('\n');
    const descripcionMatches = text.matchAll(/(\d{2})\s*[-–—]\s*([A-Za-zÁ-Úá-ú\s]+?)(?:\n|e\s|$)/gi);

    for (const match of descripcionMatches) {
      const codigo = match[1];
      const nombre = match[2].trim();

      if (!codigosVistos.has(codigo)) {
        codigosVistos.add(codigo);
        items.push({ codigo, nombre });
        console.log('🟣 [RESPONSABILIDADES] Item encontrado (fallback):', codigo, '-', nombre);
      }
    }
  }

  console.log('🟣 [RESPONSABILIDADES] Items totales:', items.length);
  items.forEach(item => console.log('   -', item.codigo, ':', item.nombre));

  return { codigos: items };
}

/**
 * Parsea representantes legales de RUT escaneado (casillas 98-110).
 * Detecta tanto principal (cod 18) como suplente (cod 19).
 */
function parseRepresentantesLegalesScanned(lines: string[]): RepresentanteLegalData[] {
  console.log('🟣 [REPRS_LEGALES SCANNED] Procesando representantes legales con', lines.length, 'líneas');

  if (lines.length === 0) return [];

  const representantes: RepresentanteLegalData[] = [];
  const texto = lines.join('\n');

  // Dividir en bloques por marcador "98. Representación"
  const bloques = texto.split(/(?=98\.\s*Representaci[óo]n)/gi);

  for (const bloque of bloques) {
    if (bloque.trim().length < 20) continue;

    console.log('🟣 [REPRS_LEGALES] Bloque:', bloque.slice(0, 80));

    // ====== 1. TIPO DE REPRESENTACIÓN ======
    const esPrincipal = /REPRS\s*LEGAL\s*PRIN/i.test(bloque);
    const esSuplente = /REPRS\s*LEGAL\s*SUPL/i.test(bloque);

    if (!esPrincipal && !esSuplente) {
      console.log('🟣 [REPRS_LEGALES] Sin PRIN/SUPL → omitiendo');
      continue;
    }

    const tipoRepresentacion = esPrincipal ? 'Principal' : 'Suplente';
    // Código fijo: 18 = Principal, 19 = Suplente
    const codRepresentante = esPrincipal ? '18' : '19';

    // ====== 2. FECHA INICIO VINCULACIÓN (casilla 99) ======
    // Línea: "REPRS LEGAL PRIN 18 2007124 7|" → extraer dígitos tras el código
    let fechaInicioVinculacion: string | null = null;
    const bloqueLineas = bloque.split('\n');
    const reprsLine = bloqueLineas.find(l => /REPRS\s*LEGAL\s*(?:PRIN|SUPL)/i.test(l));

    if (reprsLine) {
      // Quitar "REPRS LEGAL PRIN/SUPL XX" del inicio de la línea
      const afterCode = reprsLine.replace(/.*?REPRS\s*LEGAL\s*(?:PRIN|SUPL)\s*\d{1,2}\s*/i, '');
      // Tratar "|" como "1" (error OCR frecuente) y extraer solo dígitos
      const dateDigits = afterCode.replace(/\|/g, '1').replace(/[^\d]/g, '');
      if (dateDigits.length >= 6) {
        fechaInicioVinculacion = dateDigits.slice(0, 8);
      }
      console.log('🟣 [REPRS_LEGALES] Fecha inicio:', fechaInicioVinculacion, '← raw:', afterCode);
    }

    // ====== 3. TIPO DE DOCUMENTO Y NÚMERO DE IDENTIFICACIÓN (casillas 100-101) ======
    // Línea PRIN: "Cédula de Ciudadaní 4 3 |7 9 7 8 8 21 9 |"
    //   → tipoDocCodigo "13", número = dígitos tras primer "|"
    // Línea SUPL: "Cédula de Ciudadan 4 3/4 0 7 07 52231"
    //   → tipoDocCodigo "13", número = dígitos tras primer "/"
    const cedulaLine = bloqueLineas.find(l => /C[eé]dula\s*de\s*Ciudadan/i.test(l));

    let tipoDocumento = '';
    let tipoDocCodigo: string | undefined;
    let numeroIdentificacion = '';

    if (cedulaLine) {
      tipoDocumento = 'CC';
      tipoDocCodigo = '13'; // Siempre "13" para cédula

      // Número: dígitos DESPUÉS del primer separador "|" o "/"
      const separatorMatch = cedulaLine.match(/[\|\/]([\d\s]+)/);
      if (separatorMatch) {
        const raw = separatorMatch[1].replace(/[^\d]/g, '');
        // Cédulas colombianas: 8-10 dígitos
        numeroIdentificacion = raw.length > 10 ? raw.slice(0, 10) : raw;
      }
      console.log('🟣 [REPRS_LEGALES] Doc:', tipoDocumento, '| ID:', numeroIdentificacion, '← raw:', cedulaLine);
    }

    // ====== 4. NOMBRES (casillas 104-107) ======
    // Línea cabecera: "104. Primer apellido 105. Segundo apellido 106. Primer nombre 107. Otros nombres"
    // Línea datos:    "OROZCO CARABALLO CAMPO, ELIAS"   → con coma
    //                 "LEON GUTIERREZ JISNEYT STEPHANIE" → sin coma
    // Formato: APELLIDO1 APELLIDO2 PRIMERNOMBRE[, OTROSNOMBRES]
    let primerApellido = '';
    let segundoApellido: string | null = null;
    let primerNombre = '';
    let otrosNombres: string | null = null;

    const headerNombresIdx = bloqueLineas.findIndex(l => /104\.\s*Primer\s*apellido/i.test(l));
    if (headerNombresIdx !== -1 && headerNombresIdx + 1 < bloqueLineas.length) {
      const nombresLine = bloqueLineas[headerNombresIdx + 1].trim();
      console.log('🟣 [REPRS_LEGALES] Línea nombres:', nombresLine);

      if (nombresLine && /[A-ZÁÉÍÓÚÑ]/i.test(nombresLine)) {
        const commaIdx = nombresLine.indexOf(',');

        if (commaIdx !== -1) {
          // "OROZCO CARABALLO CAMPO, ELIAS"
          const palabras = nombresLine.slice(0, commaIdx).trim().split(/\s+/).filter(Boolean);
          const despuesComma = nombresLine.slice(commaIdx + 1).trim();

          primerApellido = palabras[0] ?? '';
          segundoApellido = palabras[1] ?? null;
          primerNombre = palabras[2] ?? '';
          otrosNombres = despuesComma || null;
        } else {
          // "LEON GUTIERREZ JISNEYT STEPHANIE"
          const palabras = nombresLine.split(/\s+/).filter(Boolean);

          primerApellido = palabras[0] ?? '';
          segundoApellido = palabras[1] ?? null;
          primerNombre = palabras[2] ?? '';
          otrosNombres = palabras.slice(3).join(' ') || null;
        }
      }
      console.log('🟣 [REPRS_LEGALES] Nombres:', { primerApellido, segundoApellido, primerNombre, otrosNombres });
    }

    // Solo agregar si tenemos los datos mínimos
    if (tipoDocumento && numeroIdentificacion && primerApellido) {
      representantes.push({
        tipoRepresentacion,
        codRepresentante,
        tipoDocumento,
        tipoDocCodigo,
        numeroIdentificacion,
        fechaExpedicion: null,
        lugarExpedicionPais: null,
        lugarExpedicionDepartamento: null,
        lugarExpedicionCiudad: null,
        primerApellido,
        segundoApellido,
        primerNombre,
        otrosNombres,
        razonSocial: null,
        fechaInicioVinculacion,
      });
      console.log('🟣 [REPRS_LEGALES] ✅ Agregado:', tipoRepresentacion);
    } else {
      console.log('🟣 [REPRS_LEGALES] ⚠️ Sin datos suficientes → omitido | doc:', tipoDocumento, '| id:', numeroIdentificacion, '| apellido:', primerApellido);
    }
  }

  console.log('🟣 [REPRS_LEGALES] Total extraídos:', representantes.length);
  return representantes;
}

/**
 * Parsea socios de RUT escaneado (casillas 111-123).
 * Similar a representantes legales (casillas 98-110).
 */
function parseSociosScanned(lines: string[]): SocioData[] {
  console.log('🔵 [SOCIOS SCANNED] Procesando socios con', lines.length, 'líneas');
  console.log('🔵 [SOCIOS] Líneas recibidas:');
  lines.forEach((line, i) => console.log(`   ${i}: ${line.slice(0, 80)}`));

  if (lines.length === 0) return [];

  const socios: SocioData[] = [];
  const texto = lines.join('\n');

  // Dividir en bloques por marcador "111. Tipo"
  const bloques = texto.split(/(?=111\.\s*Tipo)/gi);

  // console.log('🔵 [SOCIOS] Total de bloques encontrados:', bloques.length);

  for (let bloqueIdx = 0; bloqueIdx < bloques.length; bloqueIdx++) {
    const bloque = bloques[bloqueIdx];
    if (bloque.trim().length < 10) {
      console.log(`🔵 [SOCIOS] Bloque ${bloqueIdx} muy corto, omitiendo`);
      continue;
    }

    // console.log(`🔵 [SOCIOS] ==================== PROCESANDO BLOQUE ${bloqueIdx} ====================`);
    // console.log(`🔵 [SOCIOS] Longitud del bloque: ${bloque.length} caracteres`);
    // console.log(`🔵 [SOCIOS] Primeros 150 caracteres:`, bloque.substring(0, 150));

    const bloqueLineas = bloque.split('\n');

    // ====== 1. TIPO DE DOCUMENTO Y NÚMERO DE IDENTIFICACIÓN (casillas 111-112) ======
    let tipoDocumento = '';
    let tipoDocCodigo: string | undefined;
    let numeroIdentificacion = '';
    let dv: string | null = null;
    let nacionalidad: string | null = null;
    let nacionalidadCodigo: string | null = null;

    const cedulaLine = bloqueLineas.find(l => /C[eé]dula\s*de\s*Ciuda/i.test(l));
    const nitLine = bloqueLineas.find(l => /\bN[I1]T\b/i.test(l) && /[\|\/\d]/.test(l));

    console.log('🔵 [SOCIOS] cedulaLine encontrada:', cedulaLine);
    console.log('🔵 [SOCIOS] nitLine encontrada:', nitLine);

    if (cedulaLine) {
      tipoDocumento = 'CC';
      tipoDocCodigo = '13'; // SIEMPRE es 13 para cédula de ciudadanía

      // Estrategia: buscar el grupo MÁS LARGO de dígitos consecutivos (8-10 dígitos)
      // Ejemplo 1: "Cédula de Ciudada 4 3 18 0 2 8 24 34 | | COLOMBIA 169"
      //            No hay grupo de 8+ dígitos → Tomar después de código doc, antes de separador
      // Ejemplo 2: "Cédula de Ciudada 4 3 14 14 10505456 COLOMBIA 169"
      //            Grupo "10505456" (8 dígitos) → Usar este ✅

      // Dividir por COLOMBIA para no incluir código de país (169)
      const beforeColombia = cedulaLine.split(/COLOMBIA/i)[0];
      const beforeSeparator = beforeColombia.split(/[\|\/]/)[0];

      // INTENTO 1: Buscar un grupo consecutivo de 8-10 dígitos (sin espacios intermedios)
      const largeGroupMatch = beforeSeparator.match(/\b(\d{8,10})\b/);
      if (largeGroupMatch) {
        numeroIdentificacion = largeGroupMatch[1];
        console.log('🔵 [SOCIOS] Número (grupo consecutivo 8-10 dígitos):', numeroIdentificacion);
      } else {
        // INTENTO 2: No hay grupo grande, extraer todos los dígitos y saltar los primeros 2
        const digitsOnly = beforeSeparator.replace(/[^\d]/g, '');
        // console.log('🔵 [SOCIOS] Dígitos extraídos (sin código país):', digitsOnly);

        if (digitsOnly.length >= 10) {
          numeroIdentificacion = digitsOnly.slice(2, 12); // Saltar código doc (2 dígitos), tomar 10
          console.log('🔵 [SOCIOS] Número (saltando código doc, 10 dígitos):', numeroIdentificacion);
        } else if (digitsOnly.length >= 9) {
          // Caso especial: solo 9 dígitos después del código doc (CC puede tener 8-10 dígitos)
          numeroIdentificacion = digitsOnly.slice(2, 11); // Saltar código, tomar hasta 9
          // console.log('🔵 [SOCIOS] Número (saltando código doc, 8-9 dígitos):', numeroIdentificacion);
        } else if (digitsOnly.length > 2) {
          numeroIdentificacion = digitsOnly.slice(2);
          console.log('🔵 [SOCIOS] Número (todos después código doc):', numeroIdentificacion);
        }
      }

      // DV: dígito aislado después del número, antes del segundo "|"
      const dvMatch = cedulaLine.match(/[\d\s]+[\|\/]\s*(\d+)\s*[\|\/]/);
      if (dvMatch) dv = dvMatch[1];

      // Nacionalidad: extraer código y nombre
      const nacionalidadMatch = cedulaLine.match(/COLOMBIA\s+(\d+)/i);
      if (nacionalidadMatch) {
        nacionalidadCodigo = nacionalidadMatch[1];
        if (nacionalidadCodigo === '169') {
          nacionalidad = 'Colombia';
        }
      }

      console.log('🔵 [SOCIOS] Cédula:', numeroIdentificacion, '| DV:', dv, '| Nacionalidad:', nacionalidad, `(${nacionalidadCodigo})`, '← raw:', cedulaLine);

    } else if (nitLine) {
      tipoDocumento = 'NIT';
      tipoDocCodigo = '31'; // SIEMPRE es 31 para NIT

      // Número: después de "NIT" vienen 2 dígitos del código (ej: "3 1")
      // que debemos IGNORAR, y luego el número de identificación real
      const beforeSeparator = nitLine.split(/[\|\/]/)[0];
      if (beforeSeparator) {
        // Extraer todos los dígitos
        const digitsOnly = beforeSeparator.replace(/[^\d]/g, '');

        // Saltar los primeros 2 dígitos (código tipo doc)
        // y tomar los siguientes 8-10 dígitos como número de identificación
        if (digitsOnly.length >= 10) {
          numeroIdentificacion = digitsOnly.slice(2, 12); // Del índice 2 al 12 (máx 10 dígitos)
        } else if (digitsOnly.length > 2) {
          numeroIdentificacion = digitsOnly.slice(2); // Tomar todo después de los 2 primeros
        }
      }

      // Fallback: buscar grupo de 8-10 dígitos consecutivos
      if (!numeroIdentificacion || numeroIdentificacion.length < 8) {
        const digitsMatch = nitLine.match(/\b(\d{8,10})\b/);
        if (digitsMatch) numeroIdentificacion = digitsMatch[1];
      }

      // DV: dígito aislado después del número
      const dvMatch = nitLine.match(/[\d\s]+[\|\/]\s*(\d+)\s*[\|\/]/);
      if (dvMatch) dv = dvMatch[1];

      // Nacionalidad
      const nacionalidadMatch = nitLine.match(/COLOMBIA\s+(\d+)/i);
      if (nacionalidadMatch) {
        nacionalidadCodigo = nacionalidadMatch[1];
        if (nacionalidadCodigo === '169') {
          nacionalidad = 'Colombia';
        }
      }

      console.log('🔵 [SOCIOS] NIT:', numeroIdentificacion, '| DV:', dv, '| Nacionalidad:', nacionalidad, `(${nacionalidadCodigo})`, '← raw:', nitLine);
    }

    if (!tipoDocumento || !numeroIdentificacion) {
      // console.log(`🔵 [SOCIOS] ⚠️ Bloque ${bloqueIdx} omitido - Tipo: "${tipoDocumento}", Número: "${numeroIdentificacion}"`);
      continue;
    }

    // ====== 2. NOMBRES (casillas 115-118) ======
    // Línea cabecera: "115. Primer apellido 116. Segundo apellido 117. Primer nombre 118. Otros nombres"
    // Línea datos:    "GARCIA MENDEZ JUAN CARLOS"
    let primerApellido: string | null = null;
    let segundoApellido: string | null = null;
    let primerNombre: string | null = null;
    let otrosNombres: string | null = null;

    const headerNombresIdx = bloqueLineas.findIndex(l => /115\.\s*Primer\s*apellido/i.test(l));
    if (headerNombresIdx !== -1 && headerNombresIdx + 1 < bloqueLineas.length) {
      let nombresLine = bloqueLineas[headerNombresIdx + 1].trim();

      // Limpiar separadores OCR mal interpretados como "|"
      nombresLine = nombresLine.replace(/\s*\|\s*/g, ' ').trim();

      console.log('🔵 [SOCIOS] Línea nombres:', nombresLine);

      if (nombresLine && /[A-ZÁÉÍÓÚÑ]/i.test(nombresLine)) {
        const commaIdx = nombresLine.indexOf(',');

        if (commaIdx !== -1) {
          // "GARCIA MENDEZ JUAN, CARLOS"
          const palabras = nombresLine.slice(0, commaIdx).trim().split(/\s+/).filter(Boolean);
          const despuesComma = nombresLine.slice(commaIdx + 1).trim();

          primerApellido = palabras[0] ?? null;
          segundoApellido = palabras[1] ?? null;
          primerNombre = palabras[2] ?? null;
          otrosNombres = despuesComma || null;
        } else {
          // "GARCIA MENDEZ JUAN CARLOS" o "DUARTE GAITAN OSCAR IVAN"
          const palabras = nombresLine.split(/\s+/).filter(Boolean);

          primerApellido = palabras[0] ?? null;
          segundoApellido = palabras[1] ?? null;
          primerNombre = palabras[2] ?? null;
          otrosNombres = palabras.slice(3).join(' ') || null;
        }
      }
      console.log('🔵 [SOCIOS] Nombres:', { primerApellido, segundoApellido, primerNombre, otrosNombres });
    }

    // ====== 3. RAZÓN SOCIAL (casilla 119) — para socios NIT ======
    let razonSocial: string | null = null;
    const headerRazonIdx = bloqueLineas.findIndex(l => /119\.\s*Raz[oó]n\s*social/i.test(l));
    if (headerRazonIdx !== -1 && headerRazonIdx + 1 < bloqueLineas.length) {
      const razonLine = bloqueLineas[headerRazonIdx + 1].trim();
      if (razonLine && /[A-ZÁÉÍÓÚÑ]/i.test(razonLine)) {
        razonSocial = razonLine;
      }
    }

    // ====== 4. PORCENTAJE DE PARTICIPACIÓN (casilla 121) ======
    let porcentajeParticipacion: string | null = null;
    const headerPorcentajeIdx = bloqueLineas.findIndex(l => /121\.\s*[%]?\s*[Pp]articipaci[oó]n|121\.\s*Porcentaje/i.test(l));
    if (headerPorcentajeIdx !== -1 && headerPorcentajeIdx + 1 < bloqueLineas.length) {
      const porcLine = bloqueLineas[headerPorcentajeIdx + 1].trim();
      const porcMatch = porcLine.match(/(\d[\d.,]*)/);
      if (porcMatch) porcentajeParticipacion = porcMatch[1].replace(',', '.');
    }
    // Fallback: buscar patrón "121." seguido de número en la misma línea
    if (!porcentajeParticipacion) {
      for (const line of bloqueLineas) {
        const inlineMatch = line.match(/121\.[^\d]*(\d[\d.,]*)/);
        if (inlineMatch) {
          porcentajeParticipacion = inlineMatch[1].replace(',', '.');
          break;
        }
      }
    }

    // ====== 5. FECHA INICIO VINCULACIÓN (casilla 122) ======
    let fechaInicioVinculacion: string | null = null;
    const headerFechaIdx = bloqueLineas.findIndex(l => /122\.\s*Fecha/i.test(l));
    if (headerFechaIdx !== -1 && headerFechaIdx + 1 < bloqueLineas.length) {
      const fechaLine = bloqueLineas[headerFechaIdx + 1].trim();
      const dateDigits = fechaLine.replace(/[^\d]/g, '');
      if (dateDigits.length >= 6) fechaInicioVinculacion = dateDigits.slice(0, 8);
    }
    // Fallback: buscar patrón "122." seguido de dígitos en la misma línea
    if (!fechaInicioVinculacion) {
      for (const line of bloqueLineas) {
        const inlineMatch = line.match(/122\.[^\d]*(\d{6,8})/);
        if (inlineMatch) {
          fechaInicioVinculacion = inlineMatch[1];
          break;
        }
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
      codPaisNacionalidad: nacionalidadCodigo,
      primerApellido,
      segundoApellido,
      primerNombre,
      otrosNombres,
      razonSocial,
      porcentajeParticipacion,
      fechaInicioVinculacion,
    });

    // console.log(`🔵 [SOCIOS] ✅ Socio ${socios.length + 1} agregado:`, tipoDocumento, numeroIdentificacion, '-', primerApellido, segundoApellido, primerNombre, otrosNombres);
  }

  // console.log('🔵 [SOCIOS] ==================== RESUMEN ====================');
  // console.log('🔵 [SOCIOS] Total extraídos:', socios.length);
  // socios.forEach((s, i) => {
  //   console.log(`   ${i + 1}. ${s.primerApellido} ${s.segundoApellido} ${s.primerNombre} ${s.otrosNombres || ''} - CC: ${s.numeroIdentificacion}`);
  // });
  return socios;
}

/**
 * Parsea revisor fiscal de RUT escaneado (casillas 124-147).
 * Principal: casillas 124-135
 * Suplente: casillas 136-147
 */
function parseRevisorFiscalScanned(lines: string[], tipo: 'PRIN' | 'SUPL'): RevisorFiscalData | null {
  const tipoStr = tipo === 'PRIN' ? 'PRINCIPAL' : 'SUPLENTE';
  console.log(`🟣 [REV_FISCAL_${tipo} SCANNED] Procesando revisor fiscal ${tipoStr} con`, lines.length, 'líneas');

  if (lines.length === 0) {
    console.log(`🟣 [REV_FISCAL_${tipo}] No hay líneas para procesar`);
    return null;
  }

  const texto = lines.join('\n');

  // Determinar el rango de casillas según el tipo
  const casillaInicio = tipo === 'PRIN' ? '124' : '136';

  console.log(`🟣 [REV_FISCAL_${tipo}] Buscando casilla inicio:`, casillaInicio);

  // Buscar el bloque correspondiente al tipo
  const inicioIndex = texto.indexOf(`${casillaInicio}.`);
  if (inicioIndex === -1) {
    console.log(`🟣 [REV_FISCAL_${tipo}] No se encontró casilla ${casillaInicio}, retornando null`);
    return null;
  }

  // Tomar las líneas del bloque específico (aproximadamente 12 líneas)
  const lineasBloque = texto.slice(inicioIndex).split('\n').slice(0, 12);
  const bloqueTexto = lineasBloque.join('\n');

  console.log(`🟣 [REV_FISCAL_${tipo}] Bloque extraído:`, bloqueTexto.slice(0, 300));

  // === EXTRAER TIPO DE DOCUMENTO Y CÓDIGO ===
  let tipoDocumento: string = '';
  let tipoDocCodigo: string | undefined;

  if (/C[eé]dula\s*de\s*Ciudadan[ií]a/i.test(bloqueTexto)) {
    tipoDocumento = 'CC';
    tipoDocCodigo = '13';
    console.log(`🟣 [REV_FISCAL_${tipo}] Tipo documento: CC (código 13)`);
  } else if (/C[eé]dula\s*de\s*Extranjer[ií]a/i.test(bloqueTexto)) {
    tipoDocumento = 'CE';
    tipoDocCodigo = '21';
  } else if (/Pasaporte/i.test(bloqueTexto)) {
    tipoDocumento = 'PA';
    tipoDocCodigo = '41';
  }

  // === EXTRAER NÚMERO DE IDENTIFICACIÓN, DV Y TARJETA PROFESIONAL ===
  // Formato escaneado: "E [Cédula de Ciudadanía 1349249645 7 Y 7 284511"
  // Estructura (chars alfanuméricos): tipoDocCod(2) + id(8-10) + dv(1) + Y(sep) + ruido? + tarjeta(5-6)
  // "Y" es el separador de columna OCR entre DV y tarjeta profesional
  // El último dígito "1" de la tarjeta es OCR de "T"

  let numeroIdentificacion: string | null = null;
  let dv: string | undefined;
  let tarjetaProfesional: string | null = null;

  const lineaDatos = bloqueTexto.match(/C[eé]dula\s*de\s*Ciudadan[ií]a\s+(.+)/i);
  if (lineaDatos) {
    const datosStr = lineaDatos[1];
    console.log(`🟣 [REV_FISCAL_${tipo}] Datos raw:`, datosStr);

    // Extraer solo chars alfanuméricos en mayúscula (incluye la Y separadora)
    const allChars = datosStr.toUpperCase().match(/[A-Z0-9]/g)?.join('') ?? '';
    console.log(`🟣 [REV_FISCAL_${tipo}] Chars alfanuméricos:`, allChars);

    // Saltar los primeros 2 (código de tipo doc, ej "13")
    const afterCode = allChars.substring(2);

    // Buscar letra separadora de columna (cualquier mayúscula salvo T que pertenece a tarjeta)
    // "492496457Y7284511" → Y en posición 9
    const sepMatch = afterCode.match(/^([0-9]+)([A-SU-Z])(.*)$/);

    if (sepMatch) {
      const digitsBeforeSep = sepMatch[1]; // "492496457"
      const afterSep = sepMatch[3];        // "7284511"

      // Último dígito antes del separador = DV; el resto = ID (8-10 dígitos)
      if (digitsBeforeSep.length >= 2) {
        dv = digitsBeforeSep[digitsBeforeSep.length - 1];
        numeroIdentificacion = digitsBeforeSep.slice(0, -1);
      }
      console.log(`🟣 [REV_FISCAL_${tipo}] ID:`, numeroIdentificacion, '| DV:', dv);

      // Tarjeta: primer grupo de 5-6 dígitos en "afterSep" (ignorar grupos de 1 dígito = ruido)
      // "7284511" → "7" ruido, "284511" → 6 dígitos → "28451" + "T" (último "1" = OCR de T)
      for (const grupo of (afterSep.match(/\d+/g) ?? [])) {
        if (grupo.length >= 5 && grupo.length <= 6) {
          tarjetaProfesional = grupo.length === 6
            ? grupo.slice(0, 5) + 'T'  // Último dígito es "T" leído como "1"
            : grupo + 'T';
          break;
        }
      }
      console.log(`🟣 [REV_FISCAL_${tipo}] Tarjeta profesional:`, tarjetaProfesional);

    } else {
      // Fallback: sin separador "Y", extraer ID de los dígitos disponibles
      const soloDigitos = afterCode.replace(/[^0-9]/g, '');
      if (soloDigitos.length >= 8) {
        const idLen = soloDigitos.length >= 17 ? 10 : soloDigitos.length >= 15 ? 9 : 8;
        numeroIdentificacion = soloDigitos.slice(0, idLen);
        dv = soloDigitos[idLen] ?? undefined;
        // Tarjeta: últimos 5-6 dígitos
        const resto = soloDigitos.slice(idLen + 1);
        if (resto.length >= 5) {
          tarjetaProfesional = resto.length >= 6
            ? resto.slice(0, 5) + 'T'
            : resto + 'T';
        }
      }
      console.log(`🟣 [REV_FISCAL_${tipo}] ID (fallback):`, numeroIdentificacion);
    }

    if (!numeroIdentificacion) {
      console.log(`🟣 [REV_FISCAL_${tipo}] ⚠️ No se pudo extraer número de identificación`);
    }
  }

  // === EXTRAER NOMBRES ===
  // Buscar línea con nombres: "MORENO DAZA CARLOS [OSWALDO"
  let primerApellido: string | null = null;
  let segundoApellido: string | null = null;
  let primerNombre: string | null = null;
  let otrosNombres: string | null = null;

  const nombresMatch = bloqueTexto.match(/([A-ZÁÉÍÓÚÑ]+)\s+([A-ZÁÉÍÓÚÑ]+)\s+[\|\[]?([A-ZÁÉÍÓÚÑ]+)[\s\[\]]*([A-ZÁÉÍÓÚÑ]*)/);
  if (nombresMatch) {
    primerApellido = nombresMatch[1];
    segundoApellido = nombresMatch[2];
    primerNombre = nombresMatch[3];
    otrosNombres = nombresMatch[4] || null;

    console.log(`🟣 [REV_FISCAL_${tipo}] Nombres parseados:`, {
      primerApellido,
      segundoApellido,
      primerNombre,
      otrosNombres
    });
  }

  // === EXTRAER NIT (OPCIONAL) ===
  let nit: string | null = null;
  const nitMatch = bloqueTexto.match(/\b\d{9}\b/);
  if (nitMatch) {
    nit = nitMatch[0];
    console.log(`🟣 [REV_FISCAL_${tipo}] NIT:`, nit);
  }

  // === EXTRAER SOCIEDAD/FIRMA (OPCIONAL) ===
  let sociedadDesignada: string | null = null;
  const sociedadMatch = bloqueTexto.match(/Sociedad.*firma.*\n([A-ZÁ-Ú\s]+)/i);
  if (sociedadMatch) {
    sociedadDesignada = sociedadMatch[1].trim();
    console.log(`🟣 [REV_FISCAL_${tipo}] Sociedad:`, sociedadDesignada);
  }

  // === EXTRAER FECHA NOMBRAMIENTO ===
  let fechaNombramiento: string | null = null;
  const fechaMatch = bloqueTexto.match(/(\d{4})(\d{2})(\d{2})/);
  if (fechaMatch) {
    const [_, year, month, day] = fechaMatch;
    fechaNombramiento = `${day}/${month}/${year}`;
    console.log(`🟣 [REV_FISCAL_${tipo}] Fecha nombramiento:`, fechaNombramiento);
  }

  // Validar que tengamos datos mínimos
  if (tipoDocumento && numeroIdentificacion) {
    console.log(`🟣 [REV_FISCAL_${tipo}] ✅ Revisor fiscal extraído exitosamente`);
    return {
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
      tarjetaProfesional,
      fechaNombramiento,
      nit,
      sociedadDesignada
    };
  }

  console.log(`🟣 [REV_FISCAL_${tipo}] ⚠️ No se encontraron datos suficientes`);
  return null;
}

/**
 * Parsea contador de RUT escaneado (casillas 148-159).
 */
function parseContadorScanned(lines: string[]): ContadorData | null {
  console.log('🟠 [CONTADOR SCANNED] Procesando contador con', lines.length, 'líneas');

  if (lines.length === 0) {
    console.log('🟠 [CONTADOR] No hay líneas para procesar');
    return null;
  }

  const texto = lines.join('\n');

  console.log('🟠 [CONTADOR] Buscando casilla 148...');

  // Buscar el bloque que empieza con casilla 148
  const inicioIndex = texto.indexOf('148.');
  if (inicioIndex === -1) {
    console.log('🟠 [CONTADOR] No se encontró casilla 148, retornando null');
    return null;
  }

  // Tomar las líneas del bloque específico (aproximadamente 12 líneas)
  const lineasBloque = texto.slice(inicioIndex).split('\n').slice(0, 12);
  const bloqueTexto = lineasBloque.join('\n');

  console.log('🟠 [CONTADOR] Bloque extraído:', bloqueTexto.slice(0, 300));

  // === EXTRAER TIPO DE DOCUMENTO Y CÓDIGO ===
  let tipoDocumento: string = '';
  let tipoDocCodigo: string | undefined;

  if (/C[eé]dula\s*de\s*Ciudadan[ií]a/i.test(bloqueTexto)) {
    tipoDocumento = 'CC';
    tipoDocCodigo = '13';
    console.log('🟠 [CONTADOR] Tipo documento: CC (código 13)');
  } else if (/C[eé]dula\s*de\s*Extranjer[ií]a/i.test(bloqueTexto)) {
    tipoDocumento = 'CE';
    tipoDocCodigo = '21';
  } else if (/Pasaporte/i.test(bloqueTexto)) {
    tipoDocumento = 'PA';
    tipoDocCodigo = '41';
  }

  // === EXTRAER NÚMERO DE IDENTIFICACIÓN ===
  // Las cédulas colombianas tienen 10 dígitos y generalmente empiezan con "1"
  // Patrón en OCR: pueden venir con espacios, puntos, pipes y caracteres basura
  // Ejemplo: "4 3 |4 0 3 2 3 9 841.6 3 8 2533066" donde "4 3 |" es número de casilla

  let numeroIdentificacion: string | null = null;
  let dv: string | undefined;

  const lineaDatos = bloqueTexto.match(/C[eé]dula\s*de\s*Ciudadan[ií]a\s+(.+)/i);
  if (lineaDatos) {
    const datosStr = lineaDatos[1];
    console.log('🟠 [CONTADOR] Datos raw:', datosStr);

    // Limpiar: remover espacios, pipes, puntos, guiones
    const digitos = datosStr.replace(/[\s\|\.\-\/]/g, '');
    console.log('🟠 [CONTADOR] Dígitos limpiados:', digitos);

    // Buscar patrón de 10 dígitos que empiece con "1" (cédula colombiana típica)
    // o cualquier secuencia de 8-11 dígitos
    const numeroMatch = digitos.match(/1\d{9}|\d{8,11}/);
    if (numeroMatch) {
      let numeroCompleto = numeroMatch[0];

      // Si tiene más de 10 dígitos, probablemente incluye DV y parte de tarjeta
      if (numeroCompleto.length > 10) {
        numeroIdentificacion = numeroCompleto.slice(0, 10);
        dv = numeroCompleto[10];
      } else {
        numeroIdentificacion = numeroCompleto;
        // Buscar DV en el siguiente dígito aislado
        const dvMatch = datosStr.match(/\d\s+[^\d]/);
        if (dvMatch) {
          dv = dvMatch[0][0];
        }
      }

      console.log('🟠 [CONTADOR] Número identificación:', numeroIdentificacion);
      console.log('🟠 [CONTADOR] DV:', dv);
    } else {
      console.log('🟠 [CONTADOR] ⚠️ No se pudo extraer número de identificación');
    }
  }

  // === EXTRAER TARJETA PROFESIONAL ===
  let tarjetaProfesional: string | null = null;

  if (lineaDatos) {
    const datosStr = lineaDatos[1];
    // Extraer todos los grupos de dígitos
    const gruposDigitos = datosStr.match(/\d+/g);

    if (gruposDigitos && gruposDigitos.length > 0) {
      // La tarjeta suele ser el último grupo de 6-7 dígitos
      for (let i = gruposDigitos.length - 1; i >= 0; i--) {
        const grupo = gruposDigitos[i];
        if (grupo.length >= 6 && grupo.length <= 7) {
          tarjetaProfesional = grupo + 'T';
          console.log('🟠 [CONTADOR] Tarjeta profesional:', tarjetaProfesional);
          break;
        }
      }
    }

    if (!tarjetaProfesional) {
      console.log('🟠 [CONTADOR] ⚠️ No se pudo extraer tarjeta profesional');
    }
  }

  // === EXTRAER NOMBRES ===
  // Buscar línea con nombres: "MALAGON CARDOZO IVETH NATALIA"
  let primerApellido: string | null = null;
  let segundoApellido: string | null = null;
  let primerNombre: string | null = null;
  let otrosNombres: string | null = null;

  const nombresMatch = bloqueTexto.match(/152\.\s*Primer.*\n.*?([A-ZÁÉÍÓÚÑ]+)\s+([A-ZÁÉÍÓÚÑ]+)\s+([A-ZÁÉÍÓÚÑ]+)[\s]*([A-ZÁÉÍÓÚÑ]*)/i);
  if (nombresMatch) {
    primerApellido = nombresMatch[1];
    segundoApellido = nombresMatch[2];
    primerNombre = nombresMatch[3];
    otrosNombres = nombresMatch[4] || null;

    console.log('🟠 [CONTADOR] Nombres parseados:', {
      primerApellido,
      segundoApellido,
      primerNombre,
      otrosNombres
    });
  }

  // === EXTRAER NIT (OPCIONAL) ===
  let nit: string | null = null;
  const nitMatch = bloqueTexto.match(/156\.\s*N[úu]mero.*NIT.*?\n.*?(\d{9})/i);
  if (nitMatch) {
    nit = nitMatch[1];
    console.log('🟠 [CONTADOR] NIT:', nit);
  }

  // === EXTRAER SOCIEDAD/FIRMA (OPCIONAL) ===
  let sociedadDesignada: string | null = null;
  const sociedadMatch = bloqueTexto.match(/158\.\s*Sociedad.*firma.*\n([A-ZÁ-Ú\s]+)/i);
  if (sociedadMatch) {
    sociedadDesignada = sociedadMatch[1].trim();
    console.log('🟠 [CONTADOR] Sociedad:', sociedadDesignada);
  }

  // === EXTRAER FECHA NOMBRAMIENTO ===
  let fechaNombramiento: string | null = null;
  const fechaMatch = bloqueTexto.match(/159\.\s*Fecha.*\n.*?(\d{4})(\d{2})(\d{2})/i);
  if (fechaMatch) {
    const [_, year, month, day] = fechaMatch;
    fechaNombramiento = `${day}/${month}/${year}`;
    console.log('🟠 [CONTADOR] Fecha nombramiento:', fechaNombramiento);
  }

  // Validar que tengamos datos mínimos
  if (tipoDocumento && numeroIdentificacion) {
    console.log('🟠 [CONTADOR] ✅ Contador extraído exitosamente');
    return {
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
      tarjetaProfesional,
      fechaNombramiento,
      nit,
      sociedadDesignada
    };
  }

  console.log('🟠 [CONTADOR] ⚠️ No se encontraron datos suficientes');
  return null;
}



/**
 * Función principal para parsear RUT escaneado.
 * 
 * @param lines - Array de líneas extraídas por OCR
 * @returns RUTData con información extraída y normalizada
 */
export function parseRUTTextScanned(lines: string[]): RUTData {
  // console.log(lines)
  // console.log('🔍 ============================================');
  // console.log('🔍 INICIANDO PARSING DE RUT ESCANEADO');
  // console.log('🔍 Total de líneas recibidas:', lines.length);
  // console.log('🔍 ============================================');

  // Filtrar líneas vacías o muy cortas
  const cleanedLines = lines.filter(line => line.trim().length > 2);
  // console.log('🔍 Líneas después de limpieza:', cleanedLines.length);

  // Dividir en secciones con detección tolerante
  // console.log('🔍 Dividiendo documento en secciones...');
  const sections = splitIntoSectionsScanned(cleanedLines);


  const header = parseHeaderScanned(sections.header);
  const identificacion = parseIdentificacionScanned(sections.identificacion);
  const ubicacion = parseUbicacionScanned(sections.ubicacion);
  const clasificacion = parseClasificacionScanned(sections.clasificacion);
  const responsabilidades = parseResponsabilidadesScanned(sections.responsabilidades);

  // Sincronizar NIT entre header e identificación
  if (header.nit && !identificacion.numeroIdentificacion) {
    identificacion.numeroIdentificacion = header.nit;
    identificacion.dv = header.dv;
  } else if (!header.nit && identificacion.numeroIdentificacion) {
    header.nit = identificacion.numeroIdentificacion;
    header.dv = identificacion.dv || '';
  }

  const representantesLegales = parseRepresentantesLegalesScanned(sections.representantesLegales || []);
  const socios = parseSociosScanned(sections.socios || []);
  const revisorFiscalPrincipal = parseRevisorFiscalScanned(sections.revisorFiscalPrincipal || [], 'PRIN');
  const revisorFiscalSuplente = parseRevisorFiscalScanned(sections.revisorFiscalSuplente || [], 'SUPL');
  const contador = parseContadorScanned(sections.contador || []);

  // Si es persona jurídica y no se extrajo el NIT en la sección de identificación,
  // usar el NIT del header
  if (identificacion.tipoContribuyente === 'Persona jurídica' && !identificacion.numeroIdentificacion) {
    if (header.nit) {
      identificacion.numeroIdentificacion = header.nit;
      identificacion.dv = header.dv || null;
      // console.log('🔍 [MERGE] Usando NIT del header para persona jurídica:', header.nit);
    }
  }

  return {
    header,
    identificacion,
    ubicacion,
    clasificacion,
    responsabilidades,
    representantesLegales,
    socios,
    revisorFiscalPrincipal,
    revisorFiscalSuplente,
    contador,
  };
}
