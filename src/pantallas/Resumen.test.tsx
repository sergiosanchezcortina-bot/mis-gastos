/**
 * Criterios de aceptación RES-A1 a RES-A9 (brief, fase 3).
 * Hoy es lunes 16 de noviembre de 2026. Los datos replican la pantalla de referencia.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { abrirBase, leerTodo, reemplazarTodo } from '../datos/db';
import { nuevoGasto } from '../datos/gastos';
import type { Gasto, GastoRecurrente, PagoRecurrente } from '../dominio/tipos';

const HOY = '2026-11-16';
let contador = 0;

type Escenario = {
  gastos?: Array<[fecha: string, monto: number, categoria: string]>;
  /** nombre, monto, día de pago (null = sin pagar), mes */
  recurrentes?: Array<[nombre: string, monto: number, diaPago: number | null, mes?: string]>;
};

async function abrirResumen({ gastos = [], recurrentes = [] }: Escenario = {}) {
  const db = await abrirBase(`resumen-${Date.now()}-${contador++}`);
  const datos = await leerTodo(db);
  const idDe = (nombre: string) => datos.categorias.find((c) => c.nombre === nombre)?.id ?? '';
  const listaGastos: Gasto[] = gastos.map(([fecha, monto, categoria], i) =>
    nuevoGasto({ fecha, monto, categoriaId: idDe(categoria) }, `${fecha}T10:00:${String(i % 60).padStart(2, '0')}`),
  );
  const plantillas: GastoRecurrente[] = [];
  const pagos: PagoRecurrente[] = [];
  recurrentes.forEach(([nombre, monto, diaPago, mes = '2026-11'], i) => {
    let plantilla = plantillas.find((p) => p.nombre === nombre);
    if (!plantilla) {
      plantilla = { id: `r${i}`, nombre, diaVencimiento: 5 + i, desde: mes, hasta: null, palabrasClave: [], creadoEn: '' };
      plantillas.push(plantilla);
    }
    if (mes < plantilla.desde) plantilla.desde = mes;
    pagos.push({
      id: `p${i}`,
      gastoRecurrenteId: plantilla.id,
      mes,
      monto,
      pagado: diaPago !== null,
      fechaPago: diaPago === null ? null : `${mes}-${String(diaPago).padStart(2, '0')}`,
      origen: 'manual',
      movimientoId: null,
    });
  });
  await reemplazarTodo(db, { ...datos, gastos: listaGastos, gastosRecurrentes: plantillas, pagosRecurrentes: pagos });
  const usuario = userEvent.setup();
  render(<App db={db} obtenerHoy={() => HOY} />);
  return { db, usuario };
}

/** Datos de la pantalla de referencia para noviembre. */
const NOVIEMBRE: Escenario = {
  recurrentes: [
    ['Gastos comunes', 120000, 5],
    ['Celular e internet', 52000, 10],
    ['Luz', 38000, 15],
    ['Agua', 18000, null],
    ['Gas', 27000, null],
    ['Seguro del auto', 42000, null],
  ],
  gastos: [
    ['2026-11-03', 100000, 'Supermercado'],
    ['2026-11-14', 45000, 'Supermercado'],
    ['2026-11-15', 52000, 'Salud'],
    ['2026-11-12', 40500, 'Transporte'],
    ['2026-11-08', 28000, 'Salidas'],
    ['2026-11-01', 12000, 'Otro'],
  ],
};

const tarjeta = (titulo: string) => {
  const el = screen.getByText(titulo, { selector: '.tarjeta__titulo' }).closest('.tarjeta');
  if (!(el instanceof HTMLElement)) throw new Error(`No hay tarjeta ${titulo}`);
  return el;
};

const esperarCarga = () => waitFor(() => expect(screen.queryByText(/^Llevas gastado|^Gastaste|^Todavía no hay/)).toBeInTheDocument());

describe('RES-A1: total del mes', () => {
  it('recurrentes pagados por $210.000 y no recurrentes por $277.500 dan $487.500', async () => {
    await abrirResumen(NOVIEMBRE);
    await esperarCarga();
    expect(screen.getByText('Llevas gastado en noviembre')).toBeInTheDocument();
    expect(screen.getByText('$487.500', { selector: '.total-mes__cifra' })).toBeInTheDocument();
    expect(within(tarjeta('Recurrentes pagados')).getByText('$210.000')).toBeInTheDocument();
    expect(within(tarjeta('Recurrentes pagados')).getByText('3 de 6 pagados')).toBeInTheDocument();
    expect(within(tarjeta('No recurrentes')).getByText('$277.500')).toBeInTheDocument();
    expect(within(tarjeta('No recurrentes')).getByText('6 gastos anotados')).toBeInTheDocument();
  });
});

