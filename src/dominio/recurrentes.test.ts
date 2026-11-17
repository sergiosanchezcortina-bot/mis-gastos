import { describe, expect, it } from 'vitest';
import type { GastoRecurrente, PagoRecurrente } from './tipos';
import {
  avancePagados,
  compararPorVencimiento,
  diaVencimientoEn,
  esAlerta,
  estadoFila,
  fechaPagoAlMarcar,
  filasQueFaltan,
  marcarPagado,
  planQuitar,
  textoCantidadRecurrentes,
  textoEstado,
  textoPagados,
  textoPendientes,
  totalesRecurrentes,
  ultimoMontoConocido,
  validarFormulario,
  vigenteEn,
} from './recurrentes';

function gasto(parcial: Partial<GastoRecurrente> & { id: string }): GastoRecurrente {
  return {
    nombre: parcial.id,
    diaVencimiento: null,
    desde: '2026-01',
    hasta: null,
    palabrasClave: [],
    creadoEn: '2026-01-01T00:00:00',
    ...parcial,
  };
}

function pago(parcial: Partial<PagoRecurrente> & { gastoRecurrenteId: string; mes: string }): PagoRecurrente {
  return {
    id: `${parcial.gastoRecurrenteId}-${parcial.mes}`,
    monto: 10000,
    pagado: false,
    fechaPago: null,
    origen: 'manual',
    movimientoId: null,
    ...parcial,
  };
}

describe('vigenteEn', () => {
  const g = gasto({ id: 'gas', desde: '2026-09', hasta: '2026-11' });

  it('aplica entre desde y hasta, ambos incluidos', () => {
    expect(vigenteEn(g, '2026-08')).toBe(false);
    expect(vigenteEn(g, '2026-09')).toBe(true);
    expect(vigenteEn(g, '2026-11')).toBe(true);
    expect(vigenteEn(g, '2026-12')).toBe(false);
  });

  it('sin hasta sigue vigente', () => {
    expect(vigenteEn(gasto({ id: 'x', desde: '2026-11' }), '2030-01')).toBe(true);
  });
});

describe('diaVencimientoEn (REC-A11)', () => {
  it('el 31 vence el 30 en un mes de 30 días', () => {
    expect(diaVencimientoEn(31, '2026-11')).toBe(30);
  });

  it('el 31 vence el 28 en febrero no bisiesto y el 29 en bisiesto', () => {
    expect(diaVencimientoEn(31, '2027-02')).toBe(28);
    expect(diaVencimientoEn(30, '2028-02')).toBe(29);
  });

  it('un día que existe no cambia', () => {
    expect(diaVencimientoEn(20, '2026-11')).toBe(20);
    expect(diaVencimientoEn(31, '2026-12')).toBe(31);
  });

  it('sin día sigue sin día', () => {
    expect(diaVencimientoEn(null, '2026-11')).toBeNull();
  });
});

describe('ultimoMontoConocido', () => {
  const pagos = [
    pago({ gastoRecurrenteId: 'luz', mes: '2026-08', monto: 30000 }),
    pago({ gastoRecurrenteId: 'luz', mes: '2026-09', monto: 35000 }),
    pago({ gastoRecurrenteId: 'luz', mes: '2026-10', monto: null }),
    pago({ gastoRecurrenteId: 'agua', mes: '2026-10', monto: 18000 }),
    pago({ gastoRecurrenteId: 'luz', mes: '2026-12', monto: 99000 }),
  ];

  it('toma el más reciente no vacío anterior al mes', () => {
    expect(ultimoMontoConocido('luz', pagos, '2026-11')).toBe(35000);
  });

  it('no mira el mismo mes ni meses posteriores', () => {
    expect(ultimoMontoConocido('luz', pagos, '2026-09')).toBe(30000);
  });

  it('sin historia es null', () => {
    expect(ultimoMontoConocido('gas', pagos, '2026-11')).toBeNull();
  });
});

