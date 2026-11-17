/**
 * Reglas de categorías (AJU-1). Las categorías no se borran: se ocultan.
 */
import type { Categoria } from './tipos';

export const MINIMO_VISIBLES = 2;
export const TEXTO_MINIMO_VISIBLES = 'Debe haber al menos 2 categorías visibles.';
export const LARGO_MAXIMO_NOMBRE = 24;

export function cantidadVisibles(categorias: readonly Categoria[]): number {
  return categorias.filter((c) => c.visible).length;
}

/** AJU-A3: no se puede ocultar si quedarían menos de 2 visibles. */
export function puedeOcultar(categorias: readonly Categoria[]): boolean {
  return cantidadVisibles(categorias) > MINIMO_VISIBLES;
}

const normalizar = (texto: string) =>
  texto
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function validarNombreCategoria(
  texto: string,
  categorias: readonly Categoria[],
  idPropio: string,
): { nombre: string; error?: string } {
  const nombre = texto.trim().replace(/\s+/g, ' ');
  if (nombre === '') return { nombre, error: 'Escribe un nombre' };
  const repetida = categorias.some((c) => c.id !== idPropio && normalizar(c.nombre) === normalizar(nombre));
  if (repetida) return { nombre, error: 'Ya tienes una categoría con ese nombre' };
  return { nombre };
}
