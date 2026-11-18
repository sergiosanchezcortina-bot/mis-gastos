import { describe, expect, it } from 'vitest';
import type { Categoria, Gasto, PagoRecurrente } from './tipos';
import {
  etiquetaTotal,
  filasEnQueSeFue,
  filasMesAMes,
  fraseComparacion,
  gastado,
  gastadoHasta,
  primerMesConDatos,
  textoGastosAnotados,
  textoVerPendientes,
  tieneDatos,
} from './resumen';

let n = 0;
function g(fecha: string, monto: number, categoriaId = 'super'): Gasto {
  return {
    id: `g${n++}`,
    fecha,
    monto,
    categoriaId,
    origen: 'manual',
    descripcion: null,
    glosa: null,
    movimientoId: null,
    creadoEn: `${fecha}T10:00:${String(n % 60).padStart(2, '0')}`,
    actualizadoEn: '',
  };
}

function p(mes: string, monto: number | null, fechaPago: string | null): PagoRecurrente {
  return {
    id: `p${n++}`,
    gastoRecurrenteId: 'r',
    mes,
    monto,
    pagado: fechaPago !== null,
    fechaPago,
    origen: 'manual',
    movimientoId: null,
  };
}

function cat(id: string, orden: number): Categoria {
  return { id, nombre: id, icono: 'otro', visible: true, orden };
}

describe('gastado y tieneDatos', () => {
  it('RES-A1: recurrentes pagados más no recurrentes', () => {
    const datos = {
      gastos: [g('2026-11-03', 277500)],
      pagos: [p('2026-11', 120000, '2026-11-05'), p('2026-11', 90000, '2026-11-10'), p('2026-11', 87000, null)],
    };
    expect(gastado(datos, '2026-11')).toBe(487500);
  });

  it('un recurrente sin pagar no cuenta, ni como gasto ni como dato', () => {
    const datos = { gastos: [], pagos: [p('2026-10', 50000, null)] };
    expect(gastado(datos, '2026-10')).toBe(0);
    expect(tieneDatos(datos, '2026-10')).toBe(false);
  });

  it('un monto vacío pagado cuenta como 0', () => {
    expect(gastado({ gastos: [], pagos: [p('2026-11', null, '2026-11-02')] }, '2026-11')).toBe(0);
  });

  it('no mezcla meses', () => {
    const datos = { gastos: [g('2026-10-31', 1000), g('2026-11-01', 2000), g('2026-12-01', 4000)], pagos: [] };
    expect(gastado(datos, '2026-11')).toBe(2000);
  });
});

describe('gastadoHasta', () => {
  const datos = {
    gastos: [g('2026-10-10', 1000), g('2026-10-16', 2000), g('2026-10-17', 4000)],
    pagos: [p('2026-10', 10000, '2026-10-16'), p('2026-10', 20000, '2026-10-31')],
  };

  it('incluye el mismo día y excluye los siguientes', () => {
    expect(gastadoHasta(datos, '2026-10', 16)).toBe(13000);
  });

  it('usa la fecha de pago de los recurrentes', () => {
    expect(gastadoHasta(datos, '2026-10', 31)).toBe(37000);
  });
});

describe('fraseComparacion (RES-2)', () => {
  it('RES-A2: mes actual por debajo', () => {
    const datos = {
      gastos: [g('2026-11-10', 487500), g('2026-10-12', 512000), g('2026-10-20', 99999)],
      pagos: [],
    };
    expect(fraseComparacion(datos, '2026-11', '2026-11-16')).toBe('Vas $24.500 por debajo de octubre a esta misma fecha.');
  });

  it('mes actual por encima', () => {
    const datos = { gastos: [g('2026-11-10', 30000), g('2026-10-12', 5500)], pagos: [] };
    expect(fraseComparacion(datos, '2026-11', '2026-11-16')).toBe('Vas $24.500 por encima de octubre a esta misma fecha.');
  });

  it('mes actual igual', () => {
    const datos = { gastos: [g('2026-11-10', 5000), g('2026-10-12', 5000)], pagos: [] };
    expect(fraseComparacion(datos, '2026-11', '2026-11-16')).toBe('Vas igual que octubre a esta misma fecha.');
  });

  it('el 31 se compara con el último día de un mes más corto', () => {
    // Hoy es 31 de diciembre; noviembre tiene 30 días y se compara completo.
    const datos = { gastos: [g('2026-12-31', 100), g('2026-11-30', 100)], pagos: [] };
    expect(fraseComparacion(datos, '2026-12', '2026-12-31')).toBe('Vas igual que noviembre a esta misma fecha.');
  });

  it('el 30 de marzo se compara con febrero completo', () => {
    const datos = { gastos: [g('2027-03-30', 100), g('2027-02-28', 300)], pagos: [] };
    expect(fraseComparacion(datos, '2027-03', '2027-03-30')).toBe('Vas $200 por debajo de febrero a esta misma fecha.');
  });

  it('en enero compara con diciembre del año anterior', () => {
    const datos = { gastos: [g('2027-01-05', 300), g('2026-12-03', 100)], pagos: [] };
    expect(fraseComparacion(datos, '2027-01', '2027-01-10')).toBe('Vas $200 por encima de diciembre a esta misma fecha.');
  });

  it('mes pasado: compara meses completos', () => {
    const datos = { gastos: [g('2026-10-28', 30000), g('2026-09-03', 54500)], pagos: [] };
    expect(fraseComparacion(datos, '2026-10', '2026-11-16')).toBe('$24.500 menos que en septiembre.');
    const mas = { gastos: [g('2026-10-28', 54500), g('2026-09-03', 30000)], pagos: [] };
    expect(fraseComparacion(mas, '2026-10', '2026-11-16')).toBe('$24.500 más que en septiembre.');
    const igual = { gastos: [g('2026-10-28', 100), g('2026-09-03', 100)], pagos: [] };
    expect(fraseComparacion(igual, '2026-10', '2026-11-16')).toBe('Lo mismo que en septiembre.');
  });

  it('RES-A3: sin datos el mes anterior no hay frase', () => {
    const datos = { gastos: [g('2026-11-10', 5000)], pagos: [p('2026-10', 1000, null)] };
    expect(fraseComparacion(datos, '2026-11', '2026-11-16')).toBeNull();
  });
});

