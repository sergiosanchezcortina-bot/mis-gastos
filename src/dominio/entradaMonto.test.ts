import { describe, expect, it } from 'vitest';
import { interpretarEntradaMonto, posicionCursor, textoEntradaMonto } from './entradaMonto';

describe('interpretarEntradaMonto', () => {
  it('lee dígitos con o sin punto de miles', () => {
    expect(interpretarEntradaMonto('12500', null)).toBe(12500);
    expect(interpretarEntradaMonto('12.500', null)).toBe(12500);
  });

  it('vacío es null', () => {
    expect(interpretarEntradaMonto('', 500)).toBeNull();
  });

  it('ignora lo que no son dígitos', () => {
    expect(interpretarEntradaMonto('12a', 12)).toBe(12);
    expect(interpretarEntradaMonto('abc', null)).toBeNull();
    expect(interpretarEntradaMonto('-5', null)).toBe(5);
    expect(interpretarEntradaMonto('1,5', null)).toBe(15);
  });

  it('acepta 8 dígitos', () => {
    expect(interpretarEntradaMonto('99.999.999', null)).toBe(99999999);
  });

  it('no acepta un noveno dígito: se queda con el valor anterior', () => {
    expect(interpretarEntradaMonto('99.999.9991', 99999999)).toBe(99999999);
  });

  it('quita ceros a la izquierda', () => {
    expect(interpretarEntradaMonto('0012', null)).toBe(12);
    expect(interpretarEntradaMonto('0', null)).toBe(0);
    expect(interpretarEntradaMonto('000000000005', null)).toBe(5);
  });
});

describe('textoEntradaMonto', () => {
  it('formatea con punto de miles y sin signo', () => {
    expect(textoEntradaMonto(1250000)).toBe('1.250.000');
    expect(textoEntradaMonto(null)).toBe('');
  });
});

describe('posicionCursor', () => {
  it('deja el cursor después de la misma cantidad de dígitos', () => {
    // "1250" con el cursor al final pasa a "1.250": 4 dígitos -> posición 5.
    expect(posicionCursor('1.250', 4)).toBe(5);
    // Cursor después del "2" en "12.500" (2 dígitos) -> posición 2.
    expect(posicionCursor('12.500', 2)).toBe(2);
    // Después del tercer dígito salta el punto: "125.000" -> 3.
    expect(posicionCursor('125.000', 3)).toBe(3);
    expect(posicionCursor('1.250.000', 2)).toBe(3);
  });

  it('al inicio queda en cero', () => {
    expect(posicionCursor('12.500', 0)).toBe(0);
  });
});
