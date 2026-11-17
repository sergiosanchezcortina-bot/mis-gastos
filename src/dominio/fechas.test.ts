import { describe, expect, it } from 'vitest';
import {
  diaAnterior,
  diasDelMes,
  esFechaValida,
  nombreDiaSemana,
  ultimaFechaDelMes,
  fechaLocal,
  limitesSelectorMes,
  mesAnterior,
  mesDeFecha,
  mesSiguiente,
  nombreMes,
  nombreMesConAnio,
  partesMes,
} from './fechas';

describe('fechaLocal', () => {
  it('usa la fecha local, no UTC', () => {
    // 23:30 del 30 de noviembre en hora local. En UTC (Chile, UTC-3) ya sería 1 de diciembre.
    expect(fechaLocal(new Date(2026, 10, 30, 23, 30))).toBe('2026-11-30');
  });

  it('justo después de medianoche ya es el día siguiente', () => {
    expect(fechaLocal(new Date(2026, 11, 1, 0, 5))).toBe('2026-12-01');
  });

  it('rellena con cero mes y día', () => {
    expect(fechaLocal(new Date(2027, 0, 5))).toBe('2027-01-05');
  });
});

describe('mesDeFecha', () => {
  it('toma año y mes', () => {
    expect(mesDeFecha('2026-11-17')).toBe('2026-11');
  });

  it('rechaza textos mal formados', () => {
    expect(() => mesDeFecha('17-11-2026')).toThrow(RangeError);
  });
});

describe('mes anterior y siguiente', () => {
  it('se mueve dentro del año', () => {
    expect(mesAnterior('2026-11')).toBe('2026-10');
    expect(mesSiguiente('2026-11')).toBe('2026-12');
  });

  it('cruza el cambio de año hacia atrás', () => {
    expect(mesAnterior('2027-01')).toBe('2026-12');
  });

  it('cruza el cambio de año hacia adelante', () => {
    expect(mesSiguiente('2026-12')).toBe('2027-01');
  });
});

describe('partesMes', () => {
  it('rechaza el mes 13', () => {
    expect(() => partesMes('2026-13')).toThrow(RangeError);
  });

  it('rechaza el mes 0', () => {
    expect(() => partesMes('2026-00')).toThrow(RangeError);
  });
});

describe('diasDelMes', () => {
  it.each([
    ['2026-01', 31],
    ['2026-02', 28],
    ['2028-02', 29],
    ['2100-02', 28],
    ['2000-02', 29],
    ['2026-04', 30],
    ['2026-11', 30],
    ['2026-12', 31],
  ])('%s tiene %i días', (mes, dias) => {
    expect(diasDelMes(mes)).toBe(dias);
  });
});

describe('nombres de mes', () => {
  it('en minúscula para usar en frases', () => {
    expect(nombreMes('2026-10')).toBe('octubre');
    expect(nombreMes('2026-09')).toBe('septiembre');
  });

  it('con mayúscula y año para títulos', () => {
    expect(nombreMesConAnio('2026-11')).toBe('Noviembre 2026');
    expect(nombreMesConAnio('2027-01')).toBe('Enero 2027');
  });
});

describe('limitesSelectorMes', () => {
  it('en el mes actual no se puede ir al siguiente', () => {
    expect(limitesSelectorMes('2026-11', '2026-11', '2026-08').puedeIrSiguiente).toBe(false);
  });

  it('en un mes pasado se puede ir al siguiente', () => {
    expect(limitesSelectorMes('2026-10', '2026-11', '2026-08').puedeIrSiguiente).toBe(true);
  });

  it('en el primer mes con datos no se puede ir al anterior', () => {
    expect(limitesSelectorMes('2026-08', '2026-11', '2026-08').puedeIrAnterior).toBe(false);
  });

  it('después del primer mes con datos se puede ir al anterior', () => {
    expect(limitesSelectorMes('2026-09', '2026-11', '2026-08').puedeIrAnterior).toBe(true);
  });

  it('sin datos no se puede mover a ningún lado', () => {
    expect(limitesSelectorMes('2026-11', '2026-11', null)).toEqual({
      puedeIrAnterior: false,
      puedeIrSiguiente: false,
    });
  });

  it('si los únicos datos son de este mes, no se puede ir al anterior', () => {
    expect(limitesSelectorMes('2026-11', '2026-11', '2026-11').puedeIrAnterior).toBe(false);
  });

  it('funciona al cruzar el año', () => {
    expect(limitesSelectorMes('2027-01', '2027-01', '2026-12').puedeIrAnterior).toBe(true);
  });
});

describe('diaAnterior', () => {
  it('dentro del mes', () => {
    expect(diaAnterior('2026-11-17')).toBe('2026-11-16');
  });

  it('cruza el cambio de mes', () => {
    expect(diaAnterior('2026-12-01')).toBe('2026-11-30');
    expect(diaAnterior('2026-03-01')).toBe('2026-02-28');
    expect(diaAnterior('2028-03-01')).toBe('2028-02-29');
  });

  it('cruza el cambio de año', () => {
    expect(diaAnterior('2027-01-01')).toBe('2026-12-31');
  });
});

describe('nombreDiaSemana', () => {
  it.each([
    ['2026-11-16', 'lunes'],
    ['2026-11-15', 'domingo'],
    ['2026-11-14', 'sábado'],
    ['2026-11-11', 'miércoles'],
    ['2027-01-01', 'viernes'],
    ['2028-02-29', 'martes'],
  ])('%s es %s', (fecha, nombre) => {
    expect(nombreDiaSemana(fecha)).toBe(nombre);
  });
});

describe('esFechaValida', () => {
  it('acepta fechas que existen', () => {
    expect(esFechaValida('2028-02-29')).toBe(true);
    expect(esFechaValida('2026-11-30')).toBe(true);
  });

  it.each(['', '2026-11-31', '2027-02-29', '2026-13-01', '2026-11-00', '16-11-2026', '2026-1-5'])(
    'rechaza "%s"',
    (fecha) => {
      expect(esFechaValida(fecha)).toBe(false);
    },
  );
});

describe('ultimaFechaDelMes', () => {
  it('da el último día', () => {
    expect(ultimaFechaDelMes('2026-11')).toBe('2026-11-30');
    expect(ultimaFechaDelMes('2028-02')).toBe('2028-02-29');
  });
});
