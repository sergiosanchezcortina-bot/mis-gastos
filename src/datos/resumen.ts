/**
 * Lectura de todo lo que necesita el Resumen.
 */
import type { Ajustes, Categoria, Gasto, GastoRecurrente, PagoRecurrente } from '../dominio/tipos';
import { leerTodo, type BaseDeDatos } from './db';
import { leerMesRecurrentes } from './recurrentes';

export type DatosResumen = {
  gastos: Gasto[];
  pagos: PagoRecurrente[];
  categorias: Categoria[];
  gastosRecurrentes: GastoRecurrente[];
  ajustes: Ajustes;
};

/**
 * Antes de leer crea las filas de recurrentes que falten en el mes, para que
 * "Te falta pagar" esté bien aunque no se haya entrado a esa pestaña.
 */
export async function leerDatosResumen(db: BaseDeDatos, mes: string, mesActual: string): Promise<DatosResumen> {
  await leerMesRecurrentes(db, mes, mesActual);
  const todo = await leerTodo(db);
  return {
    gastos: todo.gastos,
    pagos: todo.pagosRecurrentes,
    categorias: [...todo.categorias].sort((a, b) => a.orden - b.orden),
    gastosRecurrentes: todo.gastosRecurrentes,
    ajustes: todo.ajustes,
  };
}
