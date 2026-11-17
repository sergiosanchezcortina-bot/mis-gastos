import { describe, expect, it } from 'vitest';
import type { Categoria } from './tipos';
import { cantidadVisibles, puedeOcultar, validarNombreCategoria } from './categorias';

const cat = (id: string, nombre: string, visible = true): Categoria => ({ id, nombre, icono: 'otro', visible, orden: 0 });

describe('puedeOcultar (AJU-A3)', () => {
  it('con 3 visibles se puede ocultar una', () => {
    expect(puedeOcultar([cat('a', 'A'), cat('b', 'B'), cat('c', 'C'), cat('d', 'D', false)])).toBe(true);
  });

  it('con 2 visibles ya no', () => {
    const lista = [cat('a', 'A'), cat('b', 'B'), cat('c', 'C', false)];
    expect(cantidadVisibles(lista)).toBe(2);
    expect(puedeOcultar(lista)).toBe(false);
  });
});

describe('validarNombreCategoria', () => {
  const lista = [cat('salidas', 'Salidas'), cat('salud', 'Salud')];

  it('acepta un nombre nuevo y limpia espacios', () => {
    expect(validarNombreCategoria('  Restaurantes  y   cafés ', lista, 'salidas')).toEqual({ nombre: 'Restaurantes y cafés' });
  });

  it('no acepta vacío', () => {
    expect(validarNombreCategoria('   ', lista, 'salidas').error).toBe('Escribe un nombre');
  });

  it('no acepta el nombre de otra categoría, sin importar mayúsculas ni tildes', () => {
    expect(validarNombreCategoria('SALUD', lista, 'salidas').error).toBe('Ya tienes una categoría con ese nombre');
    expect(validarNombreCategoria('Sálud', lista, 'salidas').error).toBe('Ya tienes una categoría con ese nombre');
  });

  it('puede dejar su propio nombre', () => {
    expect(validarNombreCategoria('salidas', lista, 'salidas')).toEqual({ nombre: 'salidas' });
  });
});
