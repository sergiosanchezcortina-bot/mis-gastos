/**
 * Reglas de los gastos recurrentes. Ver docs/arquitectura.md, sección 2.2,
 * y brief REC-1 a REC-11. Todo son funciones puras.
 */
import type { GastoRecurrente, PagoRecurrente } from './tipos';
import { diasDelMes, mesAnterior, mesDeFecha } from './fechas';

/** Un gasto aplica en un mes si desde <= mes y (hasta vacío o hasta >= mes). */
export function vigenteEn(gasto: GastoRecurrente, mes: string): boolean {
  return gasto.desde <= mes && (gasto.hasta === null || gasto.hasta >= mes);
}

/** Día en que vence en ese mes. Si el día no existe en el mes, vence el último día (REC-A11). */
export function diaVencimientoEn(dia: number | null, mes: string): number | null {
  if (dia === null) return null;
  return Math.min(dia, diasDelMes(mes));
}

/** El monto no vacío más reciente de ese gasto en meses anteriores a `mes`. */
export function ultimoMontoConocido(
  gastoRecurrenteId: string,
  pagos: readonly PagoRecurrente[],
  mes: string,
): number | null {
  let mejor: PagoRecurrente | null = null;
  for (const p of pagos) {
    if (p.gastoRecurrenteId !== gastoRecurrenteId || p.mes >= mes || p.monto === null) continue;
    if (mejor === null || p.mes > mejor.mes) mejor = p;
  }
  return mejor?.monto ?? null;
}

/**
 * Filas que hay que crear para ver un mes: una por cada gasto vigente que aún no la tiene.
 * Nunca se crean filas para meses futuros.
 */
export function filasQueFaltan(
  gastos: readonly GastoRecurrente[],
  pagos: readonly PagoRecurrente[],
  mes: string,
  mesActual: string,
  crearId: () => string = () => crypto.randomUUID(),
): PagoRecurrente[] {
  if (mes > mesActual) return [];
  const conFila = new Set(pagos.filter((p) => p.mes === mes).map((p) => p.gastoRecurrenteId));
  return gastos
    .filter((g) => vigenteEn(g, mes) && !conFila.has(g.id))
    .map((g) => ({
      id: crearId(),
      gastoRecurrenteId: g.id,
      mes,
      monto: ultimoMontoConocido(g.id, pagos, mes),
      pagado: false,
      fechaPago: null,
      origen: 'manual',
      movimientoId: null,
    }));
}

// ---------- Estado de cada fila (REC-6) ----------

export type EstadoFila =
  | { tipo: 'faltaMonto' }
  | { tipo: 'pagado' }
  | { tipo: 'vence'; dia: number }
  | { tipo: 'vencio'; dia: number }
  | { tipo: 'porPagar' };

/**
 * "Falta el monto" gana a todo, incluso si está pagado: cuenta como $0 y eso se tiene que notar.
 * Una fila está vencida si no está pagada y hoy es posterior al vencimiento, o si el mes ya terminó.
 */
export function estadoFila(pago: PagoRecurrente, diaVencimiento: number | null, hoy: string): EstadoFila {
  if (pago.monto === null) return { tipo: 'faltaMonto' };
  if (pago.pagado) return { tipo: 'pagado' };
  const dia = diaVencimientoEn(diaVencimiento, pago.mes);
  if (dia === null) return { tipo: 'porPagar' };
  const mesHoy = mesDeFecha(hoy);
  const diaHoy = Number(hoy.slice(8, 10));
  const vencido = pago.mes < mesHoy || (pago.mes === mesHoy && diaHoy > dia);
  return vencido ? { tipo: 'vencio', dia } : { tipo: 'vence', dia };
}

export function textoEstado(estado: EstadoFila): string {
  switch (estado.tipo) {
    case 'faltaMonto':
      return 'Falta el monto';
    case 'pagado':
      return 'Pagado';
    case 'vence':
      return `Vence el ${estado.dia}`;
    case 'vencio':
      return `Venció el ${estado.dia}`;
    case 'porPagar':
      return 'Por pagar';
  }
}

export function esAlerta(estado: EstadoFila): boolean {
  return estado.tipo === 'faltaMonto' || estado.tipo === 'vencio';
}

// ---------- Orden (REC-3) ----------

