/**
 * Criterios de aceptación NOR-A1 a NOR-A10 (brief, fase 2).
 * Hoy es lunes 16 de noviembre de 2026, como en la pantalla de referencia.
 */
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { abrirBase, leerCategorias, leerGastos, type BaseDeDatos } from '../datos/db';
import { guardarGasto, nuevoGasto } from '../datos/gastos';

const HOY = '2026-11-16';
let contador = 0;

async function abrirPantalla(gastosIniciales: Array<{ fecha: string; monto: number; categoria?: string }> = []) {
  const db: BaseDeDatos = await abrirBase(`pantalla-nor-${Date.now()}-${contador++}`);
  const categorias = await leerCategorias(db);
  const idDe = (nombre: string) => categorias.find((c) => c.nombre === nombre)?.id ?? '';
  let n = 0;
  for (const g of gastosIniciales) {
    await guardarGasto(
      db,
      nuevoGasto({ monto: g.monto, fecha: g.fecha, categoriaId: idDe(g.categoria ?? 'Supermercado') }, `2026-11-01T00:00:${String(n++).padStart(2, '0')}`),
    );
  }
  const usuario = userEvent.setup();
  render(<App db={db} obtenerHoy={() => HOY} />);
  await usuario.click(screen.getByRole('button', { name: 'Gastos no recurrentes' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: /^Gastos de / })).toBeInTheDocument());
  return { db, usuario };
}

const formulario = () => screen.getByRole('form', { name: 'Agregar gasto' });
const campoMonto = () => within(formulario()).getByLabelText('1. ¿Cuánto gastaste?');
const botonDia = (texto: string) => within(formulario()).getByRole('button', { name: texto });
const botonCategoria = (texto: string) => within(formulario()).getByRole('button', { name: texto });
const guardar = () => screen.getByRole('button', { name: 'Guardar gasto' });
const tabla = () => screen.getByRole('region', { name: /^Gastos de / });
const filas = () => within(tabla()).queryAllByRole('button', { name: /^Corregir/ }).map((b) => b.closest('.fila-gasto') as HTMLElement);

describe('NOR-A1: anotar un gasto', () => {
  it('con clic en "Guardar gasto"', async () => {
    const { usuario } = await abrirPantalla([{ fecha: '2026-11-10', monto: 5000 }]);
    expect(campoMonto()).toHaveFocus(); // El cursor parte en el monto.
    expect(botonDia('Hoy')).toHaveAttribute('aria-pressed', 'true');

    await usuario.type(campoMonto(), '12500');
    expect(campoMonto()).toHaveValue('12.500');
    await usuario.click(botonCategoria('Supermercado'));
    await usuario.click(guardar());

    await waitFor(() => expect(filas()).toHaveLength(2));
    await waitFor(() => expect(campoMonto()).toHaveValue(''));
    const primera = filas()[0]!;
    expect(primera).toHaveTextContent('Hoy, lunes 16');
    expect(primera).toHaveTextContent('Supermercado');
    expect(primera).toHaveTextContent('$12.500');
    expect(tabla()).toHaveTextContent('2 gastos, $17.500 en total');

    expect(campoMonto()).toHaveValue('');
    expect(botonDia('Hoy')).toHaveAttribute('aria-pressed', 'true');
    expect(botonCategoria('Supermercado')).toHaveAttribute('aria-pressed', 'false');
    expect(campoMonto()).toHaveFocus();
  });

  it('con la tecla Enter desde el monto', async () => {
    const { usuario } = await abrirPantalla();
    await usuario.click(botonCategoria('Salud'));
    await usuario.click(campoMonto());
    await usuario.type(campoMonto(), '8500{Enter}');
    await waitFor(() => expect(filas()).toHaveLength(1));
    expect(filas()[0]).toHaveTextContent('Salud');
    expect(campoMonto()).toHaveFocus();
  });

  it('se pueden anotar varios seguidos con el teclado', async () => {
    const { usuario } = await abrirPantalla();
    for (const monto of ['1000', '2000', '3000']) {
      await usuario.type(campoMonto(), monto);
      await usuario.click(botonCategoria('Otro'));
      campoMonto().focus();
      await usuario.keyboard('{Enter}');
      await waitFor(() => expect(campoMonto()).toHaveValue(''));
    }
    expect(filas()).toHaveLength(3);
    expect(tabla()).toHaveTextContent('3 gastos, $6.000 en total');
  });

  it('monto, clic en la categoría y Enter guarda aunque el foco quede en el botón', async () => {
    const { usuario } = await abrirPantalla();
    await usuario.type(campoMonto(), '4500');
    await usuario.click(botonCategoria('Salud'));
    botonCategoria('Salud').focus();
    await usuario.keyboard('{Enter}');
    await waitFor(() => expect(filas()).toHaveLength(1));
    expect(filas()[0]).toHaveTextContent('Salud');
  });

  it('Enter sobre un botón de categoría la elige y no guarda', async () => {
    const { usuario, db } = await abrirPantalla();
    await usuario.type(campoMonto(), '1000');
    botonCategoria('Casa').focus();
    await usuario.keyboard('{Enter}');
    expect(botonCategoria('Casa')).toHaveAttribute('aria-pressed', 'true');
    expect(await leerGastos(db)).toEqual([]);
  });

  it('"Ayer" guarda con la fecha de ayer', async () => {
    const { usuario } = await abrirPantalla();
    await usuario.type(campoMonto(), '1000');
    await usuario.click(botonDia('Ayer'));
    await usuario.click(botonCategoria('Casa'));
    await usuario.click(guardar());
    await waitFor(() => expect(filas()[0]).toHaveTextContent('Ayer, domingo 15'));
    await waitFor(() => expect(botonDia('Hoy')).toHaveAttribute('aria-pressed', 'true'));
  });
});

