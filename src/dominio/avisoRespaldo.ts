/**
 * Cuándo mostrar en el Resumen el aviso "Hace más de un mes que no haces un respaldo." (RES-9).
 */
import type { Gasto, PagoRecurrente } from './tipos';
import { diasEntre } from './fechas';

export const DIAS_SIN_RESPALDO = 30;
export const TEXTO_AVISO_RESPALDO = 'Hace más de un mes que no haces un respaldo.';

/**
 * Se cuenta desde el último respaldo. Si nunca hubo uno, desde el dato más antiguo
 * anotado (gasto o pago recurrente), para no avisar el primer día de uso.
 */
export function necesitaRespaldo(
  ultimoRespaldo: string | null,
  datos: { gastos: readonly Gasto[]; pagos: readonly PagoRecurrente[] },
  hoy: string,
): boolean {
  let desde: string | null = ultimoRespaldo === null ? null : ultimoRespaldo.slice(0, 10);
  if (desde === null) {
    const fechas = [
      ...datos.gastos.map((g) => g.fecha),
      ...datos.pagos.flatMap((p) => (p.pagado && p.fechaPago ? [p.fechaPago] : [])),
    ].sort();
    desde = fechas[0] ?? null;
  }
  return desde !== null && diasEntre(desde, hoy) > DIAS_SIN_RESPALDO;
}
