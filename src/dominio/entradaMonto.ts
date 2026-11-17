/**
 * Campo de monto: solo dígitos, máximo 8, con punto de miles mientras se escribe.
 */
import { formatearMiles } from './montos';

export const MAXIMO_DIGITOS = 8;

/**
 * Interpreta lo que quedó escrito en el campo.
 * Devuelve el monto nuevo, null si quedó vacío, o el valor anterior si el texto
 * no se acepta (más de 8 dígitos). Los caracteres que no son dígitos se ignoran.
 */
export function interpretarEntradaMonto(texto: string, anterior: number | null): number | null {
  const digitos = texto.replace(/\D/g, '');
  if (digitos === '') return null;
  const sinCeros = digitos.replace(/^0+(?=\d)/, '');
  if (sinCeros.length > MAXIMO_DIGITOS) return anterior;
  return Number(sinCeros);
}

/** Texto que se muestra en el campo: 12500 -> "12.500"; vacío -> "". */
export function textoEntradaMonto(valor: number | null): string {
  return valor === null ? '' : formatearMiles(valor);
}

/**
 * Dónde dejar el cursor después de reformatear: justo después de la misma
 * cantidad de dígitos que había antes del cursor.
 */
export function posicionCursor(textoFormateado: string, digitosAntesDelCursor: number): number {
  if (digitosAntesDelCursor <= 0) return 0;
  let vistos = 0;
  for (let i = 0; i < textoFormateado.length; i++) {
    if (/\d/.test(textoFormateado.charAt(i))) vistos++;
    if (vistos === digitosAntesDelCursor) return i + 1;
  }
  return textoFormateado.length;
}
