import * as pdfjs from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const MIN_TEXT_ITEMS = 50;
const Y_TOLERANCE = 5; // Tolerancia en píxeles para considerar items en la misma línea

export interface PDFTextExtraction {
  lines: string[];
  textItemCount: number;
  isScanned: boolean;
}

/**
 * Extrae texto de un archivo PDF usando PDF.js.
 * Reconstruye líneas agrupando textItems por coordenada Y y ordenando por X.
 */
export async function extractTextFromPDF(
  file: File,
  signal?: AbortSignal
): Promise<PDFTextExtraction> {
  const arrayBuffer = await file.arrayBuffer();

  if (signal?.aborted) {
    throw new DOMException('Operación cancelada', 'AbortError');
  }

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const allLines: string[] = [];
  let totalTextItems = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    if (signal?.aborted) {
      throw new DOMException('Operación cancelada', 'AbortError');
    }

    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // Filtrar solo TextItems
    const textItems = content.items.filter((item): item is TextItem => 'str' in item);
    totalTextItems += textItems.length;

    // Agrupar items por línea (coordenada Y similar)
    const lineGroups = groupTextItemsByLine(textItems);

    // Convertir cada grupo en una línea de texto
    const pageLines = lineGroups.map(group => 
      group
        .sort((a, b) => a.transform[4] - b.transform[4]) // Ordenar por X
        .map(item => item.str)
        .join(' ')
        .trim()
    ).filter(line => line.length > 0);

    allLines.push(...pageLines);
  }

  const isScanned = totalTextItems < MIN_TEXT_ITEMS;

  return { 
    lines: allLines, 
    textItemCount: totalTextItems, 
    isScanned 
  };
}

/**
 * Agrupa textItems por línea basándose en coordenada Y con tolerancia.
 */
function groupTextItemsByLine(textItems: TextItem[]): TextItem[][] {
  if (textItems.length === 0) return [];

  // Ordenar por Y primero
  const sortedByY = [...textItems].sort((a, b) => b.transform[5] - a.transform[5]);

  const lineGroups: TextItem[][] = [];
  let currentLine: TextItem[] = [sortedByY[0]];
  let currentY = sortedByY[0].transform[5];

  for (let i = 1; i < sortedByY.length; i++) {
    const item = sortedByY[i];
    const itemY = item.transform[5];

    // Si está en la misma línea (Y similar)
    if (Math.abs(itemY - currentY) <= Y_TOLERANCE) {
      currentLine.push(item);
    } else {
      // Nueva línea
      lineGroups.push(currentLine);
      currentLine = [item];
      currentY = itemY;
    }
  }

  // Agregar última línea
  if (currentLine.length > 0) {
    lineGroups.push(currentLine);
  }

  return lineGroups;
}

/**
 * Renderiza una página de PDF a un canvas y retorna los datos de imagen.
 * Usa scale 2.5 para mejor calidad en OCR.
 */
export async function renderPDFPageToImage(
  pdf: pdfjs.PDFDocumentProxy,
  pageNum: number,
  scale = 2.5
): Promise<ImageData> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo obtener el contexto 2D del canvas');
  }

  await page.render({ canvasContext: context, viewport, canvas }).promise;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  // Liberar memoria del canvas
  canvas.width = 0;
  canvas.height = 0;

  return imageData;
}

/**
 * Carga un PDF y retorna el documento.
 * Usar esta función para cargar el PDF una sola vez.
 */
export async function loadPDF(file: File): Promise<pdfjs.PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  return pdf;
}
