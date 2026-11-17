import { describe, expect, it } from 'vitest';
import { formatearMiles, formatearMonto } from './montos';

describe('formatearMonto', () => {
  it.each([
    [0, '$0'],
    [5, '$5'],
    [999, '$999'],
    [1000, '$1.000'],
    [8500, '$8.500'],
    [12500, '$12.500'],
    [277500, '$277.500'],
    [1250000, '$1.250.000'],
    [99999999, '$99.999.999'],
  ])('%i se muestra como %s', (valor, esperado) => {
    expect(formatearMonto(valor)).toBe(esperado);
  });

  it('no acepta decimales', () => {
    expect(() => formatearMonto(12.5)).toThrow(RangeError);
  });

  it('no acepta negativos', () => {
    expect(() => formatearMonto(-100)).toThrow(RangeError);
  });

  it('no acepta valores que no son números', () => {
    expect(() => formatearMonto(Number.NaN)).toThrow(RangeError);
  });
});

describe('formatearMiles', () => {
  it('pone punto de miles sin signo peso', () => {
    expect(formatearMiles(120000)).toBe('120.000');
  });
});