/** Por día de vencimiento y, a igual día, por nombre. Los que no tienen día van al final. */
export function compararPorVencimiento(
  a: Pick<GastoRecurrente, 'nombre' | 'diaVencimiento'>,
  b: Pick<GastoRecurrente, 'nombre' | 'diaVencimiento'>,
): number {
  if (a.diaVencimiento !== b.diaVencimiento) {
    if (a.diaVencimiento === null) return 1;
    if (b.diaVencimiento === null) return -1;
    return a.diaVencimiento - b.diaVencimiento;
  }
  return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
}

// ---------- Totales (REC-1) ----------

export type TotalesRecurrentes = {
  total: number;
  pagado: number;
  porPagar: number;
  cantidad: number;
  pagados: number;
  pendientes: number;
};

/** Un monto vacío cuenta como 0. */
export function totalesRecurrentes(pagos: readonly PagoRecurrente[]): TotalesRecurrentes {
  let total = 0;
  let pagado = 0;
  let pagados = 0;
  for (const p of pagos) {
    const monto = p.monto ?? 0;
    total += monto;
    if (p.pagado) {
      pagado += monto;
      pagados++;
    }
  }
  return { total, pagado, porPagar: total - pagado, cantidad: pagos.length, pagados, pendientes: pagos.length - pagados };
}

export function textoCantidadRecurrentes(cantidad: number): string {
  return cantidad === 1 ? '1 gasto recurrente' : `${cantidad} gastos recurrentes`;
}

export function textoPagados(pagados: number, cantidad: number): string {
  return `${pagados} de ${cantidad} pagados`;
}

export function textoPendientes(pendientes: number): string {
  if (pendientes === 0) return 'Todo pagado';
  return pendientes === 1 ? 'Falta 1' : `Faltan ${pendientes}`;
}

/** Proporción de pagados para la barra de avance, de 0 a 1. */
export function avancePagados(pagados: number, cantidad: number): number {
  return cantidad === 0 ? 0 : pagados / cantidad;
}

// ---------- Marcar como pagado ----------

/** En el mes actual la fecha de pago es hoy; en un mes pasado, el último día de ese mes. */
export function fechaPagoAlMarcar(mes: string, hoy: string): string {
  if (mes === mesDeFecha(hoy)) return hoy;
  return `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}`;
}

export function marcarPagado(pago: PagoRecurrente, pagado: boolean, hoy: string): PagoRecurrente {
  return { ...pago, pagado, fechaPago: pagado ? fechaPagoAlMarcar(pago.mes, hoy) : null };
}

// ---------- Quitar (REC-9) ----------

/**
 * Qué pasa al quitar un gasto en el mes `mes`:
 * - `hasta` queda en el último mes pagado desde `mes` en adelante, para no perder
 *   plata ya anotada. Si no hay ninguno pagado, queda en el mes anterior a `mes`.
 * - Se borran las filas posteriores a `hasta` (ninguna de ellas está pagada).
 */
export function planQuitar(
  pagosDelGasto: readonly PagoRecurrente[],
  mes: string,
): { hasta: string; idsABorrar: string[] } {
  let hasta = mesAnterior(mes);
  for (const p of pagosDelGasto) {
    if (p.mes >= mes && p.pagado && p.mes > hasta) hasta = p.mes;
  }
  return {
    hasta,
    idsABorrar: pagosDelGasto.filter((p) => p.mes > hasta).map((p) => p.id),
  };
}

// ---------- Formulario (REC-8) ----------

export type DatosFormulario = { nombre: string; dia: string };
export type ErroresFormulario = { nombre?: string; dia?: string };

export function validarFormulario(datos: DatosFormulario): {
  errores: ErroresFormulario;
  nombre: string;
  dia: number | null;
} {
  const errores: ErroresFormulario = {};
  const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
  if (nombre === '') errores.nombre = 'Escribe un nombre';
  const textoDia = datos.dia.trim();
  let dia: number | null = null;
  if (textoDia !== '') {
    dia = /^\d{1,2}$/.test(textoDia) ? Number(textoDia) : Number.NaN;
    if (!(dia >= 1 && dia <= 31)) {
      errores.dia = 'Escribe un día del 1 al 31';
      dia = null;
    }
  }
  return { errores, nombre, dia };
}
