/**
 * Pasar los archivos de los comprobantes a texto y de vuelta, para el respaldo.
 * Se hace por trozos para no pasarse del límite de argumentos con archivos grandes.
 */

const TROZO = 0x8000;

export function aBase64(datos: ArrayBuffer): string {
  const bytes = new Uint8Array(datos);
  let binario = '';
  for (let i = 0; i < bytes.length; i += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return btoa(binario);
}

/** Devuelve null si el texto no es base64 válido. */
export function desdeBase64(texto: string): ArrayBuffer | null {
  let binario: string;
  try {
    binario = atob(texto);
  } catch {
    return null;
  }
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}
