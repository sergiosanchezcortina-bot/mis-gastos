/**
 * Reglas de los gastos no recurrentes. Ver brief NOR-1 a NOR-10.
 */
import type { Gasto } from './tipos';
import { diaAnterior, diaSiguiente, esFechaValida, mesDeFecha, nombreDiaSemana, partesFecha, ultimaFechaDelMes } from './fechas';
import { fechaPagoAlMarcar } from './recurrentes';
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

/**
 * Encabezado de la tabla: "14 gastos, $277.500 en total". Los por hacer no suman
 * y van aparte: "14 gastos, $277.500 en total · 2 por hacer, $45.000" (NOR-11).
 */
export function textoResumenGastos(gastos: readonly Gasto[]): string {
  const hechos = gastos.filter((g) => !g.porHacer);
  const porHacer = gastos.filter((g) => g.porHacer);
  const base = `${textoCantidadGastos(hechos.length)}, ${formatearMonto(totalGastos(hechos))} en total`;
  return porHacer.length === 0 ? base : `${base} · ${porHacer.length} por hacer, ${formatearMonto(totalGastos(porHacer))}`;
}

// ---------- Gastos por hacer (NOR-11) ----------

/** Un gasto por hacer cuya fecha ya pasó. */
export function porHacerVencido(gasto: Pick<Gasto, 'porHacer' | 'fecha'>, hoy: string): boolean {
  return gasto.porHacer && gasto.fecha < hoy;
}

/** "Por hacer hoy", "Por hacer mañana", "Por hacer el sábado 28" o "¿Lo hiciste? Era el sábado 14". */
export function textoPorHacer(fecha: string, hoy: string): string {
  const diaYNumero = `${nombreDiaSemana(fecha)} ${partesFecha(fecha).dia}`;
  if (fecha < hoy) return `¿Lo hiciste? Era el ${diaYNumero}`;
  if (fecha === hoy) return 'Por hacer hoy';
  if (fecha === diaSiguiente(hoy)) return 'Por hacer mañana';
  return `Por hacer el ${diaYNumero}`;
}

/** Al marcar "Ya lo hice": hoy, o el último día de su mes si ese mes ya pasó. */
export function fechaAlHacer(fecha: string, hoy: string): string {
  return fechaPagoAlMarcar(mesDeFecha(fecha), hoy);
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

export type OpcionDia = 'hoy' | 'ayer' | 'manana' | 'otro';

/** La fecha que corresponde a la opción elegida. "Otro día" usa la fecha del selector. */
export function fechaDeOpcion(opcion: OpcionDia, hoy: string, otraFecha: string): string {
  if (opcion === 'hoy') return hoy;
  if (opcion === 'ayer') return diaAnterior(hoy);
  if (opcion === 'manana') return diaSiguiente(hoy);
  return otraFecha;
}

/** Qué botón va marcado al corregir un gasto. Un gasto por hacer usa "Mañana" en vez de "Ayer". */
export function opcionDeFecha(fecha: string, hoy: string, porHacer = false): OpcionDia {
  if (fecha === hoy) return 'hoy';
  if (!porHacer && fecha === diaAnterior(hoy)) return 'ayer';
  if (porHacer && fecha === diaSiguiente(hoy) && mesDeFecha(fecha) === mesDeFecha(hoy)) return 'manana';
  return 'otro';
}

/** Hasta qué día se puede elegir: hoy para lo hecho; fin del mes actual para lo por hacer. */
export function fechaMaxima(hoy: string, porHacer: boolean): string {
  return porHacer ? ultimaFechaDelMes(mesDeFecha(hoy)) : hoy;
}

// ---------- Validación (NOR-3) ----------

export type ErroresGasto = { monto?: string; fecha?: string; categoria?: string };

export const MENSAJES = {
  monto: 'Escribe cuánto gastaste',
  categoria: 'Elige en qué fue',
  fechaVacia: 'Elige qué día fue',
  fechaFutura: 'Elige un día que no sea futuro',
  fechaFueraDelMes: 'Elige un día de este mes',
} as const;

// ---------- Descripción (fase 7) ----------

export const LARGO_DESCRIPCION = 60;

/** Quita espacios sobrantes. Un texto vacío queda como "sin descripción". */
export function normalizarDescripcion(texto: string): string | null {
  const limpio = texto.trim().replace(/\s+/g, ' ').slice(0, LARGO_DESCRIPCION);
  return limpio === '' ? null : limpio;
}

export function validarGasto(datos: {
  monto: number | null;
  fecha: string;
  categoriaId: string | null;
  hoy: string;
  porHacer?: boolean;
}): ErroresGasto {
  const errores: ErroresGasto = {};
  const porHacer = datos.porHacer ?? false;
  if (datos.monto === null || datos.monto <= 0) errores.monto = MENSAJES.monto;
  if (!esFechaValida(datos.fecha)) errores.fecha = MENSAJES.fechaVacia;
  else if (datos.fecha > fechaMaxima(datos.hoy, porHacer)) errores.fecha = porHacer ? MENSAJES.fechaFueraDelMes : MENSAJES.fechaFutura;
  if (datos.categoriaId === null) errores.categoria = MENSAJES.categoria;
  return errores;
}

// ---------- Eliminar (NOR-9) ----------

/** "¿Eliminar el gasto de $23.500 en Supermercado del sábado 14?" */
export function textoConfirmarEliminar(gasto: Pick<Gasto, 'monto' | 'fecha'> & { porHacer?: boolean }, categoria: string, hoy: string): string {
  let cuando: string;
  if (gasto.fecha === hoy) cuando = 'de hoy';
  else if (gasto.fecha === diaAnterior(hoy)) cuando = 'de ayer';
  else cuando = `del ${nombreDiaSemana(gasto.fecha)} ${partesFecha(gasto.fecha).dia}`;
  const cual = gasto.porHacer ? 'el gasto por hacer' : 'el gasto';
  return `¿Eliminar ${cual} de ${formatearMonto(gasto.monto)} en ${categoria} ${cuando}?`;
}
