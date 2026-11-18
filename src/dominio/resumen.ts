/**
 * Cálculos del Resumen. Ver brief RES-1 a RES-8 y arquitectura 2.2.
 * Todo son funciones puras sobre la lista completa de gastos y pagos recurrentes.
 */
import type { Categoria, Gasto, PagoRecurrente } from './tipos';
import { diasDelMes, mesAnterior, mesDeFecha, nombreMes } from './fechas';
import { formatearMonto } from './montos';
import { ordenarGastos } from './gastos';

type Datos = { gastos: readonly Gasto[]; pagos: readonly PagoRecurrente[] };

const fechaDelDia = (mes: string, dia: number) => `${mes}-${String(dia).padStart(2, '0')}`;

export function gastosDelMes(gastos: readonly Gasto[], mes: string): Gasto[] {
  return gastos.filter((g) => mesDeFecha(g.fecha) === mes);
}

export function pagadosDelMes(pagos: readonly PagoRecurrente[], mes: string): PagoRecurrente[] {
  return pagos.filter((p) => p.mes === mes && p.pagado);
}

const suma = (montos: Array<number | null>) => montos.reduce<number>((t, m) => t + (m ?? 0), 0);

/** Un mes tiene datos si tiene un gasto o un recurrente pagado. */
export function tieneDatos({ gastos, pagos }: Datos, mes: string): boolean {
  return gastos.some((g) => mesDeFecha(g.fecha) === mes) || pagos.some((p) => p.mes === mes && p.pagado);
}

/** gastado(m) = recurrentes pagados + no recurrentes. */
export function gastado({ gastos, pagos }: Datos, mes: string): number {
  return suma(pagadosDelMes(pagos, mes).map((p) => p.monto)) + suma(gastosDelMes(gastos, mes).map((g) => g.monto));
}

/** Lo gastado en `mes` hasta el día `dia` inclusive, según fecha del gasto y fecha de pago. */
export function gastadoHasta({ gastos, pagos }: Datos, mes: string, dia: number): number {
  const tope = fechaDelDia(mes, dia);
  const noRecurrentes = gastosDelMes(gastos, mes).filter((g) => g.fecha <= tope);
  const recurrentes = pagadosDelMes(pagos, mes).filter((p) => p.fechaPago !== null && p.fechaPago <= tope);
  return suma(recurrentes.map((p) => p.monto)) + suma(noRecurrentes.map((g) => g.monto));
}

/**
 * Frase de comparación bajo el total (RES-2). null si el mes anterior no tiene datos.
 * Mes actual: hasta hoy contra el mes anterior hasta el mismo día.
 * Mes pasado: mes completo contra el anterior completo.
 */
export function fraseComparacion(datos: Datos, mes: string, hoy: string): string | null {
  const anterior = mesAnterior(mes);
  if (!tieneDatos(datos, anterior)) return null;
  const nombre = nombreMes(anterior);

  if (mes === mesDeFecha(hoy)) {
    const dia = Number(hoy.slice(8, 10));
    const diferencia = gastadoHasta(datos, mes, dia) - gastadoHasta(datos, anterior, Math.min(dia, diasDelMes(anterior)));
    if (diferencia === 0) return `Vas igual que ${nombre} a esta misma fecha.`;
    const lado = diferencia < 0 ? 'por debajo de' : 'por encima de';
    return `Vas ${formatearMonto(Math.abs(diferencia))} ${lado} ${nombre} a esta misma fecha.`;
  }

  const diferencia = gastado(datos, mes) - gastado(datos, anterior);
  if (diferencia === 0) return `Lo mismo que en ${nombre}.`;
  return `${formatearMonto(Math.abs(diferencia))} ${diferencia < 0 ? 'menos' : 'más'} que en ${nombre}.`;
}

/** "Llevas gastado en noviembre" en el mes actual; "Gastaste en octubre" en uno pasado. */
export function etiquetaTotal(mes: string, mesActual: string): string {
  return mes === mesActual ? `Llevas gastado en ${nombreMes(mes)}` : `Gastaste en ${nombreMes(mes)}`;
}

// ---------- Tarjetas (RES-3) ----------

