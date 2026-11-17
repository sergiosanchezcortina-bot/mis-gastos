/**
 * Formato del archivo de respaldo. Ver docs/arquitectura.md, sección 2.3.
 */
import type { Ajustes, Categoria, Gasto, GastoRecurrente, PagoRecurrente } from '../dominio/tipos';

export const APP_RESPALDO = 'mis-gastos';

export type ArchivoRespaldo = {
  app: typeof APP_RESPALDO;
  versionEsquema: number;
  exportadoEn: string; // fecha y hora local, "2026-11-17T21:30:00"
  categorias: Categoria[];
  gastosRecurrentes: GastoRecurrente[];
  pagosRecurrentes: PagoRecurrente[];
  gastos: Gasto[];
  ajustes: Ajustes;
};
