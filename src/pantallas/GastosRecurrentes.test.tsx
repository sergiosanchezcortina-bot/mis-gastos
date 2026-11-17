/**
 * Criterios de aceptación REC-A1 a REC-A11 (brief, fase 1).
 */
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { abrirBase, leerTodo, reemplazarTodo, type BaseDeDatos } from '../datos/db';
import type { GastoRecurrente, PagoRecurrente } from '../dominio/tipos';

let contador = 0;

const PLANTILLAS: Array<[string, number | null, number]> = [
  ['Seguro del auto', 28, 42000],
  ['Gastos comunes', 5, 120000],
  ['Agua', 20, 18000],
  ['Luz', 15, 38000],
  ['Gas', 25, 27000],
  ['Celular e internet', 10, 52000],
];

/** Seis gastos recurrentes con historia en octubre, todos pagados ese mes. */
async function prepararBase(): Promise<BaseDeDatos> {
  const db = await abrirBase(`pantalla-rec-${Date.now()}-${contador++}`);
  const datos = await leerTodo(db);
  const gastos: GastoRecurrente[] = PLANTILLAS.map(([nombre, dia]) => ({
    id: nombre,
    nombre,
    diaVencimiento: dia,
    desde: '2026-10',
    hasta: null,
    palabrasClave: [],
    creadoEn: '2026-10-01T00:00:00',
  }));
  const pagos: PagoRecurrente[] = PLANTILLAS.map(([nombre, , monto]) => ({
    id: `${nombre}-2026-10`,
    gastoRecurrenteId: nombre,
    mes: '2026-10',
    monto,
    pagado: true,
    fechaPago: '2026-10-31',
    origen: 'manual',
    movimientoId: null,
  }));
  await reemplazarTodo(db, { ...datos, gastosRecurrentes: gastos, pagosRecurrentes: pagos });
  return db;
}

async function abrirRecurrentes(opciones: { hoy?: string; vacia?: boolean } = {}) {
  const db = opciones.vacia ? await abrirBase(`pantalla-rec-${Date.now()}-${contador++}`) : await prepararBase();
  const usuario = userEvent.setup();
  render(<App db={db} obtenerHoy={() => opciones.hoy ?? '2026-11-17'} />);
  await usuario.click(screen.getByRole('button', { name: 'Gastos recurrentes' }));
  return { db, usuario };
}

/** Nombres de las filas, en el orden en que aparecen. */
function nombresDeFilas(): string[] {
  return screen.getAllByRole('checkbox').map((c) => c.getAttribute('aria-label') ?? '');
}

function tarjeta(titulo: string): HTMLElement {
  const el = screen.getByText(titulo, { selector: '.tarjeta__titulo' }).closest('.tarjeta');
  if (!(el instanceof HTMLElement)) throw new Error(`No hay tarjeta ${titulo}`);
  return el;
}

const casilla = (nombre: string) => screen.getByRole('checkbox', { name: nombre });
const monto = (nombre: string) => screen.getByRole('textbox', { name: `Monto de ${nombre}` });
const estadoDe = (nombre: string) => document.getElementById(casilla(nombre).getAttribute('aria-describedby') ?? '');

describe('REC-A1: un mes nuevo', () => {
  it('muestra 6 filas ordenadas por vencimiento, sin marcar y con su último monto', async () => {
    await abrirRecurrentes();
    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(6));
    expect(nombresDeFilas()).toEqual(['Gastos comunes', 'Celular e internet', 'Luz', 'Agua', 'Gas', 'Seguro del auto']);
    for (const c of screen.getAllByRole('checkbox')) expect(c).not.toBeChecked();
    expect(monto('Gastos comunes')).toHaveValue('120.000');
    expect(monto('Agua')).toHaveValue('18.000');
    expect(within(tarjeta('Total del mes')).getByText('$297.000')).toBeInTheDocument();
    expect(within(tarjeta('Total del mes')).getByText('6 gastos recurrentes')).toBeInTheDocument();
  });
});

describe('REC-A2 y REC-A3: marcar y desmarcar', () => {
  it('marcar sube Pagado, baja Por pagar, avanza el contador y no mueve la fila', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Agua')).toBeInTheDocument());
    const ordenAntes = nombresDeFilas();
    expect(within(tarjeta('Pagado')).getByText('$0')).toBeInTheDocument();
    expect(within(tarjeta('Por pagar')).getByText('$297.000')).toBeInTheDocument();

    await usuario.click(casilla('Agua'));

    expect(casilla('Agua')).toBeChecked();
    expect(estadoDe('Agua')).toHaveTextContent('Pagado');
    expect(within(tarjeta('Pagado')).getByText('$18.000')).toBeInTheDocument();
    expect(within(tarjeta('Pagado')).getByText('1 de 6 pagados')).toBeInTheDocument();
    expect(within(tarjeta('Por pagar')).getByText('$279.000')).toBeInTheDocument();
    expect(within(tarjeta('Por pagar')).getByText('Faltan 5')).toBeInTheDocument();
    expect(nombresDeFilas()).toEqual(ordenAntes);

    // REC-A3: desmarcar devuelve todo como estaba.
    await usuario.click(casilla('Agua'));
    expect(casilla('Agua')).not.toBeChecked();
    expect(estadoDe('Agua')).toHaveTextContent('Vence el 20');
    expect(within(tarjeta('Pagado')).getByText('$0')).toBeInTheDocument();
    expect(within(tarjeta('Por pagar')).getByText('$297.000')).toBeInTheDocument();
    expect(nombresDeFilas()).toEqual(ordenAntes);
  });

  it('REC-4: hacer clic en el nombre también marca', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Luz')).toBeInTheDocument());
    await usuario.click(screen.getByText('Luz', { selector: '.fila-recurrente__titulo' }));
    expect(casilla('Luz')).toBeChecked();
  });

  it('T-4: se marca con la barra espaciadora', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Luz')).toBeInTheDocument());
    casilla('Luz').focus();
    await usuario.keyboard(' ');
    expect(casilla('Luz')).toBeChecked();
  });
});