export function textoGastosAnotados(cantidad: number): string {
  return cantidad === 1 ? '1 gasto anotado' : `${cantidad} gastos anotados`;
}

export function textoVerPendientes(cantidad: number): string {
  return cantidad === 1 ? 'Ver el gasto pendiente' : `Ver los ${cantidad} gastos pendientes`;
}

// ---------- ¿En qué se fue? (RES-4) ----------

export type FilaEnQueSeFue =
  | { tipo: 'recurrentes'; clave: string; total: number; proporcion: number; pagos: PagoRecurrente[] }
  | { tipo: 'categoria'; clave: string; total: number; proporcion: number; categoria: Categoria; gastos: Gasto[] };

/** Omit que se reparte sobre cada variante de la unión. */
type FilaSinProporcion = FilaEnQueSeFue extends infer F ? (F extends unknown ? Omit<F, 'proporcion'> : never) : never;

/**
 * Una fila para lo pagado en recurrentes y una por categoría con gasto mayor que cero,
 * de mayor a menor. A igual monto, recurrentes primero y luego el orden de las categorías.
 * La proporción es el largo de la barra respecto de la fila mayor.
 */
export function filasEnQueSeFue(
  datos: Datos,
  mes: string,
  categorias: readonly Categoria[],
): FilaEnQueSeFue[] {
  const filas: Array<FilaSinProporcion & { orden: number }> = [];

  const pagados = pagadosDelMes(datos.pagos, mes);
  const totalRecurrentes = suma(pagados.map((p) => p.monto));
  if (totalRecurrentes > 0) {
    filas.push({ tipo: 'recurrentes', clave: 'recurrentes', total: totalRecurrentes, pagos: pagados, orden: -1 });
  }

  const delMes = gastosDelMes(datos.gastos, mes);
  for (const categoria of categorias) {
    const suyos = delMes.filter((g) => g.categoriaId === categoria.id);
    const total = suma(suyos.map((g) => g.monto));
    if (total > 0) {
      filas.push({ tipo: 'categoria', clave: categoria.id, total, categoria, gastos: ordenarGastos(suyos), orden: categoria.orden });
    }
  }

  filas.sort((a, b) => b.total - a.total || a.orden - b.orden);
  const mayor = filas[0]?.total ?? 0;
  return filas.map(({ orden: _, ...fila }) => ({ ...fila, proporcion: mayor === 0 ? 0 : fila.total / mayor }) as FilaEnQueSeFue);
}

// ---------- Mes a mes (RES-6) ----------

export type FilaMesAMes = { mes: string; etiqueta: string; total: number; proporcion: number; esActual: boolean };

export const MESES_EN_MES_A_MES = 4;

/** El mes más antiguo con datos, o null. */
export function primerMesConDatos({ gastos, pagos }: Datos): string | null {
  let primero: string | null = null;
  for (const g of gastos) {
    const mes = mesDeFecha(g.fecha);
    if (primero === null || mes < primero) primero = mes;
  }
  for (const p of pagos) {
    if (p.pagado && (primero === null || p.mes < primero)) primero = p.mes;
  }
  return primero;
}

/**
 * Hasta cuatro meses con datos que terminan en el mes seleccionado, del más antiguo al más nuevo.
 * El mes en curso se rotula "Noviembre, hasta hoy".
 */
export function filasMesAMes(datos: Datos, mesSeleccionado: string, mesActual: string): FilaMesAMes[] {
  const primero = primerMesConDatos(datos);
  if (primero === null) return [];
  const meses: string[] = [];
  for (let mes = mesSeleccionado; mes >= primero && meses.length < MESES_EN_MES_A_MES; mes = mesAnterior(mes)) {
    if (tieneDatos(datos, mes)) meses.unshift(mes);
  }
  const totales = meses.map((mes) => gastado(datos, mes));
  const mayor = Math.max(0, ...totales);
  return meses.map((mes, i) => {
    const nombre = nombreMes(mes);
    const conMayuscula = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    const total = totales[i] ?? 0;
    return {
      mes,
      etiqueta: mes === mesActual ? `${conMayuscula}, hasta hoy` : conMayuscula,
      total,
      proporcion: mayor === 0 ? 0 : total / mayor,
      esActual: mes === mesActual,
    };
  });
}
