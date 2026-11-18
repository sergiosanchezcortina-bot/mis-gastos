import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { abrirBase, guardarGasto, reemplazarTodo } from './datos/db';
import { crearDatosDeEjemplo } from './datos/ejemplo';

let contador = 0;
const nombreNuevo = () => `app-${Date.now()}-${contador++}`;
const hoy = () => '2026-11-17';

async function abrirApp(datos: 'vacio' | 'ejemplo' = 'vacio') {
  const db = await abrirBase(nombreNuevo());
  if (datos === 'ejemplo') await reemplazarTodo(db, crearDatosDeEjemplo('2026-11-17'));
  const usuario = userEvent.setup();
  render(<App db={db} obtenerHoy={hoy} />);
  return { db, usuario };
}

const pestana = (nombre: string) => screen.getByRole('button', { name: nombre });

describe('navegación', () => {
  it('abre en Resumen con el mes actual', async () => {
    await abrirApp();
    expect(pestana('Resumen')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 1, name: 'Noviembre 2026' })).toBeInTheDocument();
  });

  it('muestra las cuatro secciones sin Cartola', async () => {
    await abrirApp();
    const nav = screen.getByRole('navigation', { name: 'Secciones de la app' });
    expect(nav).toHaveTextContent('Resumen');
    expect(nav).toHaveTextContent('Gastos recurrentes');
    expect(nav).toHaveTextContent('Gastos no recurrentes');
    expect(nav).toHaveTextContent('Ajustes');
    expect(nav).not.toHaveTextContent('Cartola');
  });

  it('cambia de pestaña con un clic y marca la activa', async () => {
    const { usuario } = await abrirApp();
    await usuario.click(pestana('Gastos recurrentes'));
    expect(screen.getByRole('heading', { level: 1, name: 'Gastos recurrentes' })).toBeInTheDocument();
    expect(pestana('Gastos recurrentes')).toHaveAttribute('aria-current', 'page');
    expect(pestana('Resumen')).not.toHaveAttribute('aria-current');

    await usuario.click(pestana('Gastos no recurrentes'));
    expect(screen.getByRole('heading', { level: 1, name: 'Gastos no recurrentes' })).toBeInTheDocument();

    await usuario.click(pestana('Ajustes'));
    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mes anterior' })).not.toBeInTheDocument();
  });

  it('T-4: se navega solo con teclado', async () => {
    const { usuario } = await abrirApp();
    await usuario.tab();
    expect(pestana('Resumen')).toHaveFocus();
    await usuario.tab();
    expect(pestana('Calendario')).toHaveFocus();
    await usuario.tab();
    expect(pestana('Gastos recurrentes')).toHaveFocus();
    await usuario.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 1, name: 'Gastos recurrentes' })).toBeInTheDocument();
    await usuario.tab();
    expect(pestana('Gastos no recurrentes')).toHaveFocus();
    await usuario.keyboard(' ');
    expect(screen.getByRole('heading', { level: 1, name: 'Gastos no recurrentes' })).toBeInTheDocument();
  });
});

describe('selector de mes', () => {
  it('sin datos, los dos botones están desactivados', async () => {
    await abrirApp();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
  });

  it('con datos, retrocede hasta el primer mes con datos y no pasa del mes actual', async () => {
    const { usuario } = await abrirApp('ejemplo');
    const anterior = screen.getByRole('button', { name: 'Mes anterior' });
    const siguiente = screen.getByRole('button', { name: 'Mes siguiente' });
    await waitFor(() => expect(anterior).toBeEnabled());
    expect(siguiente).toBeDisabled();

    for (const nombre of ['Octubre 2026', 'Septiembre 2026', 'Agosto 2026', 'Julio 2026', 'Junio 2026']) {
      await usuario.click(anterior);
      expect(screen.getByRole('heading', { level: 1, name: nombre })).toBeInTheDocument();
    }
    expect(anterior).toBeDisabled();
    expect(siguiente).toBeEnabled();
  });

  it('el mes es el mismo en todas las pestañas', async () => {
    const { usuario } = await abrirApp('ejemplo');
    const anterior = screen.getByRole('button', { name: 'Mes anterior' });
    await waitFor(() => expect(anterior).toBeEnabled());
    await usuario.click(anterior);
    await usuario.click(pestana('Gastos recurrentes'));
    expect(screen.getByText('Octubre 2026')).toBeInTheDocument();
    await usuario.click(pestana('Gastos no recurrentes'));
    expect(screen.getByText('Octubre 2026')).toBeInTheDocument();
  });

  it('un gasto de un mes anterior habilita volver a ese mes', async () => {
    const { db } = await abrirApp();
    await guardarGasto(db, {
      id: 'g1',
      fecha: '2026-10-28',
      monto: 5000,
      categoriaId: 'x',
      origen: 'manual',
      descripcion: null,
      porHacer: false,
      glosa: null,
      movimientoId: null,
      creadoEn: '2026-11-17T10:00:00',
      actualizadoEn: '2026-11-17T10:00:00',
    });
    // Al volver a abrir la app se recalcula el límite.
    render(<App db={db} obtenerHoy={hoy} />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Mes anterior' })[1]).toBeEnabled());
  });
});