describe('textos', () => {
  it('etiqueta del total', () => {
    expect(etiquetaTotal('2026-11', '2026-11')).toBe('Llevas gastado en noviembre');
    expect(etiquetaTotal('2026-10', '2026-11')).toBe('Gastaste en octubre');
  });

  it('gastos anotados', () => {
    expect(textoGastosAnotados(1)).toBe('1 gasto anotado');
    expect(textoGastosAnotados(14)).toBe('14 gastos anotados');
  });

  it('pendientes', () => {
    expect(textoVerPendientes(1)).toBe('Ver el gasto pendiente');
    expect(textoVerPendientes(3)).toBe('Ver los 3 gastos pendientes');
  });
});

describe('filasEnQueSeFue (RES-4)', () => {
  const categorias = [cat('super', 0), cat('salud', 1), cat('transporte', 2), cat('ropa', 6)];

  it('RES-A5: recurrentes más una fila por categoría con gasto, de mayor a menor', () => {
    const datos = {
      gastos: [g('2026-11-01', 100000, 'super'), g('2026-11-02', 45000, 'super'), g('2026-11-03', 52000, 'salud'), g('2026-11-04', 40500, 'transporte')],
      pagos: [p('2026-11', 210000, '2026-11-05'), p('2026-11', 87000, null)],
    };
    const filas = filasEnQueSeFue(datos, '2026-11', categorias);
    expect(filas.map((f) => [f.clave, f.total])).toEqual([
      ['recurrentes', 210000],
      ['super', 145000],
      ['salud', 52000],
      ['transporte', 40500],
    ]);
    expect(filas[0]?.proporcion).toBe(1);
    expect(filas[1]?.proporcion).toBeCloseTo(145000 / 210000);
  });

  it('las categorías sin gasto no aparecen, tampoco recurrentes sin pagos', () => {
    const datos = { gastos: [g('2026-11-01', 1000, 'ropa')], pagos: [p('2026-11', 5000, null)] };
    expect(filasEnQueSeFue(datos, '2026-11', categorias).map((f) => f.clave)).toEqual(['ropa']);
  });

  it('a igual monto se respeta el orden de las categorías', () => {
    const datos = { gastos: [g('2026-11-01', 1000, 'transporte'), g('2026-11-01', 1000, 'salud')], pagos: [] };
    expect(filasEnQueSeFue(datos, '2026-11', categorias).map((f) => f.clave)).toEqual(['salud', 'transporte']);
  });

  it('los gastos de cada fila van del más reciente al más antiguo', () => {
    const datos = { gastos: [g('2026-11-01', 1, 'super'), g('2026-11-09', 2, 'super')], pagos: [] };
    const fila = filasEnQueSeFue(datos, '2026-11', categorias)[0];
    expect(fila?.tipo === 'categoria' && fila.gastos.map((x) => x.fecha)).toEqual(['2026-11-09', '2026-11-01']);
  });

  it('sin datos no hay filas', () => {
    expect(filasEnQueSeFue({ gastos: [], pagos: [] }, '2026-11', categorias)).toEqual([]);
  });
});

describe('filasMesAMes (RES-6)', () => {
  const datos = {
    gastos: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((m, i) => g(`${m}-05`, (i + 1) * 1000)),
    pagos: [],
  };

  it('RES-A7: con seis meses muestra los cuatro más recientes y el actual dice "hasta hoy"', () => {
    const filas = filasMesAMes(datos, '2026-11', '2026-11');
    expect(filas.map((f) => f.etiqueta)).toEqual(['Agosto', 'Septiembre', 'Octubre', 'Noviembre, hasta hoy']);
    expect(filas.map((f) => f.esActual)).toEqual([false, false, false, true]);
    expect(filas[3]?.proporcion).toBe(1);
    expect(filas[0]?.proporcion).toBe(0.5);
  });

  it('en un mes pasado termina en ese mes', () => {
    expect(filasMesAMes(datos, '2026-08', '2026-11').map((f) => f.mes)).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('salta los meses sin datos', () => {
    const conHueco = { gastos: [g('2026-07-01', 1), g('2026-09-01', 1), g('2026-11-01', 1)], pagos: [] };
    expect(filasMesAMes(conHueco, '2026-11', '2026-11').map((f) => f.mes)).toEqual(['2026-07', '2026-09', '2026-11']);
  });

  it('cruza el cambio de año', () => {
    const datosAnio = { gastos: [g('2026-11-01', 1), g('2026-12-01', 1), g('2027-01-01', 1)], pagos: [] };
    expect(filasMesAMes(datosAnio, '2027-01', '2027-01').map((f) => f.etiqueta)).toEqual([
      'Noviembre',
      'Diciembre',
      'Enero, hasta hoy',
    ]);
  });

  it('sin datos no hay filas', () => {
    expect(filasMesAMes({ gastos: [], pagos: [] }, '2026-11', '2026-11')).toEqual([]);
  });

  it('primerMesConDatos considera gastos y recurrentes pagados', () => {
    expect(primerMesConDatos({ gastos: [g('2026-09-01', 1)], pagos: [p('2026-08', 1, '2026-08-31'), p('2026-05', 1, null)] })).toBe('2026-08');
  });
});
