import { describe, expect, it } from 'vitest';
import type { Categoria, Gasto, GastoRecurrente, PagoRecurrente } from './tipos';
import {
  acumuladoPorSemana,
  diaInicial,
  elementosDelMes,
  estimadoDelMes,
  grillaDelMes,
  textoEstadoElemento,
  tituloDia,
} from './calendario';

const HOY = '2026-11-18';
const MES = '2026-11';
const categorias: Categoria[] = [{ id: 'super', nombre: 'Supermercado', icono: 'supermercado', visible: true, orden: 0 }];

function recurrente(nombre: string, dia: number | null, monto: number | null, fechaPago: string | null) {
  const gasto: GastoRecurrente = {
    id: nombre,
    nombre,
    diaVencimiento: dia,
    desde: MES,
    hasta: null,
    palabrasClave: [],
    creadoEn: '',
    cadaMeses: 1,
    ancla: MES,
  };
  const pago: PagoRecurrente = {
    id: `p-${nombre}`,
    gastoRecurrenteId: nombre,
    mes: MES,
    monto,
    pagado: fechaPago !== null,
    fechaPago,
    origen: 'manual',
    movimientoId: null,
  };
  return { gasto, pago };
}

function gasto(fecha: string, monto: number, porHacer = false): Gasto {
  return {
    id: `${fecha}-${monto}`,
    fecha,
    monto,
    categoriaId: 'super',
    descripcion: null,
    porHacer,
    origen: 'manual',
    glosa: null,
    movimientoId: null,
    creadoEn: '',
    actualizadoEn: '',
  };
}

const filas = [
  recurrente('Gastos comunes', 5, 120000, '2026-11-05'),
  recurrente('Luz', 15, 38000, null), // venció el 15
  recurrente('Gas', 25, 27000, null), // vence el 25
  recurrente('Netflix', null, 9990, null), // sin día
];
const gastos = [
  gasto('2026-11-03', 20000),
  gasto('2026-11-18', 5000),
  gasto('2026-11-28', 45000, true), // por hacer
  gasto('2026-11-10', 15000, true), // por hacer vencido
  gasto('2026-10-30', 99999), // otro mes
];
const elementos = elementosDelMes({ mes: MES, hoy: HOY, filas, gastos, categorias });

describe('elementos del mes', () => {
  it('junta recurrentes, gastos y por hacer del mes, con su estado', () => {
    const resumen = elementos.map((e) => [e.nombre, e.dia, e.estado]);
    expect(resumen).toEqual([
      ['Gastos comunes', 5, 'hecho'],
      ['Luz', 15, 'vencido'],
      ['Gas', 25, 'pendiente'],
      ['Netflix', null, 'pendiente'],
      ['Supermercado', 3, 'hecho'],
      ['Supermercado', 18, 'hecho'],
      ['Supermercado', 28, 'pendiente'],
      ['Supermercado', 10, 'vencido'],
    ]);
  });

  it('textos de estado', () => {
    expect(textoEstadoElemento({ tipo: 'recurrente', estado: 'hecho' })).toBe('Pagado');
    expect(textoEstadoElemento({ tipo: 'recurrente', estado: 'vencido' })).toBe('Venció');
    expect(textoEstadoElemento({ tipo: 'porHacer', estado: 'vencido' })).toBe('¿Lo hiciste?');
    expect(textoEstadoElemento({ tipo: 'porHacer', estado: 'pendiente' })).toBe('Por hacer');
  });
});

describe('CAL-1 y F8-A6: cómo terminaría el mes', () => {
  it('total = gastado + recurrentes por pagar + por hacer', () => {
    const e = estimadoDelMes(elementos, MES, HOY);
    expect(e).toEqual({
      gastado: 145000,
      recurrentesPorPagar: 38000 + 27000 + 9990,
      porHacer: 60000,
      total: 145000 + 74990 + 60000,
      terminado: false,
    });
  });

  it('un mes terminado solo cuenta lo gastado', () => {
    const e = estimadoDelMes(elementos, MES, '2026-12-02');
    expect(e.terminado).toBe(true);
    expect(e.total).toBe(e.gastado);
  });
});

describe('CAL-2: la grilla', () => {
  const semanas = grillaDelMes(elementos, MES, HOY);

  it('noviembre 2026 parte en domingo y tiene 6 semanas de lunes a domingo', () => {
    expect(semanas).toHaveLength(6);
    expect(semanas[0]!.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(semanas[0]![6]?.dia).toBe(1);
    expect(semanas[5]![0]?.dia).toBe(30);
  });

  it('cada día resume por estado y marca hoy', () => {
    const dias = semanas.flat();
    const dia18 = dias.find((d) => d?.dia === 18)!;
    expect(dia18.esHoy).toBe(true);
    expect(dia18.resumen).toEqual([{ estado: 'hecho', cantidad: 1, monto: 5000 }]);
    expect(dias.find((d) => d?.dia === 15)?.resumen).toEqual([{ estado: 'vencido', cantidad: 1, monto: 38000 }]);
  });

  it('título y día inicial', () => {
    expect(tituloDia('2026-11-18', HOY)).toBe('Hoy, miércoles 18');
    expect(tituloDia('2026-11-28', HOY)).toBe('Sábado 28');
    expect(diaInicial(MES, HOY)).toBe(18);
    expect(diaInicial('2026-10', HOY)).toBe(1);
  });
});

describe('CAL-4, CAL-5 y F8-A8: acumulado por semana', () => {
  const semanas = acumuladoPorSemana(elementos, MES, HOY);

  it('semanas de lunes a domingo recortadas al mes', () => {
    expect(semanas.map((s) => [s.desde, s.hasta])).toEqual([
      [1, 1],
      [2, 8],
      [9, 15],
      [16, 22],
      [23, 29],
      [30, 30],
    ]);
  });

  it('lo vencido se suma en la semana de hoy, no en la de su fecha', () => {
    const semanaDel9 = semanas[2]!;
    expect(semanaDel9.estimado).toBe(semanaDel9.gastado); // Luz (15) y el por hacer del 10 no cuentan aquí
    const semanaDeHoy = semanas[3]!;
    expect(semanaDeHoy.estimado - semanaDeHoy.gastado).toBe(38000 + 15000);
  });

  it('la última semana muestra el total estimado del mes', () => {
    expect(semanas.at(-1)!.estimado).toBe(estimadoDelMes(elementos, MES, HOY).total);
  });

  it('lo gastado nunca baja de una semana a la siguiente', () => {
    for (let i = 1; i < semanas.length; i++) expect(semanas[i]!.gastado).toBeGreaterThanOrEqual(semanas[i - 1]!.gastado);
  });
});
