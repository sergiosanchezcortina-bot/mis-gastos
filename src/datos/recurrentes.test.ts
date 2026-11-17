import { describe, expect, it } from 'vitest';
import { abrirBase, leerTodo } from './db';
import {
  agregarRecurrente,
  deshacerQuitar,
  editarRecurrente,
  guardarPago,
  leerMesRecurrentes,
  quitarRecurrente,
} from './recurrentes';

let contador = 0;
const nombreNuevo = () => `rec-${Date.now()}-${contador++}`;

describe('datos de gastos recurrentes', () => {
  it('al abrir un mes crea sus filas con el último monto y las guarda', async () => {
    const db = await abrirBase(nombreNuevo());
    const { pago } = await agregarRecurrente(db, { nombre: 'Luz', diaVencimiento: 15, monto: 38000 }, '2026-10');
    await guardarPago(db, { ...pago, monto: 41000, pagado: true, fechaPago: '2026-10-31' });

    const noviembre = await leerMesRecurrentes(db, '2026-11', '2026-11');
    expect(noviembre).toHaveLength(1);
    expect(noviembre[0]?.pago).toMatchObject({ mes: '2026-11', monto: 41000, pagado: false, fechaPago: null });

    // Volver a abrir el mes no duplica filas.
    expect(await leerMesRecurrentes(db, '2026-11', '2026-11')).toHaveLength(1);
    expect((await leerTodo(db)).pagosRecurrentes).toHaveLength(2);
    db.close();
  });

  it('REC-A7: un gasto agregado en noviembre no aparece en octubre', async () => {
    const db = await abrirBase(nombreNuevo());
    await agregarRecurrente(db, { nombre: 'Netflix', diaVencimiento: null, monto: null }, '2026-11');
    expect(await leerMesRecurrentes(db, '2026-10', '2026-11')).toEqual([]);
    expect(await leerMesRecurrentes(db, '2026-11', '2026-11')).toHaveLength(1);
    db.close();
  });

  it('devuelve las filas ordenadas por vencimiento', async () => {
    const db = await abrirBase(nombreNuevo());
    await agregarRecurrente(db, { nombre: 'Netflix', diaVencimiento: null, monto: 1 }, '2026-11');
    await agregarRecurrente(db, { nombre: 'Gas', diaVencimiento: 25, monto: 1 }, '2026-11');
    await agregarRecurrente(db, { nombre: 'Agua', diaVencimiento: 20, monto: 1 }, '2026-11');
    const filas = await leerMesRecurrentes(db, '2026-11', '2026-11');
    expect(filas.map((f) => f.gasto.nombre)).toEqual(['Agua', 'Gas', 'Netflix']);
    db.close();
  });

  it('editar cambia el nombre en todos los meses', async () => {
    const db = await abrirBase(nombreNuevo());
    const { gasto } = await agregarRecurrente(db, { nombre: 'Gas', diaVencimiento: 25, monto: 1 }, '2026-10');
    await editarRecurrente(db, gasto, { nombre: 'Gas de cañería', diaVencimiento: 5 });
    const octubre = await leerMesRecurrentes(db, '2026-10', '2026-11');
    expect(octubre[0]?.gasto).toMatchObject({ nombre: 'Gas de cañería', diaVencimiento: 5 });
    db.close();
  });

  it('REC-A8: quitar y deshacer deja todo como estaba', async () => {
    const db = await abrirBase(nombreNuevo());
    const { gasto, pago } = await agregarRecurrente(db, { nombre: 'Gas', diaVencimiento: 25, monto: 27000 }, '2026-10');
    await guardarPago(db, { ...pago, pagado: true, fechaPago: '2026-10-31' });
    await leerMesRecurrentes(db, '2026-11', '2026-11');
    const antes = await leerTodo(db);

    const deshacer = await quitarRecurrente(db, gasto.id, '2026-11');
    expect(await leerMesRecurrentes(db, '2026-11', '2026-11')).toEqual([]);
    expect(await leerMesRecurrentes(db, '2026-10', '2026-11')).toHaveLength(1);

    await deshacerQuitar(db, deshacer);
    const despues = await leerTodo(db);
    expect(despues.gastosRecurrentes).toEqual(antes.gastosRecurrentes);
    expect(despues.pagosRecurrentes.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      antes.pagosRecurrentes.sort((a, b) => a.id.localeCompare(b.id)),
    );
    db.close();
  });

  it('quitar un gasto pagado ese mes lo conserva ese mes', async () => {
    const db = await abrirBase(nombreNuevo());
    const { gasto, pago } = await agregarRecurrente(db, { nombre: 'Gas', diaVencimiento: 25, monto: 27000 }, '2026-11');
    await guardarPago(db, { ...pago, pagado: true, fechaPago: '2026-11-17' });
    await quitarRecurrente(db, gasto.id, '2026-11');
    expect(await leerMesRecurrentes(db, '2026-11', '2026-12')).toHaveLength(1);
    expect(await leerMesRecurrentes(db, '2026-12', '2026-12')).toEqual([]);
    db.close();
  });
});
