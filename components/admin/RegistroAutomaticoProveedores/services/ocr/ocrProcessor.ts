import { createWorker } from 'tesseract.js';
import { loadPDF, renderPDFPageToImage } from './pdfTextExtractor';

/**
 * Ejecuta OCR sobre datos de imagen usando Tesseract.js con idioma español.
 * Crea un Web Worker para no bloquear la UI y lo limpia al terminar.
 */
export async function performOCR(
  imageData: ImageData,
  signal?: AbortSignal
): Promise<string> {
  if (signal?.aborted) {
    throw new DOMException('Operación cancelada', 'AbortError');
  }

  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo obtener el contexto 2D del canvas');
  }
  ctx.putImageData(imageData, 0, 0);

  const worker = await createWorker('spa');

  try {
    if (signal?.aborted) {
      throw new DOMException('Operación cancelada', 'AbortError');
    }

    const { data: { text } } = await worker.recognize(canvas);
    return text;
  } finally {
    await worker.terminate();
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Procesa todas las páginas de un PDF con OCR usando un solo worker.
 * Optimizado para rendimiento: carga el PDF una vez y reutiliza el worker.
 */
export async function performOCRForAllPages(
  file: File,
  signal?: AbortSignal,
  onProgress?: (mensaje: string) => void
): Promise<string[]> {
  // 1. Cargar PDF una sola vez
  const pdf = await loadPDF(file);
  const numPages = pdf.numPages;
  const lines: string[] = [];

  // 2. Crear un único worker de Tesseract
  const worker = await createWorker('spa');

  try {
    // 3. Procesar cada página reutilizando el worker
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (signal?.aborted) {
        throw new DOMException('Operación cancelada', 'AbortError');
      }

      const mensajeProgreso = `Procesando página ${pageNum} de ${numPages}...`;
      console.log(`📖 ${mensajeProgreso}`);
      
      // Notificar progreso si se proporcionó callback
      if (onProgress) {
        onProgress(mensajeProgreso);
      }

      // Renderizar página con scale 2.5 para mejor calidad
      const imageData = await renderPDFPageToImage(pdf, pageNum, 2.5);

      // Convertir imageData a canvas para Tesseract
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No se pudo obtener el contexto 2D del canvas');
      }
      ctx.putImageData(imageData, 0, 0);

      // Ejecutar OCR con el worker reutilizado
      const { data: { text } } = await worker.recognize(canvas);

      // Dividir en líneas y agregar
      const pageLines = text.split('\n').filter(line => line.trim().length > 0);
      lines.push(...pageLines);

      // Liberar memoria del canvas
      canvas.width = 0;
      canvas.height = 0;
    }

    return lines;
  } finally {
    // 4. Destruir el worker en bloque finally
    await worker.terminate();
  }
}
