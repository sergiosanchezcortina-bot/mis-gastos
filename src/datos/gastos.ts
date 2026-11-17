/**
 * Lectura y escritura de gastos no recurrentes.
 */
import type { Gasto } from '../dominio/tipos';
import { ordenarGastos } from '../dominio/gastos';
import type { BaseDeDatos } from './db';

/** Los gastos de un mes, del más reciente al más antiguo. Usa el índice por fecha. */
export async function leerGastosDelMes(db: BaseDeDatos, mes: string): Promise<Gasto[]> {
  const rango = IDBKeyRange.bound(`${mes}-01`, `${mes}-31`);
  return ordenarGastos(await db.getAllFromIndex('gastos', 'porFecha', rango));
}

/** Crea o reemplaza un gasto. También sirve para "Deshacer" una eliminación. */
export { guardarGasto } from './db';

export async function eliminarGasto(db: BaseDeDatos, id: string): Promise<void> {
  await db.delete('gastos', id);
}

/** Arma un gasto nuevo anotado a mano. */
export function nuevoGasto(datos: { monto: number; fecha: string; categoriaId: string }, ahora: string): Gasto {
  return {
    id: crypto.randomUUID(),
    ...datos,
    origen: 'manual',
    glosa: null,
    movimientoId: null,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
}