describe('RES-A2 y RES-A3: comparación', () => {
  it('llevo $487.500 y al 16 de octubre llevaba $512.000', async () => {
    await abrirResumen({
      ...NOVIEMBRE,
      gastos: [...(NOVIEMBRE.gastos ?? []), ['2026-10-12', 512000, 'Casa'], ['2026-10-20', 80000, 'Casa']],
    });
    await esperarCarga();
    expect(screen.getByText('Vas $24.500 por debajo de octubre a esta misma fecha.')).toBeInTheDocument();
  });

  it('sin datos el mes anterior no hay frase', async () => {
    await abrirResumen(NOVIEMBRE);
    await esperarCarga();
    expect(screen.queryByText(/a esta misma fecha|que en octubre/)).not.toBeInTheDocument();
  });

  it('en un mes pasado compara los meses completos', async () => {
    const { usuario } = await abrirResumen({
      gastos: [['2026-11-02', 1000, 'Casa'], ['2026-10-12', 30000, 'Casa'], ['2026-09-12', 54500, 'Casa']],
    });
    await esperarCarga();
    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await waitFor(() => expect(screen.getByText('Gastaste en octubre')).toBeInTheDocument());
    expect(screen.getByText('$24.500 menos que en septiembre.')).toBeInTheDocument();
  });
});

