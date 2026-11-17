/**
 * Montos en pesos chilenos: siempre enteros, sin decimales.
 */

/** Agrega punto de miles a un entero no negativo: 1250000 -> "1.250.000". */
export function formatearMiles(valor: number): string {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new RangeError(`Monto inválido: ${valor}`);
  }
  return String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Formatea un monto para mostrarlo en pantalla: 12500 -> "$12.500". */
export function formatearMonto(valor: number): string {
  return `$${formatearMiles(valor)}`;
}
