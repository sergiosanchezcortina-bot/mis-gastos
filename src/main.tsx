import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// DM Sans va empaquetada en el sitio: nunca se pide a Google Fonts.
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './estilos/tokens.css';
import './estilos/base.css';
import { App } from './App';
import { abrirBase, pedirAlmacenamientoPersistente, reemplazarTodo, vaciarTodo, type BaseDeDatos } from './datos/db';

/**
 * Solo en desarrollo (npm run dev):
 *   ?datos=ejemplo  reemplaza todo por seis meses de datos de ejemplo.
 *   ?datos=vacio    deja la app como recién instalada.
 * En la versión publicada este bloque no existe.
 */
async function cargarDatosDeDesarrollo(db: BaseDeDatos): Promise<void> {
  const url = new URL(window.location.href);
  const pedido = url.searchParams.get('datos');
  if (pedido === 'ejemplo') {
    const { crearDatosDeEjemplo } = await import('./datos/ejemplo');
    await reemplazarTodo(db, crearDatosDeEjemplo());
  } else if (pedido === 'vacio') {
    await vaciarTodo(db);
  } else {
    return;
  }
  // Se quita de la dirección para que recargar la página no vuelva a borrar los datos.
  url.searchParams.delete('datos');
  window.history.replaceState(null, '', url);
}

async function iniciar(): Promise<void> {
  const db = await abrirBase();
  void pedirAlmacenamientoPersistente();
  if (import.meta.env.DEV) await cargarDatosDeDesarrollo(db);

  const raiz = document.getElementById('raiz');
  if (!raiz) throw new Error('Falta el elemento #raiz en index.html');
  createRoot(raiz).render(
    <StrictMode>
      <App db={db} />
    </StrictMode>,
  );
}

void iniciar();
