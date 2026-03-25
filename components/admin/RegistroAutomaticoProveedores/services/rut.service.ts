import { APiMethod, requestAPIAxios } from "../../../../../Provider";
import { OCRServiceResponse } from "../model";

/**
 * Analiza un archivo PDF del RUT usando OCR
 * @param file Archivo PDF del RUT
 * @param idConstructora ID de la constructora
 * @param signal Señal para cancelar la petición
 * @returns Promesa con los datos extraídos del RUT
 */
export async function analizarRutPDF(
  file: File,
  idConstructora: number,
  signal?: AbortSignal
): Promise<OCRServiceResponse | null> {
  // Crear FormData para enviar el archivo
  const formData = new FormData();
  formData.append('file', file);

  const response = await requestAPIAxios<OCRServiceResponse>({
    metodo: `rut/analize?constructora=${idConstructora}`,
    type: APiMethod.POST,
    AllowAnonymous: false,
    data: formData,
    isformData: true,
    signal
  });

  return response ?? null;
}
