import { describe, expect, it } from 'vitest';
import type { Gasto } from './tipos';
import {
  fechaAlHacer,
  fechaMaxima,
  porHacerVencido,
  textoPorHacer,
  textoResumenGastos as resumenTabla,
  opcionDeFecha as opcionDe,
  LARGO_DESCRIPCION,
  normalizarDescripcion,
  fechaDeOpcion,
  opcionDeFecha,
  ordenarGastos,
  textoCantidadGastos,
  textoConfirmarEliminar,
  textoFechaGasto,
  textoResumenGastos,
  textoVerTodos,
  totalGastos,
  validarGasto,
} from './gastos';

function gasto(id: string, fecha: string, monto = 1000, creadoEn = '2026-11-17T10:00:00'): Gasto {
  return {
    id,
    fecha,
    monto,
    categoriaId: 'c',
    origen: 'manual',
    descripcion: null,
    porHacer: false,
    glosa: null,
    movimientoId: null,
    creadoEn,
    actualizadoEn: creadoEn,
  };
}

describe('ordenarGastos (NOR-5)', () => {
  it('del más reciente al más antiguo', () => {
    const lista = [gasto('a', '2026-11-03'), gasto('b', '2026-11-16'), gasto('c', '2026-11-10')];
    expect(ordenarGastos(lista).map((g) => g.id)).toEqual(['b', 'c', 'a']);
  });

  it('el mismo día, el último anotado va primero', () => {
    const lista = [
      gasto('primero', '2026-11-16', 1, '2026-11-16T09:00:00'),
      gasto('tercero', '2026-11-16', 1, '2026-11-16T18:30:00'),
      gasto('segundo', '2026-11-16', 1, '2026-11-16T12:00:00'),
    ];
    expect(ordenarGastos(lista).map((g) => g.id)).toEqual(['tercero', 'segundo', 'primero']);
  });

  it('un gasto de otro día anotado después queda según su fecha', () => {
    const lista = [gasto('hoy', '2026-11-17', 1, '2026-11-17T09:00:00'), gasto('atrasado', '2026-11-12', 1, '2026-11-17T20:00:00')];
    expect(ordenarGastos(lista).map((g) => g.id)).toEqual(['hoy', 'atrasado']);
  });
});

describe('totales y textos de la tabla', () => {
  it('suma los montos', () => {
    expect(totalGastos([gasto('a', '2026-11-01', 12500), gasto('b', '2026-11-02', 265000)])).toBe(277500);
    expect(totalGastos([])).toBe(0);
  });

  it('cantidad en singular y plural', () => {
    expect(textoCantidadGastos(1)).toBe('1 gasto');
    expect(textoCantidadGastos(0)).toBe('0 gastos');
    expect(textoCantidadGastos(14)).toBe('14 gastos');
  });

  it('encabezado como en la pantalla de referencia', () => {
    const lista = [gasto('a', '2026-11-01', 12500), gasto('b', '2026-11-02', 265000)];
    expect(textoResumenGastos(lista)).toBe('2 gastos, $277.500 en total');
  });

  it('botón para ver todos', () => {
    expect(textoVerTodos(14)).toBe('Ver los 14 gastos del mes');
  });
});

describe('textoFechaGasto (NOR-6)', () => {
  const hoy = '2026-11-16';

  it('hoy', () => {
    expect(textoFechaGasto('2026-11-16', hoy)).toBe('Hoy, lunes 16');
  });

  it('ayer', () => {
    expect(textoFechaGasto('2026-11-15', hoy)).toBe('Ayer, domingo 15');
  });

  it('el resto con el día con mayúscula', () => {
    expect(textoFechaGasto('2026-11-14', hoy)).toBe('Sábado 14');
    expect(textoFechaGasto('2026-11-11', hoy)).toBe('Miércoles 11');
  });

  it('ayer en el mes anterior', () => {
    expect(textoFechaGasto('2026-11-30', '2026-12-01')).toBe('Ayer, lunes 30');
  });

  it('un mismo número de día en otro mes no es hoy', () => {
    expect(textoFechaGasto('2026-10-16', hoy)).toBe('Viernes 16');
  });
});

describe('¿Cuándo fue?', () => {
  it('Hoy y Ayer calculan la fecha', () => {
    expect(fechaDeOpcion('hoy', '2027-01-01', '')).toBe('2027-01-01');
    expect(fechaDeOpcion('ayer', '2027-01-01', '')).toBe('2026-12-31');
  });

  it('Otro día usa la fecha elegida', () => {
    expect(fechaDeOpcion('otro', '2026-11-17', '2026-10-28')).toBe('2026-10-28');
  });

  it('al corregir se marca el botón que corresponde', () => {
    expect(opcionDeFecha('2026-11-17', '2026-11-17')).toBe('hoy');
    expect(opcionDeFecha('2026-11-16', '2026-11-17')).toBe('ayer');
    expect(opcionDeFecha('2026-11-15', '2026-11-17')).toBe('otro');
  });
});

