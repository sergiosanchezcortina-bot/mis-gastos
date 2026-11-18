import { describe, expect, it } from 'vitest';
import { crearDatosDeEjemplo } from '../datos/ejemplo';
import { crearRespaldo, nombreArchivoRespaldo, textoRespaldo } from './exportar';
import { leerRespaldo, MENSAJES_RESPALDO } from './importar';
import { VERSION_ESQUEMA } from '../datos/db';
import type { Comprobante } from '../dominio/tipos';
import { aBase64, desdeBase64 } from './base64';

const datos = crearDatosDeEjemplo('2026-11-17');
const respaldo = crearRespaldo(datos, '2026-11-17T21:30:00');
const texto = textoRespaldo(respaldo);

/** Cambia una parte del respaldo y devuelve el texto. */
function alterado(cambio: (r: Record<string, unknown>) => void): string {
  const copia = JSON.parse(texto) as Record<string, unknown>;
  cambio(copia);
  return JSON.stringify(copia);
}

describe('exportar', () => {
  it('AJU-A4: nombre del archivo con la fecha de hoy', () => {
    expect(nombreArchivoRespaldo('2026-11-17')).toBe('mis-gastos-respaldo-2026-11-17.json');
  });

  it('tiene el formato de arquitectura.md', () => {
    expect(Object.keys(respaldo)).toEqual([
      'app',
      'versionEsquema',
      'exportadoEn',
      'categorias',
      'gastosRecurrentes',
      'pagosRecurrentes',
      'gastos',
      'comprobantes',
      'ajustes',
    ]);
    expect(respaldo.app).toBe('mis-gastos');
    expect(respaldo.versionEsquema).toBe(VERSION_ESQUEMA);
    expect(respaldo.ajustes.ultimoRespaldo).toBe('2026-11-17T21:30:00');
  });
});

describe('importar', () => {
  it('AJU-A5: un respaldo propio se lee completo y sin cambios', () => {
    const leido = leerRespaldo(texto);
    expect(leido.ok).toBe(true);
    if (!leido.ok) return;
    expect(leido.exportadoEn).toBe('2026-11-17T21:30:00');
    expect(leido.datos.categorias).toEqual(datos.categorias);
    expect(leido.datos.gastosRecurrentes).toEqual(datos.gastosRecurrentes);
    expect(leido.datos.pagosRecurrentes).toEqual(datos.pagosRecurrentes);
    expect(leido.datos.gastos).toEqual(datos.gastos);
    expect(leido.datos.ajustes).toEqual({ versionEsquema: VERSION_ESQUEMA, ultimoRespaldo: '2026-11-17T21:30:00' });
  });

  it('un respaldo sin gastos también sirve', () => {
    const vacio = crearRespaldo({ ...datos, gastos: [], gastosRecurrentes: [], pagosRecurrentes: [] }, '2026-11-17T10:00:00');
    expect(leerRespaldo(textoRespaldo(vacio)).ok).toBe(true);
  });

  it('acepta una hora con zona horaria', () => {
    expect(leerRespaldo(alterado((r) => (r.exportadoEn = '2026-11-17T21:30:00.000Z'))).ok).toBe(true);
  });

  it.each([
    ['texto que no es JSON', 'hola'],
    ['JSON vacío', '{}'],
    ['una lista', '[]'],
    ['otra app', alterado((r) => (r.app = 'otra-app'))],
    ['sin versión', alterado((r) => delete r.versionEsquema)],
    ['versión 0', alterado((r) => (r.versionEsquema = 0))],
    ['sin gastos', alterado((r) => delete r.gastos)],
    ['monto con decimales', alterado((r) => ((r.gastos as Array<Record<string, unknown>>)[0]!.monto = 12.5))],
    ['monto negativo', alterado((r) => ((r.gastos as Array<Record<string, unknown>>)[0]!.monto = -100))],
    ['monto cero', alterado((r) => ((r.gastos as Array<Record<string, unknown>>)[0]!.monto = 0))],
    ['fecha imposible', alterado((r) => ((r.gastos as Array<Record<string, unknown>>)[0]!.fecha = '2026-02-30'))],
    ['categoría que no existe', alterado((r) => ((r.gastos as Array<Record<string, unknown>>)[0]!.categoriaId = 'nada'))],
    ['ícono desconocido', alterado((r) => ((r.categorias as Array<Record<string, unknown>>)[0]!.icono = 'perro'))],
    ['sin categorías', alterado((r) => (r.categorias = []))],
    ['pago de un recurrente que no existe', alterado((r) => ((r.pagosRecurrentes as Array<Record<string, unknown>>)[0]!.gastoRecurrenteId = 'nada'))],
    ['sin pagar pero con fecha de pago', alterado((r) => {
      const p = (r.pagosRecurrentes as Array<Record<string, unknown>>)[0]!;
      p.pagado = false;
      p.fechaPago = '2026-06-05';
    })],
    ['día de vencimiento 32', alterado((r) => ((r.gastosRecurrentes as Array<Record<string, unknown>>)[0]!.diaVencimiento = 32))],
    ['mes mal escrito', alterado((r) => ((r.pagosRecurrentes as Array<Record<string, unknown>>)[0]!.mes = '2026-13'))],
    ['ids repetidos', alterado((r) => {
      const g = r.gastos as Array<Record<string, unknown>>;
      g[1]!.id = g[0]!.id;
    })],
    ['fecha de exportación inválida', alterado((r) => (r.exportadoEn = 'ayer'))],
  ])('AJU-A6: rechaza %s', (_, contenido) => {
    expect(leerRespaldo(contenido)).toEqual({ ok: false, motivo: 'noEsRespaldo' });
  });

  it('un respaldo de una versión más nueva se rechaza con su propio mensaje', () => {
    expect(leerRespaldo(alterado((r) => (r.versionEsquema = VERSION_ESQUEMA + 1)))).toEqual({ ok: false, motivo: 'versionNueva' });
    expect(MENSAJES_RESPALDO.versionNueva).toBe('Este respaldo es de una versión más nueva de Mis gastos.');
    expect(MENSAJES_RESPALDO.noEsRespaldo).toBe('Este archivo no es un respaldo de Mis gastos.');
  });
});