describe('filasQueFaltan (REC-7, REC-A1)', () => {
  const gastos = [
    gasto({ id: 'luz', desde: '2026-08' }),
    gasto({ id: 'agua', desde: '2026-08' }),
    gasto({ id: 'netflix', desde: '2026-11' }),
    gasto({ id: 'gas', desde: '2026-08', hasta: '2026-10' }),
  ];
  const pagos = [
    pago({ gastoRecurrenteId: 'luz', mes: '2026-10', monto: 38000, pagado: true, fechaPago: '2026-10-15' }),
    pago({ gastoRecurrenteId: 'agua', mes: '2026-10', monto: 18000, pagado: true, fechaPago: '2026-10-20' }),
    pago({ gastoRecurrenteId: 'agua', mes: '2026-11', monto: 19000 }),
  ];
  let n = 0;
  const crearId = () => `nuevo-${n++}`;

  it('crea una fila sin marcar por cada gasto vigente sin fila, con su último monto', () => {
    const nuevas = filasQueFaltan(gastos, pagos, '2026-11', '2026-11', crearId);
    expect(nuevas.map((p) => [p.gastoRecurrenteId, p.monto, p.pagado, p.fechaPago])).toEqual([
      ['luz', 38000, false, null],
      ['netflix', null, false, null],
    ]);
    expect(nuevas.every((p) => p.mes === '2026-11')).toBe(true);
  });

  it('no crea filas para gastos que dejaron de aplicar', () => {
    const nuevas = filasQueFaltan(gastos, pagos, '2026-11', '2026-11', crearId);
    expect(nuevas.some((p) => p.gastoRecurrenteId === 'gas')).toBe(false);
  });

  it('no crea filas antes de que el gasto exista', () => {
    const nuevas = filasQueFaltan(gastos, pagos, '2026-10', '2026-11', crearId);
    expect(nuevas.map((p) => p.gastoRecurrenteId)).toEqual(['gas']);
  });

  it('nunca crea filas para meses futuros', () => {
    expect(filasQueFaltan(gastos, pagos, '2026-12', '2026-11', crearId)).toEqual([]);
  });
});

