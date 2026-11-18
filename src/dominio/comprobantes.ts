/**
 * Reglas del comprobante de un gasto recurrente (fase 7, REC-12).
 */

/** 10 MB. Un pantallazo o un PDF de boleta pesan mucho menos. */
export const TAMANO_MAXIMO = 10 * 1024 * 1024;

export const MENSAJES_COMPROBANTE = {
  muyGrande: 'Ese archivo pesa más de 10 MB. Elige uno más liviano.',
  vacio: 'Ese archivo está vacío. Elige otro.',
} as const;

export function validarArchivo(tamano: number): string | null {
  if (tamano === 0) return MENSAJES_COMPROBANTE.vacio;
  if (tamano > TAMANO_MAXIMO) return MENSAJES_COMPROBANTE.muyGrande;
  return null;
}

export type Vista = 'imagen' | 'pdf' | 'otro';

const EXTENSIONES_IMAGEN = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif'];

/** Cómo se muestra en la ventana. Usa el tipo y, si viene vacío, la extensión. */
export function vistaDe(tipo: string, nombre: string): Vista {
  const extension = nombre.includes('.') ? nombre.split('.').pop()!.toLowerCase() : '';
  if (tipo === 'application/pdf' || (tipo === '' && extension === 'pdf')) return 'pdf';
  if (tipo.startsWith('image/') || (tipo === '' && EXTENSIONES_IMAGEN.includes(extension))) return 'imagen';
  return 'otro';
}

/** "1,2 MB" o "350 KB", para mostrar junto al nombre. */
export function textoTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