describe('NOR-A2 y NOR-A3: validación', () => {
  it('monto vacío: "Escribe cuánto gastaste" y no guarda', async () => {
    const { usuario, db } = await abrirPantalla();
    await usuario.click(botonCategoria('Supermercado'));
    await usuario.click(guardar());
    expect(screen.getByText('Escribe cuánto gastaste')).toBeInTheDocument();
    expect(campoMonto()).toHaveFocus();
    expect(await leerGastos(db)).toEqual([]);
  });

  it('monto cero: "Escribe cuánto gastaste" y no guarda', async () => {
    const { usuario, db } = await abrirPantalla();
    await usuario.type(campoMonto(), '0');
    await usuario.click(botonCategoria('Supermercado'));
    await usuario.click(guardar());
    expect(screen.getByText('Escribe cuánto gastaste')).toBeInTheDocument();
    expect(await leerGastos(db)).toEqual([]);
  });

  it('sin categoría: "Elige en qué fue" y no guarda', async () => {
    const { usuario, db } = await abrirPantalla();
    await usuario.type(campoMonto(), '12500');
    await usuario.click(guardar());
    expect(screen.getByText('Elige en qué fue')).toBeInTheDocument();
    expect(botonCategoria('Supermercado')).toHaveFocus();
    expect(await leerGastos(db)).toEqual([]);
  });

  it('el mensaje desaparece al corregir el campo', async () => {
    const { usuario } = await abrirPantalla();
    await usuario.click(guardar());
    expect(screen.getByText('Elige en qué fue')).toBeInTheDocument();
    await usuario.click(botonCategoria('Ropa'));
    expect(screen.queryByText('Elige en qué fue')).not.toBeInTheDocument();
  });
});

