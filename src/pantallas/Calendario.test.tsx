/**
 * Criterios F8-A6 a F8-A8 (brief, fase 8). Hoy es miércoles 18 de noviembre de 2026.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { abrirBase, leerTodo, reemplazarTodo } from '../datos/db';
import { nuevoGasto } from '../datos/gastos';
import type { GastoRecurrente, PagoRecurrente } from '../dominio/tipos';

const HOY = '2026-11-18';
let contador = 0;

async function abrirCalendario() {
  const db = await abrirBase(`calendario-${Date.now()}-${contador++}`);
  const datos = await leerTodo(db);
  const super_ = datos.categorias.find((c) => c.nombre === 'Supermercado')!.id;
  const plantilla = (id: string, dia: number): GastoRecurrente => ({
    id,
    nombre: id,
    diaVencimiento: dia,
    desde: '2026-11',
    hasta: null,
    palabrasClave: [],
    creadoEn: '',
    cadaMeses: 1,
    ancla: '2026-11',
  });
  const pago = (id: string, monto: number, fechaPago: string | null): PagoRecurrente => ({
    id: `p-${id}`,
    gastoRecurrenteId: id,
    mes: '2026-11',
    monto,
    pagado: fechaPago !== null,
    fechaPago,
    origen: 'manual',
    movimientoId: null,
  });
  await reemplazarTodo(db, {
    ...datos,
    gastosRecurrentes: [plantilla('Gastos comunes', 5), plantilla('Gas', 25)],
    pagosRecurrentes: [pago('Gastos comunes', 120000, '2026-11-05'), pago('Gas', 27000, null)],
    gastos: [
      nuevoGasto({ monto: 20000, fecha: '2026-11-03', categoriaId: super_ }, '2026-11-03T10:00:00'),
      nuevoGasto({ monto: 45000, fecha: '2026-11-28', categoriaId: super_, porHacer: true, descripcion: 'Regalo' }, '2026-11-10T10:00:00'),
    ],
  });
  const usuario = userEvent.setup();
  render(<App db={db} obtenerHoy={() => HOY} />);
  await usuario.click(screen.getByRole('button', { name: 'Calendario' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Calendario de noviembre' })).toBeInTheDocument());
  return { db, usuario };
}

describe('F8-A6: cómo terminaría el mes', () => {
  it('muestra el total estimado y los tres tramos que lo suman', async () => {
    await abrirCalendario();
    const bloque = screen.getByRole('region', { name: 'Este mes terminarías en' });
    expect(bloque).toHaveTextContent('$212.000');
    expect(bloque).toHaveTextContent('Ya gastado$140.000');
    expect(bloque).toHaveTextContent('Recurrentes por pagar$27.000');
    expect(bloque).toHaveTextContent('Por hacer$45.000');
  });
});

describe('CAL-2 y CAL-3: el calendario', () => {
  it('parte con hoy elegido y cada día se puede abrir', async () => {
    const { usuario } = await abrirCalendario();
    const hoy = screen.getByRole('button', { name: /^Hoy, miércoles 18/ });
    expect(hoy).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Hoy, miércoles 18' })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'sábado 28. 1 pendiente, $45.000' }));
    expect(screen.getByRole('heading', { name: 'Sábado 28' })).toBeInTheDocument();
    const lista = screen.getByRole('heading', { name: 'Sábado 28' }).parentElement!;
    expect(lista).toHaveTextContent('Por hacer');
    expect(lista).toHaveTextContent('Regalo');
  });
});

describe('F8-A7: marcar pagado desde el calendario', () => {
  it('queda pagado en el calendario y en Gastos recurrentes', async () => {
    const { usuario } = await abrirCalendario();
    await usuario.click(screen.getByRole('button', { name: 'miércoles 25. 1 pendiente, $27.000' }));
    await usuario.click(screen.getByRole('button', { name: 'Marcar pagado: Gas' }));

    // Se paga hoy: pasa al día 18 y sube lo gastado.
    await waitFor(() => expect(screen.getByRole('region', { name: 'Este mes terminarías en' })).toHaveTextContent('Ya gastado$167.000'));
    expect(screen.getByRole('button', { name: /^Hoy, miércoles 18\. 1 hecho, \$27\.000/ })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Gastos recurrentes' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Gas' })).toBeChecked());
  });
});

describe('F8-A8: acumulado por semana', () => {
  it('una fila por semana; la última muestra el total estimado', async () => {
    await abrirCalendario();
    const bloque = screen.getByRole('region', { name: 'Cómo se acumula tu gasto' });
    const semanas = within(bloque).getAllByRole('listitem');
    expect(semanas).toHaveLength(6);
    expect(semanas[0]).toHaveTextContent('Del 1 al 1');
    expect(semanas.at(-1)).toHaveTextContent('Del 30 al 30$212.000');
    expect(semanas[3]).toHaveTextContent('$140.000 gastado');
  });
});