describe('validarGasto (NOR-3)', () => {
  const base = { monto: 12500, fecha: '2026-11-17', categoriaId: 'c', hoy: '2026-11-17' };

  it('un gasto completo no tiene errores', () => {
    expect(validarGasto(base)).toEqual({});
  });

  it('NOR-A2: monto vacío o cero', () => {
    expect(validarGasto({ ...base, monto: null })).toEqual({ monto: 'Escribe cuánto gastaste' });
    expect(validarGasto({ ...base, monto: 0 })).toEqual({ monto: 'Escribe cuánto gastaste' });
  });

  it('NOR-A3: sin categoría', () => {
    expect(validarGasto({ ...base, categoriaId: null })).toEqual({ categoria: 'Elige en qué fue' });
  });

  it('NOR-A4: no acepta fechas futuras', () => {
    expect(validarGasto({ ...base, fecha: '2026-11-18' })).toEqual({ fecha: 'Elige un día que no sea futuro' });
  });

  it('Otro día sin fecha elegida', () => {
    expect(validarGasto({ ...base, fecha: '' })).toEqual({ fecha: 'Elige qué día fue' });
  });

  it('informa todos los errores a la vez', () => {
    expect(Object.keys(validarGasto({ ...base, monto: null, categoriaId: null }))).toEqual(['monto', 'categoria']);
  });
});

describe('textoConfirmarEliminar', () => {
  const hoy = '2026-11-16';

  it('un día cualquiera', () => {
    expect(textoConfirmarEliminar({ monto: 23500, fecha: '2026-11-14' }, 'Supermercado', hoy)).toBe(
      '¿Eliminar el gasto de $23.500 en Supermercado del sábado 14?',
    );
  });

  it('hoy y ayer', () => {
    expect(textoConfirmarEliminar({ monto: 8500, fecha: hoy }, 'Salud', hoy)).toBe('¿Eliminar el gasto de $8.500 en Salud de hoy?');
    expect(textoConfirmarEliminar({ monto: 8500, fecha: '2026-11-15' }, 'Salud', hoy)).toBe(
      '¿Eliminar el gasto de $8.500 en Salud de ayer?',
    );
  });
});

describe('normalizarDescripcion (fase 7)', () => {
  it('vacía o solo espacios queda sin descripción', () => {
    expect(normalizarDescripcion('')).toBeNull();
    expect(normalizarDescripcion('   ')).toBeNull();
  });

  it('quita espacios sobrantes', () => {
    expect(normalizarDescripcion('  Remedios   de la  tía ')).toBe('Remedios de la tía');
  });

  it('corta en 60 caracteres', () => {
    expect(normalizarDescripcion('a'.repeat(70))).toHaveLength(LARGO_DESCRIPCION);
    expect(LARGO_DESCRIPCION).toBe(60);
  });
});

describe('gastos por hacer (NOR-11)', () => {
  const HOY = '2026-11-18';

  it('textos según la fecha', () => {
    expect(textoPorHacer('2026-11-18', HOY)).toBe('Por hacer hoy');
    expect(textoPorHacer('2026-11-19', HOY)).toBe('Por hacer mañana');
    expect(textoPorHacer('2026-11-28', HOY)).toBe('Por hacer el sábado 28');
    expect(textoPorHacer('2026-11-14', HOY)).toBe('¿Lo hiciste? Era el sábado 14');
  });

  it('vencido solo si es por hacer y su fecha pasó', () => {
    expect(porHacerVencido({ porHacer: true, fecha: '2026-11-17' }, HOY)).toBe(true);
    expect(porHacerVencido({ porHacer: true, fecha: '2026-11-18' }, HOY)).toBe(false);
    expect(porHacerVencido({ porHacer: false, fecha: '2026-11-01' }, HOY)).toBe(false);
  });

  it('"Ya lo hice" deja hoy, o el último día de un mes pasado', () => {
    expect(fechaAlHacer('2026-11-28', HOY)).toBe(HOY);
    expect(fechaAlHacer('2026-11-10', HOY)).toBe(HOY);
    expect(fechaAlHacer('2026-10-20', HOY)).toBe('2026-10-31');
  });

  it('acepta fechas hasta fin del mes actual, no más', () => {
    expect(fechaMaxima(HOY, true)).toBe('2026-11-30');
    expect(fechaMaxima(HOY, false)).toBe(HOY);
    const base = { monto: 1000, categoriaId: 'x', hoy: HOY };
    expect(validarGasto({ ...base, fecha: '2026-11-30', porHacer: true })).toEqual({});
    expect(validarGasto({ ...base, fecha: '2026-12-01', porHacer: true }).fecha).toBe('Elige un día de este mes');
    expect(validarGasto({ ...base, fecha: '2026-11-30' }).fecha).toBe('Elige un día que no sea futuro');
  });

  it('"Mañana" se marca al corregir un gasto por hacer de mañana', () => {
    expect(opcionDe('2026-11-19', HOY, true)).toBe('manana');
    expect(opcionDe('2026-11-17', HOY, false)).toBe('ayer');
    expect(opcionDe('2026-11-17', HOY, true)).toBe('otro');
  });

  it('el encabezado de la tabla no suma lo por hacer y lo muestra aparte', () => {
    const lista = [
      gasto('a', '2026-11-10', 5000),
      { ...gasto('b', '2026-11-28', 45000), porHacer: true },
    ];
    expect(resumenTabla(lista)).toBe('1 gasto, $5.000 en total · 1 por hacer, $45.000');
    expect(resumenTabla([lista[0]!])).toBe('1 gasto, $5.000 en total');
  });
});