describe('REC-A4: cambiar el monto', () => {
  it('recalcula los totales de inmediato y el valor sigue ahí al reabrir la app', async () => {
    const { db, usuario } = await abrirRecurrentes();
    await waitFor(() => expect(monto('Gas')).toBeInTheDocument());
    await usuario.clear(monto('Gas'));
    await usuario.type(monto('Gas'), '31500');
    expect(monto('Gas')).toHaveValue('31.500');
    expect(within(tarjeta('Total del mes')).getByText('$301.500')).toBeInTheDocument();

    // "Cerrar" la app y volver a abrirla.
    document.body.innerHTML = '';
    render(<App db={db} obtenerHoy={() => '2026-11-17'} />);
    await usuario.click(screen.getByRole('button', { name: 'Gastos recurrentes' }));
    await waitFor(() => expect(monto('Gas')).toHaveValue('31.500'));
  });

  it('se puede editar estando pagado', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Luz')).toBeInTheDocument());
    await usuario.click(casilla('Luz'));
    await usuario.clear(monto('Luz'));
    await usuario.type(monto('Luz'), '40000');
    expect(within(tarjeta('Pagado')).getByText('$40.000')).toBeInTheDocument();
  });

  it('no acepta letras ni más de 8 dígitos', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(monto('Gas')).toBeInTheDocument());
    await usuario.clear(monto('Gas'));
    await usuario.type(monto('Gas'), '12ab3456789');
    expect(monto('Gas')).toHaveValue('12.345.678');
  });
});

describe('REC-A5: sin monto', () => {
  it('muestra "Falta el monto" con ícono y cuenta como $0', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(monto('Agua')).toBeInTheDocument());
    await usuario.clear(monto('Agua'));
    expect(estadoDe('Agua')).toHaveTextContent('Falta el monto');
    expect(estadoDe('Agua')?.querySelector('svg')).not.toBeNull();
    expect(within(tarjeta('Total del mes')).getByText('$279.000')).toBeInTheDocument();
  });
});

describe('REC-A6: vencido', () => {
  it('hoy es 21, Agua vence el 20 y no está pagada: "Venció el 20" con ícono', async () => {
    await abrirRecurrentes({ hoy: '2026-11-21' });
    await waitFor(() => expect(casilla('Agua')).toBeInTheDocument());
    expect(estadoDe('Agua')).toHaveTextContent('Venció el 20');
    expect(estadoDe('Agua')?.querySelector('svg')).not.toBeNull();
    expect(estadoDe('Gas')).toHaveTextContent('Vence el 25');
  });
});

describe('REC-A7: agregar', () => {
  it('Netflix agregado en noviembre aparece en noviembre y no en octubre', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Agua')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Agregar gasto recurrente' }));
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Netflix');
    await usuario.type(screen.getByRole('textbox', { name: 'Monto estimado' }), '9990');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(casilla('Netflix')).toBeInTheDocument());
    expect(nombresDeFilas().at(-1)).toBe('Netflix'); // Sin día: al final.
    expect(estadoDe('Netflix')).toHaveTextContent('Por pagar');
    expect(monto('Netflix')).toHaveValue('9.990');

    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await waitFor(() => expect(screen.getByText('Octubre 2026')).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(6));
    expect(screen.queryByRole('checkbox', { name: 'Netflix' })).not.toBeInTheDocument();
  });

  it('con el nombre vacío dice "Escribe un nombre" y no guarda', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Agua')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Agregar gasto recurrente' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('Escribe un nombre')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveFocus();
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);
  });

  it('con un día fuera de rango no guarda', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Agua')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Agregar gasto recurrente' }));
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Netflix');
    await usuario.type(screen.getByRole('textbox', { name: 'Día de vencimiento' }), '32');
    await usuario.keyboard('{Enter}');
    expect(screen.getByText('Escribe un día del 1 al 31')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);
  });
});