describe('descripción de los gastos (fase 7)', () => {
  it('se guarda y se lee en el respaldo', () => {
    const conDescripcion = datos.gastos.find((g) => g.descripcion !== null);
    expect(conDescripcion).toBeDefined();
    const leido = leerRespaldo(texto);
    expect(leido.ok && leido.datos.gastos.find((g) => g.id === conDescripcion?.id)?.descripcion).toBe(conDescripcion?.descripcion);
  });

  it('un respaldo de la versión 1, sin descripciones, se lee con descripción vacía', () => {
    const v1 = alterado((r) => {
      r.versionEsquema = 1;
      for (const g of r.gastos as Array<Record<string, unknown>>) delete g.descripcion;
    });
    const leido = leerRespaldo(v1);
    expect(leido.ok).toBe(true);
    if (!leido.ok) return;
    expect(leido.datos.gastos).toHaveLength(datos.gastos.length);
    expect(leido.datos.gastos.every((g) => g.descripcion === null)).toBe(true);
  });

  it('rechaza una descripción de más de 60 caracteres', () => {
    const largo = alterado((r) => {
      (r.gastos as Array<Record<string, unknown>>)[0]!.descripcion = 'x'.repeat(61);
    });
    expect(leerRespaldo(largo)).toEqual({ ok: false, motivo: 'noEsRespaldo' });
  });
});

describe('comprobantes en el respaldo (F7-A6)', () => {
  const bytes = new Uint8Array(70000).map((_, i) => (i * 7) % 256);
  const pago = datos.pagosRecurrentes[0]!;
  const comprobante: Comprobante = {
    pagoId: pago.id,
    nombre: 'boleta luz.pdf',
    tipo: 'application/pdf',
    tamano: bytes.length,
    datos: bytes.buffer,
    agregadoEn: '2026-11-10T12:00:00.000Z',
  };
  const conComprobante = textoRespaldo(crearRespaldo({ ...datos, comprobantes: [comprobante] }, '2026-11-17T21:30:00'));

  it('base64 ida y vuelta deja los mismos bytes', () => {
    const vuelta = desdeBase64(aBase64(bytes.buffer));
    expect(vuelta && new Uint8Array(vuelta)).toEqual(bytes);
    expect(desdeBase64('esto no es base64!!')).toBeNull();
  });

  it('se guardan y se leen con el mismo archivo', () => {
    const leido = leerRespaldo(conComprobante);
    expect(leido.ok).toBe(true);
    if (!leido.ok) return;
    expect(leido.datos.comprobantes).toHaveLength(1);
    const [c] = leido.datos.comprobantes;
    expect(c).toMatchObject({ pagoId: pago.id, nombre: 'boleta luz.pdf', tipo: 'application/pdf', tamano: bytes.length });
    expect(new Uint8Array(c!.datos)).toEqual(bytes);
  });

  it('un respaldo de la versión 1 se lee sin comprobantes', () => {
    const v1 = alterado((r) => {
      r.versionEsquema = 1;
      delete r.comprobantes;
    });
    const leido = leerRespaldo(v1);
    expect(leido.ok && leido.datos.comprobantes).toEqual([]);
  });

  it('se rechaza un comprobante de un pago que no existe, o con el tamaño cambiado', () => {
    const cambiar = (cambio: (c: Record<string, unknown>) => void) => {
      const copia = JSON.parse(conComprobante) as { comprobantes: Array<Record<string, unknown>> };
      cambio(copia.comprobantes[0]!);
      return JSON.stringify(copia);
    };
    expect(leerRespaldo(cambiar((c) => (c.pagoId = 'no-existe'))).ok).toBe(false);
    expect(leerRespaldo(cambiar((c) => (c.tamano = 5))).ok).toBe(false);
    expect(leerRespaldo(cambiar((c) => (c.datosBase64 = '%%%'))).ok).toBe(false);
  });
});
