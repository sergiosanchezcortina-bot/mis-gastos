/**
 * Leer un archivo de respaldo. Se revisa completo antes de tocar ningún dato (AJU-A6):
 * si cualquier parte no tiene la forma esperada, se rechaza entero.
 */
import type {
  Ajustes,
  Categoria,
  ClaveIcono,
  DatosCompletos,
  Gasto,
  GastoRecurrente,
  PagoRecurrente,
} from '../dominio/tipos';
import { esFechaValida, partesMes } from '../dominio/fechas';
import { VERSION_ESQUEMA } from '../datos/db';
import { APP_RESPALDO } from './formato';

export const MENSAJES_RESPALDO = {
  noEsRespaldo: 'Este archivo no es un respaldo de Mis gastos.',
  versionNueva: 'Este respaldo es de una versión más nueva de Mis gastos.',
} as const;

export type ResultadoLectura =
  | { ok: true; datos: DatosCompletos; exportadoEn: string }
  | { ok: false; motivo: keyof typeof MENSAJES_RESPALDO };

const ICONOS: readonly ClaveIcono[] = ['supermercado', 'salud', 'transporte', 'casa', 'salidas', 'familia', 'ropa', 'otro'];
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

type Objeto = Record<string, unknown>;

const esObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === 'string';
const esTextoNoVacio = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const esEnteroNoNegativo = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const esFecha = (v: unknown): v is string => esTexto(v) && esFechaValida(v);
const esFechaHora = (v: unknown): v is string => esTexto(v) && FECHA_HORA.test(v) && esFechaValida(v.slice(0, 10));
const esOrigen = (v: unknown) => v === 'manual' || v === 'cartola';
const textoONulo = (v: unknown) => v === null || esTexto(v);

function esMes(v: unknown): v is string {
  if (!esTexto(v)) return false;
  try {
    partesMes(v);
    return true;
  } catch {
    return false;
  }
}

function esCategoria(v: unknown): v is Categoria {
  return (
    esObjeto(v) &&
    esTextoNoVacio(v.id) &&
    esTextoNoVacio(v.nombre) &&
    ICONOS.includes(v.icono as ClaveIcono) &&
    typeof v.visible === 'boolean' &&
    esEnteroNoNegativo(v.orden)
  );
}

function esGastoRecurrente(v: unknown): v is GastoRecurrente {
  return (
    esObjeto(v) &&
    esTextoNoVacio(v.id) &&
    esTextoNoVacio(v.nombre) &&
    (v.diaVencimiento === null || (Number.isInteger(v.diaVencimiento) && (v.diaVencimiento as number) >= 1 && (v.diaVencimiento as number) <= 31)) &&
    esMes(v.desde) &&
    (v.hasta === null || esMes(v.hasta)) &&
    Array.isArray(v.palabrasClave) &&
    v.palabrasClave.every(esTexto) &&
    esTexto(v.creadoEn)
  );
}

function esPagoRecurrente(v: unknown): v is PagoRecurrente {
  return (
    esObjeto(v) &&
    esTextoNoVacio(v.id) &&
    esTextoNoVacio(v.gastoRecurrenteId) &&
    esMes(v.mes) &&
    (v.monto === null || esEnteroNoNegativo(v.monto)) &&
    typeof v.pagado === 'boolean' &&
    (v.fechaPago === null || esFecha(v.fechaPago)) &&
    (v.pagado || v.fechaPago === null) &&
    esOrigen(v.origen) &&
    textoONulo(v.movimientoId)
  );
}

function esGasto(v: unknown): v is Gasto {
  return (
    esObjeto(v) &&
    esTextoNoVacio(v.id) &&
    esFecha(v.fecha) &&
    esEnteroNoNegativo(v.monto) &&
    (v.monto as number) > 0 &&
    esTextoNoVacio(v.categoriaId) &&
    esOrigen(v.origen) &&
    textoONulo(v.glosa) &&
    textoONulo(v.movimientoId) &&
    esTexto(v.creadoEn) &&
    esTexto(v.actualizadoEn)
  );
}

const sinRepetidos = (lista: Array<{ id: string }>) => new Set(lista.map((x) => x.id)).size === lista.length;

/**
 * Lleva un respaldo de una versión anterior del esquema a la actual.
 * Hoy solo existe la versión 1. Cada versión nueva agrega aquí su paso, en orden:
 *   if (version < 2) { ...cambios de la 1 a la 2...; version = 2; }
 */
function migrar(respaldo: Objeto, version: number): Objeto {
  if (version > VERSION_ESQUEMA) throw new RangeError('Versión más nueva');
  return respaldo;
}

export function leerRespaldo(texto: string): ResultadoLectura {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: 'noEsRespaldo' };
  }
  if (!esObjeto(crudo) || crudo.app !== APP_RESPALDO || !Number.isInteger(crudo.versionEsquema) || (crudo.versionEsquema as number) < 1) {
    return { ok: false, motivo: 'noEsRespaldo' };
  }
  if ((crudo.versionEsquema as number) > VERSION_ESQUEMA) return { ok: false, motivo: 'versionNueva' };

  const r = migrar(crudo, crudo.versionEsquema as number);
  const { categorias, gastosRecurrentes, pagosRecurrentes, gastos, ajustes, exportadoEn } = r;

  const valido =
    esFechaHora(exportadoEn) &&
    Array.isArray(categorias) &&
    categorias.every(esCategoria) &&
    categorias.length > 0 &&
    Array.isArray(gastosRecurrentes) &&
    gastosRecurrentes.every(esGastoRecurrente) &&
    Array.isArray(pagosRecurrentes) &&
    pagosRecurrentes.every(esPagoRecurrente) &&
    Array.isArray(gastos) &&
    gastos.every(esGasto) &&
    esObjeto(ajustes);
  if (!valido) return { ok: false, motivo: 'noEsRespaldo' };

  // Cada referencia debe apuntar a algo que existe en el mismo archivo.
  const idsCategorias = new Set(categorias.map((c) => c.id));
  const idsRecurrentes = new Set(gastosRecurrentes.map((g) => g.id));
  const referenciasBien =
    sinRepetidos(categorias) &&
    sinRepetidos(gastosRecurrentes) &&
    sinRepetidos(pagosRecurrentes) &&
    sinRepetidos(gastos) &&
    gastos.every((g) => idsCategorias.has(g.categoriaId)) &&
    pagosRecurrentes.every((p) => idsRecurrentes.has(p.gastoRecurrenteId));
  if (!referenciasBien) return { ok: false, motivo: 'noEsRespaldo' };

  const ajustesNuevos: Ajustes = { versionEsquema: VERSION_ESQUEMA, ultimoRespaldo: exportadoEn };
  return {
    ok: true,
    exportadoEn,
    datos: { categorias, gastosRecurrentes, pagosRecurrentes, gastos, ajustes: ajustesNuevos },
  };
}