describe('REC-A8: quitar', () => {
  it('quitar Gas en noviembre lo saca de noviembre, sigue en octubre y se puede deshacer', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Gas')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Editar lista' }));
    await usuario.click(screen.getByRole('button', { name: 'Quitar Gas' }));

    const dialogo = screen.getByRole('alertdialog');
    expect(dialogo).toHaveTextContent('¿Quitar Gas de tus gastos recurrentes? Los meses anteriores no cambian.');
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Quitar' }));

    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Gas' })).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Se quitó Gas.');
    expect(within(tarjeta('Total del mes')).getByText('$270.000')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Deshacer' }));
    await waitFor(() => expect(casilla('Gas')).toBeInTheDocument());
    expect(monto('Gas')).toHaveValue('27.000');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('después de quitar, octubre sigue teniendo Gas', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Gas')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Editar lista' }));
    await usuario.click(screen.getByRole('button', { name: 'Quitar Gas' }));
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Quitar' }));
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Gas' })).not.toBeInTheDocument());

    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await waitFor(() => expect(casilla('Gas')).toBeInTheDocument());
    expect(casilla('Gas')).toBeChecked();
  });

  it('Cancelar no quita nada', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Gas')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Editar lista' }));
    await usuario.click(screen.getByRole('button', { name: 'Quitar Gas' }));
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(casilla('Gas')).toBeInTheDocument();
  });

  it('el aviso de deshacer desaparece con la siguiente acción', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Gas')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Editar lista' }));
    await usuario.click(screen.getByRole('button', { name: 'Quitar Gas' }));
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Quitar' }));
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    await usuario.click(casilla('Luz'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Cambiar nombre o día', () => {
  it('cambia el nombre y reordena por el día nuevo', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Gas')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Editar lista' }));
    await usuario.click(screen.getByRole('button', { name: 'Cambiar nombre o día de Gas' }));
    const nombre = screen.getByRole('textbox', { name: 'Nombre' });
    await usuario.clear(nombre);
    await usuario.type(nombre, 'Gas de cañería');
    const dia = screen.getByRole('textbox', { name: 'Día de vencimiento' });
    await usuario.clear(dia);
    await usuario.type(dia, '1');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(nombresDeFilas()[0]).toBe('Gas de cañería'));
  });
});

describe('REC-A9: todo pagado', () => {
  it('Por pagar muestra $0 y "Todo pagado" sin estilo de alerta', async () => {
    const { usuario } = await abrirRecurrentes();
    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(6));
    expect(tarjeta('Por pagar')).toHaveClass('tarjeta--alerta');
    for (const c of screen.getAllByRole('checkbox')) await usuario.click(c);
    expect(within(tarjeta('Por pagar')).getByText('$0')).toBeInTheDocument();
    expect(within(tarjeta('Por pagar')).getByText('Todo pagado')).toBeInTheDocument();
    expect(tarjeta('Por pagar')).not.toHaveClass('tarjeta--alerta');
  });
});

describe('REC-A10: sin gastos recurrentes', () => {
  it('muestra el estado vacío y el botón para agregar', async () => {
    await abrirRecurrentes({ vacia: true });
    await waitFor(() => expect(screen.getByText('Todavía no tienes gastos recurrentes.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Agregar gasto recurrente' })).toBeInTheDocument();
    expect(screen.queryByText('Total del mes')).not.toBeInTheDocument();
  });

  it('desde el estado vacío se agrega el primero', async () => {
    const { usuario } = await abrirRecurrentes({ vacia: true });
    await waitFor(() => expect(screen.getByText('Todavía no tienes gastos recurrentes.')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Agregar gasto recurrente' }));
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Luz');
    await usuario.keyboard('{Enter}');
    await waitFor(() => expect(casilla('Luz')).toBeInTheDocument());
    expect(estadoDe('Luz')).toHaveTextContent('Falta el monto');
  });
});

describe('REC-A11: vence el 31 en un mes de 30 días', () => {
  it('en noviembre vence el 30', async () => {
    const { usuario } = await abrirRecurrentes({ vacia: true });
    await waitFor(() => expect(screen.getByText('Todavía no tienes gastos recurrentes.')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Agregar gasto recurrente' }));
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Arriendo');
    await usuario.type(screen.getByRole('textbox', { name: 'Día de vencimiento' }), '31');
    await usuario.type(screen.getByRole('textbox', { name: 'Monto estimado' }), '450000');
    await usuario.keyboard('{Enter}');
    await waitFor(() => expect(casilla('Arriendo')).toBeInTheDocument());
    expect(estadoDe('Arriendo')).toHaveTextContent('Vence el 30');
  });
});

describe('REC-10: meses pasados', () => {
  it('se pueden corregir y la fecha de pago es el último día de ese mes', async () => {
    const { db, usuario } = await abrirRecurrentes();
    await waitFor(() => expect(casilla('Gas')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await waitFor(() => expect(screen.getByText('Octubre 2026')).toBeInTheDocument());
    await waitFor(() => expect(casilla('Gas')).toBeChecked());
    await usuario.click(casilla('Gas'));
    await usuario.click(casilla('Gas'));
    await waitFor(async () => {
      const { pagosRecurrentes } = await leerTodo(db);
      expect(pagosRecurrentes.find((p) => p.id === 'Gas-2026-10')?.fechaPago).toBe('2026-10-31');
    });
  });
});
