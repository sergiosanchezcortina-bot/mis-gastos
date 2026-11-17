/**
 * Descarga el respaldo como archivo. Se arma dentro del navegador: no sale a internet.
 */
import { fechaHoraLocal } from '../dominio/fechas';
import { guardarAjustes, leerTodo, type BaseDeDatos } from '../datos/db';
import { crearRespaldo, nombreArchivoRespaldo, textoRespaldo } from './exportar';

/**
 * Baja el archivo y anota la fecha del último respaldo. La app no puede saber si Safari
 * terminó de guardarlo, así que la fecha se anota al hacer clic.
 * Devuelve la fecha y hora anotada.
 */
export async function descargarRespaldo(db: BaseDeDatos, ahora: Date = new Date()): Promise<string> {
  const exportadoEn = fechaHoraLocal(ahora);
  const datos = await leerTodo(db);
  const respaldo = crearRespaldo(datos, exportadoEn);

  const archivo = new Blob([textoRespaldo(respaldo)], { type: 'application/json' });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivoRespaldo(exportadoEn.slice(0, 10));
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  await guardarAjustes(db, respaldo.ajustes);
  return exportadoEn;
}
