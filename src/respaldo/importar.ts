/**
 * Leer un archivo de respaldo. Se revisa completo antes de tocar ningún dato (AJU-A6):
 * si cualquier parte no tiene la forma esperada, se rechaza entero.
 */
import type {
  Ajustes,
  Categoria,
  ClaveIcono,
  Comprobante,
  DatosCompletos,
  Gasto,
  GastoRecurrente,
  PagoRecurrente,
} from '../dominio/tipos';
import { esFechaValida, partesMes } from '../dominio/fechas';
import { VERSION_ESQUEMA } from '../datos/db';
import { APP_RESPALDO } from './formato';
import { desdeBase64 } from './base64';
import { LARGO_DESCRIPCION } from '../dominio/gastos';

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
    esTexto(v.creadoEn) &&
    [1, 2, 3, 6, 12].includes(v.cadaMeses as number) &&
    esMes(v.ancla)
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
    (v.descripcion === null || (esTexto(v.descripcion) && v.descripcion.length <= LARGO_DESCRIPCION)) &&
    typeof v.porHacer === 'boolean' &&
    esOrigen(v.origen) &&
    textoONulo(v.glosa) &&
    textoONulo(v.movimientoId) &&
    esTexto(v.creadoEn) &&
    esTexto(v.actualizadoEn)
  );
}

/** Valida un comprobante del archivo y lo convierte. Devuelve null si algo no calza. */
function leerComprobante(v: unknown): Comprobante | null {
  if (
    !esObjeto(v) ||
    !esTextoNoVacio(v.pagoId) ||
    !esTexto(v.nombre) ||
    !esTexto(v.tipo) ||
    !esEnteroNoNegativo(v.tamano) ||
    !esTexto(v.agregadoEn) ||
    !esTexto(v.datosBase64)
  ) {
    return null;
  }
  const datos = desdeBase64(v.datosBase64);
  if (datos === null || datos.byteLength !== v.tamano) return null;
  return { pagoId: v.pagoId, nombre: v.nombre, tipo: v.tipo, tamano: v.tamano, agregadoEn: v.agregadoEn, datos };
}

const sinRepetidos = (lista: Array<{ id: string }>) => new Set(lista.map((x) => x.id)).size === lista.length;

/**
 * Lleva un respaldo de una versión anterior del esquema a la actual.
 * Cada versión nueva agrega aquí su paso, en orden.
 */
function migrar(respaldo: Objeto, version: number): Objeto {
  if (version > VERSION_ESQUEMA) throw new RangeError('Versión más nueva');
  let r = respaldo;
  if (version < 2) {
    // Versión 2 (fase 7): descripción en los gastos no recurrentes.
    const gastos = Array.isArray(r.gastos) ? r.gastos.map((g: unknown) => (esObjeto(g) ? { ...g, descripcion: null } : g)) : r.gastos;
    r = { ...r, gastos, comprobantes: [] };
  }
  if (version < 3) {
    // Versión 3 (fase 8): repetición. Los gastos recurrentes de antes son mensuales.
    const gastosRecurrentes = Array.isArray(r.gastosRecurrentes)
      ? r.gastosRecurrentes.map((g: unknown) => (esObjeto(g) ? { cadaMeses: 1, ancla: g.desde, ...g } : g))
      : r.gastosRecurrentes;
    const gastos = Array.isArray(r.gastos) ? r.gastos.map((g: unknown) => (esObjeto(g) ? { porHacer: false, ...g } : g)) : r.gastos;
    r = { ...r, gastosRecurrentes, gastos };
  }
  return r;
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
  const { categorias, gastosRecurrentes, pagosRecurrentes, gastos, ajustes, exportadoEn, comprobantes: comprobantesCrudos } = r;

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
    esObjeto(ajustes) &&
    Array.isArray(comprobantesCrudos);
  if (!valido) return { ok: false, motivo: 'noEsRespaldo' };

  const comprobantes = comprobantesCrudos.map(leerComprobante);
  if (!comprobantes.every((c): c is Comprobante => c !== null)) return { ok: false, motivo: 'noEsRespaldo' };

  // Cada referencia debe apuntar a algo que existe en el mismo archivo.
  const idsCategorias = new Set(categorias.map((c) => c.id));
  const idsRecurrentes = new Set(gastosRecurrentes.map((g) => g.id));
  const idsPagos = new Set(pagosRecurrentes.map((p) => p.id));
  const referenciasBien =
    sinRepetidos(categorias) &&
    sinRepetidos(gastosRecurrentes) &&
    sinRepetidos(pagosRecurrentes) &&
    sinRepetidos(gastos) &&
    gastos.every((g) => idsCategorias.has(g.categoriaId)) &&
    pagosRecurrentes.every((p) => idsRecurrentes.has(p.gastoRecurrenteId)) &&
    new Set(comprobantes.map((c) => c.pagoId)).size === comprobantes.length &&
    comprobantes.every((c) => idsPagos.has(c.pagoId));
  if (!referenciasBien) return { ok: false, motivo: 'noEsRespaldo' };

  const ajustesNuevos: Ajustes = { versionEsquema: VERSION_ESQUEMA, ultimoRespaldo: exportadoEn };
  return {
    ok: true,
    exportadoEn,
    datos: { categorias, gastosRecurrentes, pagosRecurrentes, gastos, comprobantes, ajustes: ajustesNuevos },
  };
}