describe('estadoFila (REC-6)', () => {
  const hoy = '2026-11-21';

  it('pagado', () => {
    const e = estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-11', pagado: true }), 20, hoy);
    expect(textoEstado(e)).toBe('Pagado');
    expect(esAlerta(e)).toBe(false);
  });

  it('sin pagar y aún no vence', () => {
    const e = estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-11' }), 25, hoy);
    expect(textoEstado(e)).toBe('Vence el 25');
    expect(esAlerta(e)).toBe(false);
  });

  it('el mismo día del vencimiento todavía no vence', () => {
    const e = estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-11' }), 21, hoy);
    expect(textoEstado(e)).toBe('Vence el 21');
  });

  it('REC-A6: hoy es 21 y vence el 20, sin pagar: venció, con alerta', () => {
    const e = estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-11' }), 20, hoy);
    expect(textoEstado(e)).toBe('Venció el 20');
    expect(esAlerta(e)).toBe(true);
  });

  it('en un mes que ya terminó, todo lo no pagado está vencido', () => {
    const e = estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-10' }), 28, hoy);
    expect(textoEstado(e)).toBe('Venció el 28');
  });

  it('el vencimiento usa el último día del mes si el día no existe', () => {
    const e = estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-11' }), 31, '2026-11-17');
    expect(textoEstado(e)).toBe('Vence el 30');
  });

  it('sin día de vencimiento: por pagar, aunque el mes haya terminado', () => {
    expect(textoEstado(estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-11' }), null, hoy))).toBe('Por pagar');
    expect(textoEstado(estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-09' }), null, hoy))).toBe('Por pagar');
  });

  it('REC-A5: sin monto, "Falta el monto" con alerta', () => {
    const e = estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-11', monto: null }), 25, hoy);
    expect(textoEstado(e)).toBe('Falta el monto');
    expect(esAlerta(e)).toBe(true);
  });

  it('"Falta el monto" gana aunque esté pagado', () => {
    const e = estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-11', monto: null, pagado: true }), 5, hoy);
    expect(textoEstado(e)).toBe('Falta el monto');
  });

  it('un monto de $0 no es lo mismo que sin monto', () => {
    const e = estadoFila(pago({ gastoRecurrenteId: 'a', mes: '2026-11', monto: 0, pagado: true }), 5, hoy);
    expect(textoEstado(e)).toBe('Pagado');
  });
});

describe('compararPorVencimiento (REC-3)', () => {
  it('ordena por día, luego por nombre, y deja al final los sin día', () => {
    const lista = [
      { nombre: 'Seguro', diaVencimiento: null },
      { nombre: 'Gas', diaVencimiento: 25 },
      { nombre: 'Agua', diaVencimiento: 20 },
      { nombre: 'Netflix', diaVencimiento: null },
      { nombre: 'Celular', diaVencimiento: 5 },
      { nombre: 'Arriendo', diaVencimiento: 5 },
    ];
    expect([...lista].sort(compararPorVencimiento).map((g) => g.nombre)).toEqual([
      'Arriendo',
      'Celular',
      'Agua',
      'Gas',
      'Netflix',
      'Seguro',
    ]);
  });

  it('el orden de nombres ignora mayúsculas y tildes', () => {
    const lista = [
      { nombre: 'luz', diaVencimiento: 1 },
      { nombre: 'Árbol', diaVencimiento: 1 },
      { nombre: 'Banco', diaVencimiento: 1 },
    ];
    expect([...lista].sort(compararPorVencimiento).map((g) => g.nombre)).toEqual(['Árbol', 'Banco', 'luz']);
  });
});

describe('totalesRecurrentes (REC-1)', () => {
  const pagos = [
    pago({ gastoRecurrenteId: 'a', mes: '2026-11', monto: 120000, pagado: true }),
    pago({ gastoRecurrenteId: 'b', mes: '2026-11', monto: 52000, pagado: true }),
    pago({ gastoRecurrenteId: 'c', mes: '2026-11', monto: 38000, pagado: true }),
    pago({ gastoRecurrenteId: 'd', mes: '2026-11', monto: 18000 }),
    pago({ gastoRecurrenteId: 'e', mes: '2026-11', monto: 27000 }),
    pago({ gastoRecurrenteId: 'f', mes: '2026-11', monto: 42000 }),
  ];

  it('coincide con la pantalla de referencia', () => {
    expect(totalesRecurrentes(pagos)).toEqual({
      total: 297000,
      pagado: 210000,
      porPagar: 87000,
      cantidad: 6,
      pagados: 3,
      pendientes: 3,
    });
  });

  it('REC-A2: marcar una fila de $18.000 sube Pagado y baja Por pagar en $18.000', () => {
    const antes = totalesRecurrentes(pagos);
    const despues = totalesRecurrentes(pagos.map((p) => (p.gastoRecurrenteId === 'd' ? { ...p, pagado: true } : p)));
    expect(despues.pagado - antes.pagado).toBe(18000);
    expect(antes.porPagar - despues.porPagar).toBe(18000);
    expect(despues.pagados).toBe(antes.pagados + 1);
    expect(despues.total).toBe(antes.total);
  });

  it('REC-A5: un monto vacío cuenta como 0', () => {
    const t = totalesRecurrentes([pago({ gastoRecurrenteId: 'a', mes: '2026-11', monto: null }), pagos[0]!]);
    expect(t.total).toBe(120000);
    expect(t.porPagar).toBe(0);
    expect(t.pendientes).toBe(1);
  });

  it('REC-A9: todo pagado deja Por pagar en 0', () => {
    const t = totalesRecurrentes(pagos.map((p) => ({ ...p, pagado: true })));
    expect(t.porPagar).toBe(0);
    expect(t.pendientes).toBe(0);
    expect(textoPendientes(t.pendientes)).toBe('Todo pagado');
  });

  it('sin filas todo es cero', () => {
    expect(totalesRecurrentes([])).toEqual({ total: 0, pagado: 0, porPagar: 0, cantidad: 0, pagados: 0, pendientes: 0 });
  });
});

describe('textos de las tarjetas', () => {
  it('cantidad en singular y plural', () => {
    expect(textoCantidadRecurrentes(1)).toBe('1 gasto recurrente');
    expect(textoCantidadRecurrentes(6)).toBe('6 gastos recurrentes');
  });

  it('pagados', () => {
    expect(textoPagados(3, 6)).toBe('3 de 6 pagados');
  });

  it('pendientes en singular y plural', () => {
    expect(textoPendientes(1)).toBe('Falta 1');
    expect(textoPendientes(3)).toBe('Faltan 3');
  });

  it('avance de la barra', () => {
    expect(avancePagados(3, 6)).toBe(0.5);
    expect(avancePagados(0, 0)).toBe(0);
  });
});

describe('fecha de pago', () => {
  it('en el mes actual es hoy', () => {
    expect(fechaPagoAlMarcar('2026-11', '2026-11-17')).toBe('2026-11-17');
  });

  it('en un mes pasado es el último día de ese mes', () => {
    expect(fechaPagoAlMarcar('2026-09', '2026-11-17')).toBe('2026-09-30');
    expect(fechaPagoAlMarcar('2026-12', '2027-01-03')).toBe('2026-12-31');
  });

  it('al desmarcar se borra la fecha y se conserva el monto', () => {
    const marcado = marcarPagado(pago({ gastoRecurrenteId: 'a', mes: '2026-11', monto: 18000 }), true, '2026-11-17');
    expect(marcado).toMatchObject({ pagado: true, fechaPago: '2026-11-17', monto: 18000 });
    expect(marcarPagado(marcado, false, '2026-11-17')).toMatchObject({ pagado: false, fechaPago: null, monto: 18000 });
  });
});

describe('planQuitar (REC-9)', () => {
  it('REC-A8: sin pagar en noviembre, deja de aplicar desde noviembre y se borra esa fila', () => {
    const pagos = [
      pago({ gastoRecurrenteId: 'gas', mes: '2026-10', pagado: true }),
      pago({ gastoRecurrenteId: 'gas', mes: '2026-11' }),
    ];
    expect(planQuitar(pagos, '2026-11')).toEqual({ hasta: '2026-10', idsABorrar: ['gas-2026-11'] });
  });

  it('si ese mes ya estaba pagado, se conserva y deja de aplicar desde el siguiente', () => {
    const pagos = [pago({ gastoRecurrenteId: 'gas', mes: '2026-11', pagado: true })];
    expect(planQuitar(pagos, '2026-11')).toEqual({ hasta: '2026-11', idsABorrar: [] });
  });

  it('en un mes pasado se borran las filas sin pagar de los meses siguientes', () => {
    const pagos = [
      pago({ gastoRecurrenteId: 'gas', mes: '2026-09', pagado: true }),
      pago({ gastoRecurrenteId: 'gas', mes: '2026-10' }),
      pago({ gastoRecurrenteId: 'gas', mes: '2026-11' }),
    ];
    expect(planQuitar(pagos, '2026-10')).toEqual({
      hasta: '2026-09',
      idsABorrar: ['gas-2026-10', 'gas-2026-11'],
    });
  });

  it('en un mes pasado, si un mes siguiente está pagado, se conserva hasta ese mes', () => {
    const pagos = [
      pago({ gastoRecurrenteId: 'gas', mes: '2026-09' }),
      pago({ gastoRecurrenteId: 'gas', mes: '2026-10', pagado: true }),
      pago({ gastoRecurrenteId: 'gas', mes: '2026-11' }),
    ];
    expect(planQuitar(pagos, '2026-09')).toEqual({ hasta: '2026-10', idsABorrar: ['gas-2026-11'] });
  });

  it('funciona al cruzar el año', () => {
    const pagos = [pago({ gastoRecurrenteId: 'gas', mes: '2027-01' })];
    expect(planQuitar(pagos, '2027-01')).toEqual({ hasta: '2026-12', idsABorrar: ['gas-2027-01'] });
  });
});

describe('validarFormulario (REC-8, REC-A7)', () => {
  it('el nombre es obligatorio', () => {
    expect(validarFormulario({ nombre: '   ', dia: '' }).errores).toEqual({ nombre: 'Escribe un nombre' });
  });

  it('limpia espacios del nombre', () => {
    expect(validarFormulario({ nombre: '  Netflix   plan ', dia: '' }).nombre).toBe('Netflix plan');
  });

  it('el día es opcional', () => {
    expect(validarFormulario({ nombre: 'Netflix', dia: '' })).toEqual({ errores: {}, nombre: 'Netflix', dia: null });
  });

  it('acepta días del 1 al 31', () => {
    expect(validarFormulario({ nombre: 'a', dia: '1' }).dia).toBe(1);
    expect(validarFormulario({ nombre: 'a', dia: '31' }).dia).toBe(31);
  });

  it.each(['0', '32', 'abc', '3.5', '-1', '100'])('rechaza "%s" como día', (dia) => {
    expect(validarFormulario({ nombre: 'a', dia }).errores).toEqual({ dia: 'Escribe un día del 1 al 31' });
  });
});
