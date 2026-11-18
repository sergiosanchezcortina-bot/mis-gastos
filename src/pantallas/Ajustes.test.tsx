/**
 * Criterios de aceptación AJU-A1 a AJU-A7 (brief, fase 4).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { abrirBase, guardarAjustes, leerTodo, reemplazarTodo, VERSION_ESQUEMA, type BaseDeDatos } from '../datos/db';
import { crearDatosDeEjemplo } from '../datos/ejemplo';
import { nuevoGasto } from '../datos/gastos';
import { crearRespaldo, textoRespaldo } from '../respaldo/exportar';

const HOY = '2026-11-17';
let contador = 0;

/** Lo que se "descargó": nombre del archivo y contenido. */
let descargas: Array<{ nombre: string; contenido: Blob }> = [];

beforeEach(() => {
  descargas = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 17, 21, 30, 0));
  let ultimoBlob: Blob | null = null;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    ultimoBlob = blob;
    return 'blob:respaldo';
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    if (ultimoBlob) descargas.push({ nombre: this.download, contenido: ultimoBlob });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Base con las categorías iniciales y un gasto de Salidas y otro de Ropa en octubre. */
async function prepararBase(): Promise<BaseDeDatos> {
  const db = await abrirBase(`ajustes-${Date.now()}-${contador++}`);
  const datos = await leerTodo(db);
  const id = (nombre: string) => datos.categorias.find((c) => c.nombre === nombre)!.id;
  await reemplazarTodo(db, {
    ...datos,
    gastos: [
      nuevoGasto({ fecha: '2026-10-20', monto: 14000, categoriaId: id('Salidas') }, '2026-10-20T10:00:00'),
      nuevoGasto({ fecha: '2026-10-21', monto: 29990, categoriaId: id('Ropa') }, '2026-10-21T10:00:00'),
      nuevoGasto({ fecha: '2026-11-10', monto: 9500, categoriaId: id('Salidas') }, '2026-11-10T10:00:00'),
    ],
  });
  return db;
}

