import { OCRServiceResponse, RUTData } from '../../model';
import { extractTextFromPDF, loadPDF } from './pdfTextExtractor';
import { performOCRForAllPages } from './ocrProcessor';
import { parseRUTText } from './rutParser';
import { parseRUTTextScanned } from './rutParserScanned';

/**
 * Analiza un archivo PDF del RUT usando procesamiento local (client-side).
 * Orquesta PDF.js, Tesseract.js y el parser personalizado con optimizaciones.
 * 
 * @param file Archivo PDF del RUT
 * @param signal Señal para cancelar la operación
 * @param onProgress Callback opcional para reportar progreso del OCR
 * @returns Promise con OCRServiceResponse compatible con backend
 */
export async function analizarRutLocal(
  file: File,
  signal?: AbortSignal,
  onProgress?: (mensaje: string) => void
): Promise<OCRServiceResponse> {
  const startTime = performance.now();


  try {
    // 1. Verificar si la operación fue cancelada
    if (signal?.aborted) {
      throw new DOMException('Operación cancelada', 'AbortError');
    }

    // 2. Extraer texto del PDF con reconstrucción de líneas
    const extraction = await extractTextFromPDF(file, signal);

    let lines = extraction.lines;
    let numPages = 0;

    // 3. Si es PDF escaneado, aplicar OCR optimizado
    if (extraction.isScanned) {
      // console.log(`🔍 PDF escaneado detectado (${extraction.textItemCount} items). Aplicando OCR...`);

      // Cargar PDF para obtener número de páginas (se carga una sola vez)
      const pdf = await loadPDF(file);
      numPages = pdf.numPages;

      // Procesar todas las páginas con OCR optimizado (un solo worker)
      lines = await performOCRForAllPages(file, signal, onProgress);

      // console.log(`✅ OCR completado: ${lines.length} líneas extraídas de ${numPages} páginas`);
    } else {
      // console.log(`✅ PDF digital: ${extraction.textItemCount} items, ${lines.length} líneas extraídas`);
      // Para PDFs digitales, estimar páginas
      numPages = Math.ceil(lines.length / 50) || 1;
    }

    // 4. Validar que el documento es un RUT colombiano
    if (!esDocumentoRUT(lines)) {
      return {
        statusCode: 422,
        success: false,
        message: 'El documento no corresponde a un RUT colombiano. Por favor, suba el formulario de Registro Único Tributario.',
        data: {
          fileName: file.name,
          data: getEmptyRUTData(),
          processingTimeMs: Math.round(performance.now() - startTime),
          error: 'Documento no reconocido como RUT',
          pagesProcessed: numPages
        },
        traceId: generateTraceId()
      };
    }

    // 5. Verificar cancelación antes del parsing
    if (signal?.aborted) {
      throw new DOMException('Operación cancelada', 'AbortError');
    }

    // 6. Parsear las líneas reconstruidas a estructura RUTData
    const rutData: RUTData = extraction.isScanned
      ? parseRUTTextScanned(lines)  // Parser especializado para documentos escaneados
      : parseRUTText(lines);         // Parser original para PDFs digitales

    // 7. Calcular tiempo de procesamiento
    const processingTimeMs = Math.round(performance.now() - startTime);


    // 8. Construir respuesta compatible con backend

    const response: OCRServiceResponse = {
      statusCode: 200,
      success: true,
      message: 'RUT procesado exitosamente',
      data: {
        fileName: file.name,
        data: rutData,
        processingTimeMs,
        error: null,
        pagesProcessed: numPages
      },
      traceId: generateTraceId()
    };

    // console.log(`✅ Procesamiento completado en ${processingTimeMs}ms (${numPages} páginas)`);
    console.log('Datos extraidos', response);
    return response;

  } catch (error: any) {
    // Manejar errores específicos
    if (error?.name === 'AbortError') {
      console.log('❌ Operación cancelada por el usuario');
      throw error;
    }

    console.error('❌ Error durante el procesamiento OCR:', error);

    // Retornar respuesta de error compatible
    return {
      statusCode: 500,
      success: false,
      message: `Error al procesar el RUT: ${error.message || 'Error desconocido'}`,
      data: {
        fileName: file.name,
        data: getEmptyRUTData(),
        processingTimeMs: Math.round(performance.now() - startTime),

        error: error.message || 'Error desconocido',
        pagesProcessed: 0
      },
      traceId: generateTraceId()
    };
  }
}


/**
 * Verifica si las líneas extraídas corresponden a un RUT colombiano.
 * Aplica tolerancia OCR para documentos escaneados.
 */
function esDocumentoRUT(lines: string[]): boolean {
  const PATRON_RUT = /REGISTRO\s*[UÚ0O]NICO\s*TRIBUTARIO|FORMULARIO\s*DEL\s*RUT|REG[I1]STRO.*TR[I1]BUTAR[I1]O/i;
  return lines.some(line => PATRON_RUT.test(line));
}

/**
 * Genera un ID de trazabilidad único.
 */
function generateTraceId(): string {
  return `ocr-local-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Retorna estructura RUTData vacía para casos de error.
 */
function getEmptyRUTData(): RUTData {
  return {
    header: {
      concepto: '',
      numeroFormulario: '',
      nit: '',
      dv: '',
      direccionSeccional: ''
    },
    identificacion: {
      tipoContribuyente: '',
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
      dv: null
    },
    ubicacion: {
      pais: '',
      departamento: '',
      ciudad: '',
      direccion: '',
      email: '',
      codigoPostal: null,
      telefono1: '',
      telefono2: null
    },
    clasificacion: {
      actividadPrincipal: '',
      fechaInicioActividadPrincipal: '',
      actividadSecundaria: null,
      fechaInicioActividadSecundaria: null,
      otraActividad1: null,
      otraActividad2: null,
      ocupacion: null,
    },
    responsabilidades: {
      codigos: []
    },
    representantesLegales: [],
    socios: [],
    revisorFiscalPrincipal: null,
    revisorFiscalSuplente: null,
    contador: null
  };
}