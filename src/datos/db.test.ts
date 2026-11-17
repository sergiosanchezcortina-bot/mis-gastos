import { describe, expect, it } from 'vitest';
import type { Gasto, PagoRecurrente } from '../dominio/tipos';
import {
  abrirBase,
  guardarGasto,
  leerAjustes,
  leerCategorias,
  leerGastos,
  leerTodo,
  primerMesConDatos,
  reemplazarTodo,
  vaciarTodo,
} from './db';
import { crearDatosDeEjemplo } from './ejemplo';

let contador = 0;
const nombreNuevo = () => `prueba-${Date.now()}-${contador++}`;

function gasto(fecha: string, monto = 1000): Gasto {
  return {
    id: crypto.randomUUID(),
    fecha,
    monto,
    categoriaId: 'x',
    origen: 'manual',
    glosa: null,
    movimientoId: null,
    creadoEn: '2026-11-17T10:00:00',
    actualizadoEn: '2026-11-17T10:00:00',
  };
}

function pago(mes: string, pagado: boolean): PagoRecurrente {
  return {
    id: crypto.randomUUID(),
    gastoRecurrenteId: 'r',
    mes,
    monto: 10000,
    pagado,
    fechaPago: pagado ? `${mes}-10` : null,
    origen: 'manual',
    movimientoId: null,
  };
}

describe('base de datos', () => {
  it('parte con las ocho categorías iniciales, en orden y visibles', async () => {
    const db = await abrirBase(nombreNuevo());
    const categorias = await leerCategorias(db);
    expect(categorias.map((c) => c.nombre)).toEqual([
      'Supermercado',
      'Salud',
      'Transporte',
      'Casa',
      'Salidas',
      'Familia',
      'Ropa',
      'Otro',
    ]);
    expect(categorias.every((c) => c.visible)).toBe(true);
    db.close();
  });

  it('parte con versión de esquema 1 y sin respaldo', async () => {
    const db = await abrirBase(nombreNuevo());
    expect(await leerAjustes(db)).toEqual({ versionEsquema: 1, ultimoRespaldo: null });
    db.close();
  });

  it('T-5: los datos siguen ahí al cerrar y volver a abrir', async () => {
    const nombre = nombreNuevo();
    const db = await abrirBase(nombre);
    const anotado = gasto('2026-11-16', 12500);
    await guardarGasto(db, anotado);
    const categoriasAntes = await leerCategorias(db);
    db.close();

    const reabierta = await abrirBase(nombre);
    expect(await leerGastos(reabierta)).toEqual([anotado]);
    // Reabrir no vuelve a crear las categorías iniciales.
    expect(await leerCategorias(reabierta)).toEqual(categoriasAntes);
    reabierta.close();
  });
});

describe('primerMesConDatos', () => {
  it('sin datos es null', async () => {
    const db = await abrirBase(nombreNuevo());
    expect(await primerMesConDatos(db)).toBeNull();
    db.close();
  });

  it('toma el gasto más antiguo', async () => {
    const db = await abrirBase(nombreNuevo());
    await guardarGasto(db, gasto('2026-10-03'));
    await guardarGasto(db, gasto('2026-08-30'));
    await guardarGasto(db, gasto('2026-11-01'));
    expect(await primerMesConDatos(db)).toBe('2026-08');
    db.close();
  });

  it('las filas de recurrentes sin pagar no cuentan como datos', async () => {
    const db = await abrirBase(nombreNuevo());
    const datos = await leerTodo(db);
    await reemplazarTodo(db, {
      ...datos,
      pagosRecurrentes: [pago('2026-05', false), pago('2026-07', true), pago('2026-06', false)],
      gastos: [gasto('2026-09-15')],
    });
    expect(await primerMesConDatos(db)).toBe('2026-07');
    db.close();
  });

  it('funciona al cruzar el año', async () => {
    const db = await abrirBase(nombreNuevo());
    await guardarGasto(db, gasto('2027-01-02'));
    await guardarGasto(db, gasto('2026-12-31'));
    expect(await primerMesConDatos(db)).toBe('2026-12');
    db.close();
  });
});

describe('reemplazarTodo y vaciarTodo', () => {
  it('reemplaza todo lo que había', async () => {
    const db = await abrirBase(nombreNuevo());
    await guardarGasto(db, gasto('2026-11-01'));
    const nuevos = crearDatosDeEjemplo('2026-11-17');
    await reemplazarTodo(db, nuevos);
    const leidos = await leerTodo(db);
    expect(leidos.gastos).toHaveLength(nuevos.gastos.length);
    expect(leidos.categorias).toHaveLength(8);
    expect(leidos.gastosRecurrentes).toHaveLength(6);
    db.close();
  });

  it('si falla, no cambia nada', async () => {
    const db = await abrirBase(nombreNuevo());
    const original = gasto('2026-11-01');
    await guardarGasto(db, original);
    const datos = await leerTodo(db);
    // Un gasto sin id no se puede guardar: la transacción completa debe fallar.
    const malo = { ...gasto('2026-11-02'), id: undefined } as unknown as Gasto;
    await expect(reemplazarTodo(db, { ...datos, gastos: [gasto('2026-11-03'), malo] })).rejects.toThrow();
    expect(await leerGastos(db)).toEqual([original]);
    db.close();
  });

  it('vaciar deja solo categorías iniciales', async () => {
    const db = await abrirBase(nombreNuevo());
    await reemplazarTodo(db, crearDatosDeEjemplo('2026-11-17'));
    await vaciarTodo(db);
    const leidos = await leerTodo(db);
    expect(leidos.gastos).toEqual([]);
    expect(leidos.pagosRecurrentes).toEqual([]);
    expect(leidos.categorias).toHaveLength(8);
    expect(await primerMesConDatos(db)).toBeNull();
    db.close();
  });
});

describe('datos de ejemplo', () => {
  const datos = crearDatosDeEjemplo('2026-11-17');

  it('cubren seis meses, de junio a noviembre', () => {
    const meses = new Set(datos.gastos.map((g) => g.fecha.slice(0, 7)));
    expect([...meses].sort()).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
  });

  it('no tienen gastos futuros', () => {
    expect(datos.gastos.every((g) => g.fecha <= '2026-11-17')).toBe(true);
  });

  it('no crean filas de recurrentes para meses futuros', () => {
    expect(datos.pagosRecurrentes.every((p) => p.mes <= '2026-11')).toBe(true);
  });

  it('este mes tienen pagados solo los recurrentes que ya vencieron', () => {
    const pagadosEsteMes = datos.pagosRecurrentes.filter((p) => p.mes === '2026-11' && p.pagado);
    expect(pagadosEsteMes).toHaveLength(3); // vencen el 5, 10 y 15
  });

  it('todos los montos son enteros positivos', () => {
    expect(datos.gastos.every((g) => Number.isInteger(g.monto) && g.monto > 0)).toBe(true);
    expect(datos.pagosRecurrentes.every((p) => p.monto !== null && Number.isInteger(p.monto))).toBe(true);
  });

  it('cruzan bien el cambio de año', () => {
    const enero = crearDatosDeEjemplo('2027-01-10');
    const meses = new Set(enero.pagosRecurrentes.map((p) => p.mes));
    expect([...meses].sort()).toEqual(['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']);
  });
});
