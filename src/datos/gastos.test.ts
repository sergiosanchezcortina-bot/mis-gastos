import { describe, expect, it } from 'vitest';
import { abrirBase } from './db';
import { eliminarGasto, guardarGasto, leerGastosDelMes, nuevoGasto } from './gastos';

let contador = 0;
const nombreNuevo = () => `gastos-${Date.now()}-${contador++}`;

describe('datos de gastos no recurrentes', () => {
  it('lee solo los gastos del mes, del más reciente al más antiguo', async () => {
    const db = await abrirBase(nombreNuevo());
    for (const fecha of ['2026-10-31', '2026-11-01', '2026-11-30', '2026-11-15', '2026-12-01']) {
      await guardarGasto(db, nuevoGasto({ monto: 1000, fecha, categoriaId: 'c' }, `${fecha}T10:00:00`));
    }
    const noviembre = await leerGastosDelMes(db, '2026-11');
    expect(noviembre.map((g) => g.fecha)).toEqual(['2026-11-30', '2026-11-15', '2026-11-01']);
    db.close();
  });

  it('NOR-A6: eliminar y volver a guardar deja el mismo gasto', async () => {
    const db = await abrirBase(nombreNuevo());
    const gasto = nuevoGasto({ monto: 23500, fecha: '2026-11-16', categoriaId: 'c' }, '2026-11-16T10:00:00');
    await guardarGasto(db, gasto);
    await eliminarGasto(db, gasto.id);
    expect(await leerGastosDelMes(db, '2026-11')).toEqual([]);
    await guardarGasto(db, gasto);
    expect(await leerGastosDelMes(db, '2026-11')).toEqual([gasto]);
    db.close();
  });

  it('un gasto nuevo es manual y sin datos de cartola', () => {
    expect(nuevoGasto({ monto: 1, fecha: '2026-11-16', categoriaId: 'c' }, 'x')).toMatchObject({
      origen: 'manual',
      glosa: null,
      movimientoId: null,
      creadoEn: 'x',
      actualizadoEn: 'x',
    });
  });
});
