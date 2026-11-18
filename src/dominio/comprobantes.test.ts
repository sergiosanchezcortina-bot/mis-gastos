import { describe, expect, it } from 'vitest';
import { MENSAJES_COMPROBANTE, TAMANO_MAXIMO, textoTamano, validarArchivo, vistaDe } from './comprobantes';

describe('validarArchivo (REC-12)', () => {
  it('acepta hasta 10 MB', () => {
    expect(validarArchivo(1)).toBeNull();
    expect(validarArchivo(TAMANO_MAXIMO)).toBeNull();
    expect(TAMANO_MAXIMO).toBe(10 * 1024 * 1024);
  });

  it('rechaza más de 10 MB y archivos vacíos', () => {
    expect(validarArchivo(TAMANO_MAXIMO + 1)).toBe(MENSAJES_COMPROBANTE.muyGrande);
    expect(validarArchivo(0)).toBe(MENSAJES_COMPROBANTE.vacio);
  });
});

describe('vistaDe', () => {
  it('imágenes y PDF se ven en la ventana; lo demás se descarga', () => {
    expect(vistaDe('image/png', 'pantallazo.png')).toBe('imagen');
    expect(vistaDe('image/jpeg', 'foto.jpg')).toBe('imagen');
    expect(vistaDe('application/pdf', 'boleta.pdf')).toBe('pdf');
    expect(vistaDe('application/vnd.ms-excel', 'detalle.xls')).toBe('otro');
    expect(vistaDe('text/plain', 'nota.txt')).toBe('otro');
  });

  it('sin tipo, usa la extensión', () => {
    expect(vistaDe('', 'BOLETA.PDF')).toBe('pdf');
    expect(vistaDe('', 'foto.HEIC')).toBe('imagen');
    expect(vistaDe('', 'archivo')).toBe('otro');
  });
});

describe('textoTamano', () => {
  it('en KB bajo 1 MB y en MB con coma decimal', () => {
    expect(textoTamano(300)).toBe('1 KB');
    expect(textoTamano(350 * 1024)).toBe('350 KB');
    expect(textoTamano(1.25 * 1024 * 1024)).toBe('1,3 MB');
  });
});
