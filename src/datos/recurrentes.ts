/**
 * Lectura y escritura de gastos recurrentes. Las reglas viven en dominio/recurrentes.ts.
 */
import type { Comprobante, GastoRecurrente, PagoRecurrente } from '../dominio/tipos';
import { compararPorVencimiento, filasQueFaltan, planQuitar } from '../dominio/recurrentes';
import type { BaseDeDatos } from './db';

export type FilaRecurrente = { gasto: GastoRecurrente; pago: PagoRecurrente };

/**
 * Las filas de un mes, en orden de vencimiento. Antes crea, en la misma transacción,
 * las filas que faltan con el último monto conocido (arquitectura 2.2).
 */
export async function leerMesRecurrentes(
  db: BaseDeDatos,
  mes: string,
  mesActual: string,
): Promise<FilaRecurrente[]> {
  const tx = db.transaction(['gastosRecurrentes', 'pagosRecurrentes'], 'readwrite');
  const gastos = await tx.objectStore('gastosRecurrentes').getAll();
  const pagos = await tx.objectStore('pagosRecurrentes').getAll();
  const nuevas = filasQueFaltan(gastos, pagos, mes, mesActual);
  for (const fila of nuevas) void tx.objectStore('pagosRecurrentes').put(fila);
  await tx.done;

  const porId = new Map(gastos.map((g) => [g.id, g]));
  const filas: FilaRecurrente[] = [];
  for (const pago of [...pagos.filter((p) => p.mes === mes), ...nuevas]) {
    const gasto = porId.get(pago.gastoRecurrenteId);
    if (gasto) filas.push({ gasto, pago });
  }
  return filas.sort((a, b) => compararPorVencimiento(a.gasto, b.gasto));
}

export async function guardarPago(db: BaseDeDatos, pago: PagoRecurrente): Promise<void> {
  await db.put('pagosRecurrentes', pago);
}

/** Crea el gasto desde el mes seleccionado, con su fila de ese mes (REC-8). */
export async function agregarRecurrente(
  db: BaseDeDatos,
  datos: { nombre: string; diaVencimiento: number | null; monto: number | null },
  mes: string,
): Promise<FilaRecurrente> {
  const gasto: GastoRecurrente = {
    id: crypto.randomUUID(),
    nombre: datos.nombre,
    diaVencimiento: datos.diaVencimiento,
    desde: mes,
    hasta: null,
    palabrasClave: [],
    creadoEn: new Date().toISOString(),
  };
  const pago: PagoRecurrente = {
    id: crypto.randomUUID(),
    gastoRecurrenteId: gasto.id,
    mes,
    monto: datos.monto,
    pagado: false,
    fechaPago: null,
    origen: 'manual',
    movimientoId: null,
  };
  const tx = db.transaction(['gastosRecurrentes', 'pagosRecurrentes'], 'readwrite');
  void tx.objectStore('gastosRecurrentes').put(gasto);
  void tx.objectStore('pagosRecurrentes').put(pago);
  await tx.done;
  return { gasto, pago };
}

/** Cambia nombre o día. Vale para todos los meses, porque cambia la plantilla. */
export async function editarRecurrente(
  db: BaseDeDatos,
  gasto: GastoRecurrente,
  cambios: { nombre: string; diaVencimiento: number | null },
): Promise<GastoRecurrente> {
  const editado = { ...gasto, ...cambios };
  await db.put('gastosRecurrentes', editado);
  return editado;
}

/** Lo necesario para deshacer un "Quitar". */
export type DeshacerQuitar = {
  gastoAnterior: GastoRecurrente;
  pagosBorrados: PagoRecurrente[];
  comprobantesBorrados: Comprobante[];
};

/** Quita el gasto desde `mes` (REC-9). Devuelve lo necesario para deshacerlo. */
export async function quitarRecurrente(db: BaseDeDatos, gastoId: string, mes: string): Promise<DeshacerQuitar> {
  const tx = db.transaction(['gastosRecurrentes', 'pagosRecurrentes', 'comprobantes'], 'readwrite');
  const gastoAnterior = await tx.objectStore('gastosRecurrentes').get(gastoId);
  if (!gastoAnterior) throw new Error(`No existe el gasto recurrente ${gastoId}`);
  const pagos = await tx.objectStore('pagosRecurrentes').index('porGastoRecurrente').getAll(gastoId);
  const { hasta, idsABorrar } = planQuitar(pagos, mes);
  void tx.objectStore('gastosRecurrentes').put({ ...gastoAnterior, hasta });
  // Los comprobantes de las filas borradas se van con ellas, y vuelven con "Deshacer".
  const comprobantesBorrados: Comprobante[] = [];
  for (const id of idsABorrar) {
    const comprobante = await tx.objectStore('comprobantes').get(id);
    if (comprobante) comprobantesBorrados.push(comprobante);
  }
  for (const id of idsABorrar) {
    void tx.objectStore('pagosRecurrentes').delete(id);
    void tx.objectStore('comprobantes').delete(id);
  }
  await tx.done;
  return { gastoAnterior, pagosBorrados: pagos.filter((p) => idsABorrar.includes(p.id)), comprobantesBorrados };
}

/** Deja el gasto y sus filas tal como estaban antes de quitarlo. */
export async function deshacerQuitar(db: BaseDeDatos, deshacer: DeshacerQuitar): Promise<void> {
  const tx = db.transaction(['gastosRecurrentes', 'pagosRecurrentes', 'comprobantes'], 'readwrite');
  void tx.objectStore('gastosRecurrentes').put(deshacer.gastoAnterior);
  for (const pago of deshacer.pagosBorrados) void tx.objectStore('pagosRecurrentes').put(pago);
  for (const comprobante of deshacer.comprobantesBorrados) void tx.objectStore('comprobantes').put(comprobante);
  await tx.done;
}
