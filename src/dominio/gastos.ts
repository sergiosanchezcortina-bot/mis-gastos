/**
 * Reglas de los gastos no recurrentes. Ver brief NOR-1 a NOR-10.
 */
import type { Gasto } from './tipos';
import { diaAnterior, esFechaValida, nombreDiaSemana, partesFecha } from './fechas';
import { formatearMonto } from './montos';

/** Del más reciente al más antiguo. A igual fecha, el último anotado va primero. */
export function ordenarGastos(gastos: readonly Gasto[]): Gasto[] {
  return [...gastos].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    if (a.creadoEn !== b.creadoEn) return a.creadoEn < b.creadoEn ? 1 : -1;
    return 0;
  });
}

export function totalGastos(gastos: readonly Gasto[]): number {
  return gastos.reduce((suma, g) => suma + g.monto, 0);
}

export function textoCantidadGastos(cantidad: number): string {
  return cantidad === 1 ? '1 gasto' : `${cantidad} gastos`;
}

/** Encabezado de la tabla: "14 gastos, $277.500 en total". */
export function textoResumenGastos(gastos: readonly Gasto[]): string {
  return `${textoCantidadGastos(gastos.length)}, ${formatearMonto(totalGastos(gastos))} en total`;
}

/** Cuántas filas se muestran antes de "Ver los N gastos del mes" (NOR-7). */
export const FILAS_VISIBLES = 10;

export function textoVerTodos(cantidad: number): string {
  return `Ver los ${cantidad} gastos del mes`;
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Hoy, lunes 16", "Ayer, domingo 15" o "Sábado 14" (NOR-6). */
export function textoFechaGasto(fecha: string, hoy: string): string {
  const diaYNumero = `${nombreDiaSemana(fecha)} ${partesFecha(fecha).dia}`;
  if (fecha === hoy) return `Hoy, ${diaYNumero}`;
  if (fecha === diaAnterior(hoy)) return `Ayer, ${diaYNumero}`;
  return conMayuscula(diaYNumero);
}

// ---------- "¿Cuándo fue?" ----------

export type OpcionDia = 'hoy' | 'ayer' | 'otro';

/** La fecha que corresponde a la opción elegida. "Otro día" usa la fecha del selector. */
export function fechaDeOpcion(opcion: OpcionDia, hoy: string, otraFecha: string): string {
  if (opcion === 'hoy') return hoy;
  if (opcion === 'ayer') return diaAnterior(hoy);
  return otraFecha;
}

/** Qué botón va marcado al corregir un gasto. */
export function opcionDeFecha(fecha: string, hoy: string): OpcionDia {
  if (fecha === hoy) return 'hoy';
  if (fecha === diaAnterior(hoy)) return 'ayer';
  return 'otro';
}

// ---------- Validación (NOR-3) ----------

export type ErroresGasto = { monto?: string; fecha?: string; categoria?: string };

export const MENSAJES = {
  monto: 'Escribe cuánto gastaste',
  categoria: 'Elige en qué fue',
  fechaVacia: 'Elige qué día fue',
  fechaFutura: 'Elige un día que no sea futuro',
} as const;

export function validarGasto(datos: {
  monto: number | null;
  fecha: string;
  categoriaId: string | null;
  hoy: string;
}): ErroresGasto {
  const errores: ErroresGasto = {};
  if (datos.monto === null || datos.monto <= 0) errores.monto = MENSAJES.monto;
  if (!esFechaValida(datos.fecha)) errores.fecha = MENSAJES.fechaVacia;
  else if (datos.fecha > datos.hoy) errores.fecha = MENSAJES.fechaFutura;
  if (datos.categoriaId === null) errores.categoria = MENSAJES.categoria;
  return errores;
}

// ---------- Eliminar (NOR-9) ----------

/** "¿Eliminar el gasto de $23.500 en Supermercado del sábado 14?" */
export function textoConfirmarEliminar(gasto: Pick<Gasto, 'monto' | 'fecha'>, categoria: string, hoy: string): string {
  let cuando: string;
  if (gasto.fecha === hoy) cuando = 'de hoy';
  else if (gasto.fecha === diaAnterior(hoy)) cuando = 'de ayer';
  else cuando = `del ${nombreDiaSemana(gasto.fecha)} ${partesFecha(gasto.fecha).dia}`;
  return `¿Eliminar el gasto de ${formatearMonto(gasto.monto)} en ${categoria} ${cuando}?`;
}