describe('NOR-A4: otro día', () => {
  it('muestra un selector de fecha que no acepta fechas futuras', async () => {
    const { usuario, db } = await abrirPantalla();
    await usuario.click(botonDia('Otro día'));
    const fecha = screen.getByLabelText('¿Qué día?');
    expect(fecha).toHaveAttribute('type', 'date');
    expect(fecha).toHaveAttribute('max', HOY);

    await usuario.type(campoMonto(), '5000');
    await usuario.click(botonCategoria('Transporte'));
    fireEvent.change(fecha, { target: { value: '2026-11-20' } });
    await usuario.click(guardar());
    expect(screen.getByText('Elige un día que no sea futuro')).toBeInTheDocument();
    expect(await leerGastos(db)).toEqual([]);
  });

  it('un gasto de octubre cambia la vista a octubre', async () => {
    const { usuario } = await abrirPantalla();
    await usuario.type(campoMonto(), '5000');
    await usuario.click(botonCategoria('Transporte'));
    await usuario.click(botonDia('Otro día'));
    fireEvent.change(screen.getByLabelText('¿Qué día?'), { target: { value: '2026-10-28' } });
    await usuario.click(guardar());

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Gastos de octubre' })).toBeInTheDocument());
    expect(screen.getByText('Octubre 2026')).toBeInTheDocument();
    await waitFor(() => expect(filas()).toHaveLength(1));
    expect(filas()[0]).toHaveTextContent('Miércoles 28');
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeEnabled();
  });

  it('sin elegir fecha pide elegirla', async () => {
    const { usuario } = await abrirPantalla();
    await usuario.type(campoMonto(), '5000');
    await usuario.click(botonCategoria('Transporte'));
    await usuario.click(botonDia('Otro día'));
    await usuario.click(guardar());
    expect(screen.getByText('Elige qué día fue')).toBeInTheDocument();
  });
});

