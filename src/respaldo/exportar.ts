/**
 * Armar el archivo de respaldo con todos los datos.
 */
import type { DatosCompletos } from '../dominio/tipos';
import { VERSION_ESQUEMA } from '../datos/db';
import { APP_RESPALDO, type ArchivoRespaldo } from './formato';

/** `exportadoEn` es fecha y hora local: "2026-11-17T21:30:00". */
export function crearRespaldo(datos: DatosCompletos, exportadoEn: string): ArchivoRespaldo {
  return {
    app: APP_RESPALDO,
    versionEsquema: VERSION_ESQUEMA,
    exportadoEn,
    categorias: datos.categorias,
    gastosRecurrentes: datos.gastosRecurrentes,
    pagosRecurrentes: datos.pagosRecurrentes,
    gastos: datos.gastos,
    ajustes: { ...datos.ajustes, ultimoRespaldo: exportadoEn },
  };
}

/** "mis-gastos-respaldo-2026-11-17.json" (AJU-A4). */
export function nombreArchivoRespaldo(hoy: string): string {
  return `mis-gastos-respaldo-${hoy}.json`;
}

/** Texto del archivo, con sangría para que se pueda leer si alguien lo abre. */
export function textoRespaldo(respaldo: ArchivoRespaldo): string {
  return `${JSON.stringify(respaldo, null, 2)}\n`;
}