async function abrir(db?: BaseDeDatos) {
  const base = db ?? (await prepararBase());
  const usuario = userEvent.setup();
  render(<App db={base} obtenerHoy={() => HOY} />);
  await usuario.click(screen.getByRole('button', { name: 'Ajustes' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cambiar nombre de Salidas' })).toBeInTheDocument());
  return { db: base, usuario };
}

const pestana = (nombre: string) => screen.getByRole('button', { name: nombre });

describe('AJU-A1: cambiar el nombre de una categoría', () => {
  it('"Salidas" pasa a "Restaurantes" en el formulario, la tabla y el Resumen, también en gastos antiguos', async () => {
    const { usuario } = await abrir();
    await usuario.click(screen.getByRole('button', { name: 'Cambiar nombre de Salidas' }));
    const campo = screen.getByLabelText('Nombre nuevo');
    expect(campo).toHaveValue('Salidas');
    await usuario.clear(campo);
    await usuario.type(campo, 'Restaurantes{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cambiar nombre de Restaurantes' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Cambiar nombre de Restaurantes' })).toHaveFocus();

    await usuario.click(pestana('Gastos no recurrentes'));
    const formulario = screen.getByRole('form', { name: 'Agregar gasto' });
    expect(within(formulario).getByRole('button', { name: 'Restaurantes' })).toBeInTheDocument();
    expect(within(formulario).queryByRole('button', { name: 'Salidas' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('region', { name: 'Gastos de noviembre' })).toHaveTextContent('Restaurantes'));

    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Gastos de octubre' })).toHaveTextContent('Restaurantes'));

    await usuario.click(pestana('Resumen'));
    await waitFor(() => expect(screen.getByRole('region', { name: '¿En qué se fue?' })).toHaveTextContent('Restaurantes'));
  });

  it('no acepta un nombre vacío ni repetido', async () => {
    const { usuario } = await abrir();
    await usuario.click(screen.getByRole('button', { name: 'Cambiar nombre de Salidas' }));
    const campo = screen.getByLabelText('Nombre nuevo');
    await usuario.clear(campo);
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('Escribe un nombre')).toBeInTheDocument();
    await usuario.type(campo, 'salud');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('Ya tienes una categoría con ese nombre')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Cambiar nombre de Salidas' })).toBeInTheDocument();
  });
});

describe('AJU-A2: ocultar una categoría', () => {
  it('"Ropa" deja de aparecer en el formulario y sus gastos antiguos la siguen mostrando', async () => {
    const { usuario } = await abrir();
    await usuario.click(screen.getByRole('button', { name: 'Ocultar Ropa' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mostrar Ropa' })).toBeInTheDocument());
    expect(screen.getByText('Oculta')).toBeInTheDocument();

    await usuario.click(pestana('Gastos no recurrentes'));
    const formulario = screen.getByRole('form', { name: 'Agregar gasto' });
    expect(within(formulario).queryByRole('button', { name: 'Ropa' })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Gastos de octubre' })).toHaveTextContent('Ropa'));
  });

  it('"Mostrar" la devuelve', async () => {
    const { usuario } = await abrir();
    await usuario.click(screen.getByRole('button', { name: 'Ocultar Ropa' }));
    await usuario.click(await screen.findByRole('button', { name: 'Mostrar Ropa' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ocultar Ropa' })).toBeInTheDocument());
  });
});

describe('AJU-A3: mínimo de categorías visibles', () => {
  it('con 2 visibles no se puede ocultar otra y se explica por qué', async () => {
    const { usuario } = await abrir();
    for (const nombre of ['Transporte', 'Casa', 'Salidas', 'Familia', 'Ropa', 'Otro']) {
      await usuario.click(screen.getByRole('button', { name: `Ocultar ${nombre}` }));
      await waitFor(() => expect(screen.getByRole('button', { name: `Mostrar ${nombre}` })).toBeInTheDocument());
    }
    expect(screen.getByText('Debe haber al menos 2 categorías visibles.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar Supermercado' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ocultar Salud' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ocultar Salud' })).toHaveAccessibleDescription(
      'Debe haber al menos 2 categorías visibles.',
    );
  });
});

describe('AJU-A4: descargar respaldo', () => {
  it('baja mis-gastos-respaldo-2026-11-17.json y actualiza la fecha del último respaldo', async () => {
    const { usuario, db } = await abrir();
    expect(screen.getByText('Todavía no has hecho un respaldo.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Descargar respaldo' }));
    await waitFor(() => expect(screen.getByText('Último respaldo: 17 de noviembre de 2026.')).toBeInTheDocument());

    expect(descargas).toHaveLength(1);
    expect(descargas[0]!.nombre).toBe('mis-gastos-respaldo-2026-11-17.json');
    const contenido = JSON.parse(await descargas[0]!.contenido.text()) as Record<string, unknown>;
    expect(contenido.app).toBe('mis-gastos');
    expect(contenido.exportadoEn).toBe('2026-11-17T21:30:00');
    expect((contenido.gastos as unknown[]).length).toBe(3);
    expect((await leerTodo(db)).ajustes.ultimoRespaldo).toBe('2026-11-17T21:30:00');
  });
});

/** Elige un archivo en el selector oculto, como lo haría el selector de archivos del Mac. */
function elegirArchivo(contenido: string, nombre = 'respaldo.json') {
  const archivo = new File([contenido], nombre, { type: 'application/json' });
  fireEvent.change(screen.getByLabelText('Archivo de respaldo'), { target: { files: [archivo] } });
}

describe('AJU-A5: restaurar un respaldo válido', () => {
  it('después de confirmar, todos los datos son los del archivo; Deshacer devuelve los anteriores', async () => {
    const { usuario, db } = await abrir();
    const antes = await leerTodo(db);
    const otro = crearDatosDeEjemplo('2026-11-17');
    const archivo = crearRespaldo(otro, '2026-11-02T08:15:00');

    elegirArchivo(textoRespaldo(archivo));
    const dialogo = await screen.findByRole('alertdialog');
    expect(dialogo).toHaveTextContent('¿Reemplazar todos tus datos por los del respaldo del 2 de noviembre de 2026?');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Se restauró el respaldo.'));
    const despues = await leerTodo(db);
    const porId = <T extends { id: string }>(lista: T[]) => [...lista].sort((a, b) => a.id.localeCompare(b.id));
    expect(porId(despues.categorias)).toEqual(porId(archivo.categorias));
    expect(porId(despues.gastosRecurrentes)).toEqual(porId(archivo.gastosRecurrentes));
    expect(porId(despues.pagosRecurrentes)).toEqual(porId(archivo.pagosRecurrentes));
    expect(porId(despues.gastos)).toEqual(porId(archivo.gastos));
    expect(despues.ajustes).toEqual({ versionEsquema: VERSION_ESQUEMA, ultimoRespaldo: '2026-11-02T08:15:00' });
    expect(screen.getByText('Último respaldo: 2 de noviembre de 2026.')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Deshacer' }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    const deshecho = await leerTodo(db);
    expect(porId(deshecho.gastos)).toEqual(porId(antes.gastos));
    expect(porId(deshecho.categorias)).toEqual(porId(antes.categorias));
  });

  it('Cancelar en la confirmación no cambia nada', async () => {
    const { usuario, db } = await abrir();
    const antes = await leerTodo(db);
    elegirArchivo(textoRespaldo(crearRespaldo(crearDatosDeEjemplo('2026-11-17'), '2026-11-02T08:15:00')));
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(await leerTodo(db)).toEqual(antes);
  });
});

describe('AJU-A6: un archivo que no es respaldo', () => {
  it.each([
    ['texto cualquiera', 'Lista del supermercado: pan, leche'],
    ['JSON de otra cosa', '{"nombre": "algo"}'],
  ])('%s: muestra el mensaje y los datos no cambian', async (_, contenido) => {
    const { db } = await abrir();
    const antes = await leerTodo(db);
    elegirArchivo(contenido, 'otro.json');
    await waitFor(() => expect(screen.getByText('Este archivo no es un respaldo de Mis gastos.')).toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await leerTodo(db)).toEqual(antes);
  });
});

describe('AJU-3: versión', () => {
  it('muestra la versión de la app', async () => {
    await abrir();
    expect(screen.getByText(/^Versión \d+\.\d+\.\d+$/)).toBeInTheDocument();
  });
});

describe('AJU-A7: aviso de respaldo en el Resumen', () => {
  it('con el último respaldo de hace más de 30 días se muestra; al hacer el respaldo desaparece', async () => {
    const db = await prepararBase();
    await guardarAjustes(db, { versionEsquema: 1, ultimoRespaldo: '2026-10-10T09:00:00' });
    const usuario = userEvent.setup();
    render(<App db={db} obtenerHoy={() => HOY} />);
    await waitFor(() => expect(screen.getByText('Hace más de un mes que no haces un respaldo.')).toBeInTheDocument());

    await usuario.click(screen.getByRole('button', { name: 'Hacer respaldo ahora' }));
    await waitFor(() => expect(screen.queryByText('Hace más de un mes que no haces un respaldo.')).not.toBeInTheDocument());
    expect(descargas).toHaveLength(1);
    expect(descargas[0]!.nombre).toBe('mis-gastos-respaldo-2026-11-17.json');
  });

  it('con un respaldo reciente no se muestra', async () => {
    const db = await prepararBase();
    await guardarAjustes(db, { versionEsquema: 1, ultimoRespaldo: '2026-11-01T09:00:00' });
    render(<App db={db} obtenerHoy={() => HOY} />);
    await waitFor(() => expect(screen.getByText('Llevas gastado en noviembre')).toBeInTheDocument());
    expect(screen.queryByText('Hace más de un mes que no haces un respaldo.')).not.toBeInTheDocument();
  });
});