describe('RES-A4: te falta pagar', () => {
  it('3 sin pagar por $87.000 llevan a Gastos recurrentes en el mismo mes', async () => {
    const { usuario } = await abrirResumen(NOVIEMBRE);
    await esperarCarga();
    const falta = tarjeta('Te falta pagar');
    expect(within(falta).getByText('$87.000')).toBeInTheDocument();
    expect(falta).toHaveClass('tarjeta--alerta');
    await usuario.click(within(falta).getByRole('button', { name: 'Ver los 3 gastos pendientes' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Gastos recurrentes' })).toBeInTheDocument();
    expect(screen.getByText('Noviembre 2026')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(6));
  });

  it('si no falta nada dice "Todo pagado" sin estilo de alerta', async () => {
    await abrirResumen({ recurrentes: [['Luz', 38000, 15]], gastos: [['2026-11-02', 1000, 'Casa']] });
    await esperarCarga();
    expect(within(tarjeta('Te falta pagar')).getByText('Todo pagado')).toBeInTheDocument();
    expect(tarjeta('Te falta pagar')).not.toHaveClass('tarjeta--alerta');
  });

  it('sin gastos recurrentes no se muestran sus tarjetas', async () => {
    await abrirResumen({ gastos: [['2026-11-02', 1000, 'Casa']] });
    await esperarCarga();
    expect(screen.queryByText('Recurrentes pagados')).not.toBeInTheDocument();
    expect(screen.queryByText('Te falta pagar')).not.toBeInTheDocument();
    expect(screen.getByText('No recurrentes')).toBeInTheDocument();
  });
});

describe('RES-A5 y RES-A6: ¿En qué se fue?', () => {
  const filasDeBarras = () =>
    within(screen.getByRole('region', { name: '¿En qué se fue?' })).getAllByRole('button');

  it('cinco categorías dan seis filas de mayor a menor y la barra mayor ocupa todo el ancho', async () => {
    await abrirResumen(NOVIEMBRE);
    await esperarCarga();
    const nombres = filasDeBarras().map((b) => b.querySelector('.fila-barra__nombre')?.textContent);
    expect(nombres).toEqual(['Gastos recurrentes', 'Supermercado', 'Salud', 'Transporte', 'Salidas', 'Otro']);
    const anchos = filasDeBarras().map((b) => (b.querySelector('.barra__relleno') as HTMLElement).style.width);
    expect(anchos[0]).toBe('100%');
    expect(anchos[1]).toBe('69%');
  });

  it('un clic abre una fila con fecha y monto; otra fila cierra la primera', async () => {
    const { usuario } = await abrirResumen(NOVIEMBRE);
    await esperarCarga();
    const supermercado = filasDeBarras()[1]!;
    expect(supermercado).toHaveAttribute('aria-expanded', 'false');
    await usuario.click(supermercado);
    expect(supermercado).toHaveAttribute('aria-expanded', 'true');
    const detalle = screen.getByRole('list', { name: 'Gastos de Supermercado' });
    expect(within(detalle).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Sábado 14$45.000',
      'Martes 3$100.000',
    ]);

    await usuario.click(filasDeBarras()[2]!);
    expect(screen.queryByRole('list', { name: 'Gastos de Supermercado' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Gastos de Salud' })).toHaveTextContent('Ayer, domingo 15$52.000');

    // Otro clic en la misma fila la cierra.
    await usuario.click(filasDeBarras()[2]!);
    expect(screen.queryByRole('list', { name: 'Gastos de Salud' })).not.toBeInTheDocument();
  });

  it('la fila de recurrentes muestra nombre y monto de lo pagado', async () => {
    const { usuario } = await abrirResumen(NOVIEMBRE);
    await esperarCarga();
    await usuario.click(filasDeBarras()[0]!);
    const detalle = screen.getByRole('list', { name: 'Gastos de Gastos recurrentes' });
    expect(within(detalle).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Gastos comunes$120.000',
      'Celular e internet$52.000',
      'Luz$38.000',
    ]);
  });
});

describe('RES-A7 y F7-A3: mes a mes', () => {
  it('con datos en ocho meses muestra seis barras con su total, y el actual dice "hasta hoy"', async () => {
    await abrirResumen({
      gastos: ['04', '05', '06', '07', '08', '09', '10', '11'].map((m) => [`2026-${m}-05`, 100000, 'Casa'] as [string, number, string]),
    });
    await esperarCarga();
    const panel = screen.getByRole('region', { name: 'Mes a mes' });
    const columnas = within(panel).getAllByRole('listitem');
    expect(columnas.map((f) => f.querySelector('.grafico__mes')?.textContent)).toEqual([
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre, hasta hoy',
    ]);
    expect(columnas.every((c) => c.querySelector('.grafico__monto')?.textContent === '$100.000')).toBe(true);
    expect(columnas[5]!.querySelector('.grafico__barra')).toHaveClass('grafico__barra--acento');
    expect(columnas[4]!.querySelector('.grafico__barra')).not.toHaveClass('grafico__barra--acento');
  });
});

describe('F7-A4: mes a mes por categorías', () => {
  it('el botón divide las barras en tramos y muestra la leyenda con nombres y montos', async () => {
    const { usuario } = await abrirResumen({
      gastos: [
        ['2026-10-05', 30000, 'Casa'],
        ['2026-11-03', 20000, 'Supermercado'],
        ['2026-11-04', 5000, 'Salud'],
      ],
      recurrentes: [['Luz', 38000, 5]],
    });
    await esperarCarga();
    const panel = screen.getByRole('region', { name: 'Mes a mes' });
    const boton = within(panel).getByRole('button', { name: 'Por categorías' });
    expect(boton).toHaveAttribute('aria-pressed', 'false');
    expect(panel.querySelectorAll('.grafico__tramo')).toHaveLength(0);

    await usuario.click(boton);
    expect(boton).toHaveAttribute('aria-pressed', 'true');
    const columnas = within(panel).getAllByRole('listitem').filter((li) => li.classList.contains('grafico__columna'));
    expect(columnas[0]!.querySelectorAll('.grafico__tramo')).toHaveLength(1);
    expect(columnas[1]!.querySelectorAll('.grafico__tramo')).toHaveLength(3);
    expect(columnas[1]).toHaveTextContent('Gastos recurrentes, $38.000; Supermercado, $20.000; Salud, $5.000');

    const leyenda = within(panel).getByRole('heading', { name: 'Por categorías en noviembre' }).parentElement!;
    expect(within(leyenda).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Gastos recurrentes$38.000',
      'Supermercado$20.000',
      'Salud$5.000',
      'Casa$0',
    ]);

    await usuario.click(boton);
    expect(boton).toHaveAttribute('aria-pressed', 'false');
    expect(within(panel).queryByRole('heading', { name: /^Por categorías en/ })).not.toBeInTheDocument();
  });
});

describe('RES-A8: agregar gasto', () => {
  it('lleva a Gastos no recurrentes con el cursor en el monto', async () => {
    const { usuario } = await abrirResumen(NOVIEMBRE);
    await esperarCarga();
    await usuario.click(screen.getByRole('button', { name: 'Agregar gasto' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Gastos no recurrentes' })).toBeInTheDocument();
    expect(screen.getByLabelText('1. ¿Cuánto gastaste?')).toHaveFocus();
  });
});

describe('RES-A9: mes sin gastos', () => {
  it('muestra el estado vacío, sin tarjetas ni barras en cero', async () => {
    await abrirResumen();
    await waitFor(() => expect(screen.getByText('Todavía no hay gastos este mes.')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: 'Agregar gasto' })).toHaveLength(2);
    expect(document.querySelector('.tarjeta')).toBeNull();
    expect(document.querySelector('.barra')).toBeNull();
    expect(screen.queryByText(/Llevas gastado/)).not.toBeInTheDocument();
  });

  it('si hay cuentas por pagar, se sigue viendo cuánto falta', async () => {
    await abrirResumen({ recurrentes: [['Luz', 38000, null], ['Agua', 18000, null]] });
    await waitFor(() => expect(screen.getByText('Todavía no hay gastos este mes.')).toBeInTheDocument());
    expect(within(tarjeta('Te falta pagar')).getByText('$56.000')).toBeInTheDocument();
    expect(screen.queryByText('Recurrentes pagados')).not.toBeInTheDocument();
  });

  it('crea las filas de recurrentes del mes aunque no se haya entrado a esa pestaña', async () => {
    await abrirResumen({ recurrentes: [['Luz', 38000, 15, '2026-10']], gastos: [['2026-10-03', 1000, 'Casa']] });
    await waitFor(() => expect(screen.getByText('Todavía no hay gastos este mes.')).toBeInTheDocument());
    expect(within(tarjeta('Te falta pagar')).getByText('$38.000')).toBeInTheDocument();
    expect(within(tarjeta('Te falta pagar')).getByRole('button', { name: 'Ver el gasto pendiente' })).toBeInTheDocument();
  });
});