describe('NOR-A5: corregir', () => {
  it('al cambiar el monto, la fila y los totales muestran el valor nuevo', async () => {
    const { usuario } = await abrirPantalla([
      { fecha: '2026-11-14', monto: 32000 },
      { fecha: '2026-11-10', monto: 5000, categoria: 'Salud' },
    ]);
    await waitFor(() => expect(filas()).toHaveLength(2));
    await usuario.click(within(filas()[0]!).getByRole('button', { name: /^Corregir/ }));

    const edicion = screen.getByRole('form', { name: 'Corregir gasto' });
    const monto = within(edicion).getByLabelText('1. ¿Cuánto gastaste?');
    expect(monto).toHaveValue('32.000');
    expect(within(edicion).getByRole('button', { name: 'Otro día' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(edicion).getByLabelText('¿Qué día?')).toHaveValue('2026-11-14');
    expect(within(edicion).getByRole('button', { name: 'Supermercado' })).toHaveAttribute('aria-pressed', 'true');

    await usuario.clear(monto);
    await usuario.type(monto, '23000');
    await usuario.click(within(edicion).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.queryByRole('form', { name: 'Corregir gasto' })).not.toBeInTheDocument());
    expect(filas()[0]).toHaveTextContent('$23.000');
    expect(tabla()).toHaveTextContent('2 gastos, $28.000 en total');
  });

  it('Cancelar no cambia nada y devuelve el foco a "Corregir"', async () => {
    const { usuario } = await abrirPantalla([{ fecha: '2026-11-14', monto: 32000 }]);
    await waitFor(() => expect(filas()).toHaveLength(1));
    await usuario.click(within(filas()[0]!).getByRole('button', { name: /^Corregir/ }));
    const edicion = screen.getByRole('form', { name: 'Corregir gasto' });
    await usuario.clear(within(edicion).getByLabelText('1. ¿Cuánto gastaste?'));
    await usuario.click(within(edicion).getByRole('button', { name: 'Cancelar' }));
    expect(filas()[0]).toHaveTextContent('$32.000');
    await waitFor(() => expect(within(filas()[0]!).getByRole('button', { name: /^Corregir/ })).toHaveFocus());
  });
});

describe('NOR-A6: eliminar', () => {
  it('pide confirmación, baja los totales y se puede deshacer con los mismos datos', async () => {
    const { usuario, db } = await abrirPantalla([
      { fecha: '2026-11-14', monto: 23500 },
      { fecha: '2026-11-10', monto: 5000, categoria: 'Salud' },
    ]);
    await waitFor(() => expect(filas()).toHaveLength(2));
    const antes = await leerGastos(db);

    await usuario.click(within(filas()[0]!).getByRole('button', { name: /^Corregir/ }));
    await usuario.click(screen.getByRole('button', { name: 'Eliminar gasto' }));
    const dialogo = screen.getByRole('alertdialog');
    expect(dialogo).toHaveTextContent('¿Eliminar el gasto de $23.500 en Supermercado del sábado 14?');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(filas()).toHaveLength(1));
    expect(tabla()).toHaveTextContent('1 gasto, $5.000 en total');
    expect(screen.getByRole('status')).toHaveTextContent('Gasto eliminado.');

    await usuario.click(screen.getByRole('button', { name: 'Deshacer' }));
    await waitFor(() => expect(filas()).toHaveLength(2));
    expect(tabla()).toHaveTextContent('2 gastos, $28.500 en total');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect((await leerGastos(db)).sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      antes.sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it('Cancelar en la confirmación no elimina', async () => {
    const { usuario } = await abrirPantalla([{ fecha: '2026-11-14', monto: 23500 }]);
    await waitFor(() => expect(filas()).toHaveLength(1));
    await usuario.click(within(filas()[0]!).getByRole('button', { name: /^Corregir/ }));
    await usuario.click(screen.getByRole('button', { name: 'Eliminar gasto' }));
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('form', { name: 'Corregir gasto' })).toBeInTheDocument();
  });

  it('el aviso desaparece con la siguiente acción', async () => {
    const { usuario } = await abrirPantalla([
      { fecha: '2026-11-14', monto: 23500 },
      { fecha: '2026-11-10', monto: 5000 },
    ]);
    await waitFor(() => expect(filas()).toHaveLength(2));
    await usuario.click(within(filas()[0]!).getByRole('button', { name: /^Corregir/ }));
    await usuario.click(screen.getByRole('button', { name: 'Eliminar gasto' }));
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    await usuario.type(campoMonto(), '1000');
    await usuario.click(botonCategoria('Casa'));
    await usuario.click(guardar());
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});

describe('NOR-A7: doble clic', () => {
  it('dos clics seguidos en "Guardar gasto" guardan un solo gasto', async () => {
    const { usuario, db } = await abrirPantalla();
    await usuario.type(campoMonto(), '12500');
    await usuario.click(botonCategoria('Supermercado'));
    await usuario.dblClick(guardar());
    await waitFor(() => expect(filas()).toHaveLength(1));
    expect(await leerGastos(db)).toHaveLength(1);
  });
});

describe('NOR-A8: el campo de monto', () => {
  it('no acepta caracteres que no son dígitos ni más de 8 dígitos', async () => {
    const { usuario } = await abrirPantalla();
    await usuario.type(campoMonto(), 'a1b2,3.4-56789');
    expect(campoMonto()).toHaveValue('12.345.678');
  });
});

describe('NOR-A9: muchos gastos', () => {
  it('con 14 gastos muestra 10 y el botón para ver los 14', async () => {
    const lista = Array.from({ length: 14 }, (_, i) => ({ fecha: `2026-11-${String(i + 1).padStart(2, '0')}`, monto: 1000 }));
    const { usuario } = await abrirPantalla(lista);
    await waitFor(() => expect(filas()).toHaveLength(10));
    expect(filas()[0]).toHaveTextContent('Sábado 14');
    expect(tabla()).toHaveTextContent('14 gastos, $14.000 en total');
    await usuario.click(screen.getByRole('button', { name: 'Ver los 14 gastos del mes' }));
    expect(filas()).toHaveLength(14);
    expect(screen.queryByRole('button', { name: 'Ver los 14 gastos del mes' })).not.toBeInTheDocument();
  });

  it('con 10 gastos no hay botón', async () => {
    const lista = Array.from({ length: 10 }, (_, i) => ({ fecha: `2026-11-${String(i + 1).padStart(2, '0')}`, monto: 1000 }));
    await abrirPantalla(lista);
    await waitFor(() => expect(filas()).toHaveLength(10));
    expect(screen.queryByRole('button', { name: /^Ver los/ })).not.toBeInTheDocument();
  });
});

describe('NOR-A10: mes sin gastos', () => {
  it('muestra el estado vacío y el formulario', async () => {
    await abrirPantalla();
    expect(screen.getByText('Todavía no anotas gastos este mes. Usa el formulario de arriba.')).toBeInTheDocument();
    expect(formulario()).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gastos de noviembre' })).toBeInTheDocument();
  });
});
