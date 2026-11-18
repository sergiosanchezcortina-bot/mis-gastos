/**
 * Lectura y escritura de comprobantes de gastos recurrentes (fase 7).
 * El archivo queda en IndexedDB, en este computador. Nunca sale de ahí.
 */
import type { Comprobante } from '../dominio/tipos';
import type { BaseDeDatos } from './db';

/** Los comprobantes de una lista de pagos, por id de pago. */
export async function leerComprobantes(db: BaseDeDatos, pagoIds: readonly string[]): Promise<Map<string, Comprobante>> {
  const tx = db.transaction('comprobantes', 'readonly');
  const encontrados = await Promise.all(pagoIds.map((id) => tx.store.get(id)));
  await tx.done;
  const mapa = new Map<string, Comprobante>();
  for (const c of encontrados) if (c) mapa.set(c.pagoId, c);
  return mapa;
}

/** Arma un comprobante desde el archivo que eligió la persona. */
export async function comprobanteDesdeArchivo(pagoId: string, archivo: File, ahora: string): Promise<Comprobante> {
  return {
    pagoId,
    nombre: archivo.name,
    tipo: archivo.type,
    tamano: archivo.size,
    datos: await archivo.arrayBuffer(),
    agregadoEn: ahora,
  };
}

/** Crea o reemplaza. También sirve para "Deshacer". */
export async function guardarComprobante(db: BaseDeDatos, comprobante: Comprobante): Promise<void> {
  await db.put('comprobantes', comprobante);
}

export async function quitarComprobante(db: BaseDeDatos, pagoId: string): Promise<void> {
  await db.delete('comprobantes', pagoId);
}
