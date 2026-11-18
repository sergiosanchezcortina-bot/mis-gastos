/**
 * Almacenamiento en IndexedDB. La interfaz no habla con IndexedDB directamente:
 * siempre pasa por las funciones de este archivo.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Ajustes,
  Categoria,
  Comprobante,
  DatosCompletos,
  Gasto,
  GastoRecurrente,
  PagoRecurrente,
} from '../dominio/tipos';
import { mesDeFecha } from '../dominio/fechas';

export const NOMBRE_BASE = 'mis-gastos';
export const VERSION_ESQUEMA = 3;
const CLAVE_AJUSTES = 'ajustes';

interface EsquemaMisGastos extends DBSchema {
  categorias: { key: string; value: Categoria };
  gastosRecurrentes: { key: string; value: GastoRecurrente };
  pagosRecurrentes: {
    key: string;
    value: PagoRecurrente;
    indexes: { porMes: string; porGastoRecurrente: string };
  };
  gastos: { key: string; value: Gasto; indexes: { porFecha: string } };
  ajustes: { key: string; value: Ajustes };
  comprobantes: { key: string; value: Comprobante };
}

export type BaseDeDatos = IDBPDatabase<EsquemaMisGastos>;

const ALMACENES = ['categorias', 'gastosRecurrentes', 'pagosRecurrentes', 'gastos', 'ajustes', 'comprobantes'] as const;

/** Las ocho categorías con que parte la app (brief, AJU-1). */
export function categoriasIniciales(): Categoria[] {
  const base: Array<Pick<Categoria, 'nombre' | 'icono'>> = [
    { nombre: 'Supermercado', icono: 'supermercado' },
    { nombre: 'Salud', icono: 'salud' },
    { nombre: 'Transporte', icono: 'transporte' },
    { nombre: 'Casa', icono: 'casa' },
    { nombre: 'Salidas', icono: 'salidas' },
    { nombre: 'Familia', icono: 'familia' },
    { nombre: 'Ropa', icono: 'ropa' },
    { nombre: 'Otro', icono: 'otro' },
  ];
  return base.map((c, i) => ({ ...c, id: crypto.randomUUID(), visible: true, orden: i }));
}

function ajustesIniciales(): Ajustes {
  return { versionEsquema: VERSION_ESQUEMA, ultimoRespaldo: null };
}

export function abrirBase(nombre: string = NOMBRE_BASE): Promise<BaseDeDatos> {
  return openDB<EsquemaMisGastos>(nombre, VERSION_ESQUEMA, {
    upgrade(db, versionAnterior, _versionNueva, transaccion) {
      if (versionAnterior < 1) {
        db.createObjectStore('categorias', { keyPath: 'id' });
        db.createObjectStore('gastosRecurrentes', { keyPath: 'id' });
        const pagos = db.createObjectStore('pagosRecurrentes', { keyPath: 'id' });
        pagos.createIndex('porMes', 'mes');
        pagos.createIndex('porGastoRecurrente', 'gastoRecurrenteId');
        const gastos = db.createObjectStore('gastos', { keyPath: 'id' });
        gastos.createIndex('porFecha', 'fecha');
        db.createObjectStore('ajustes');

        for (const categoria of categoriasIniciales()) {
          void transaccion.objectStore('categorias').put(categoria);
        }
        void transaccion.objectStore('ajustes').put(ajustesIniciales(), CLAVE_AJUSTES);
      }
      if (versionAnterior >= 1 && versionAnterior < 2) {
        // Versión 2 (fase 7): los gastos no recurrentes tienen descripción opcional.
        void (async () => {
          let cursor = await transaccion.objectStore('gastos').openCursor();
          while (cursor) {
            if (cursor.value.descripcion === undefined) await cursor.update({ ...cursor.value, descripcion: null });
            cursor = await cursor.continue();
          }
        })();
      }
      if (versionAnterior < 2) {
        // Versión 2 (fase 7): un comprobante por pago de gasto recurrente.
        db.createObjectStore('comprobantes', { keyPath: 'pagoId' });
      }
      if (versionAnterior >= 1 && versionAnterior < 3) {
        // Versión 3 (fase 8): repetición de los gastos recurrentes. Los que existen quedan mensuales.
        void (async () => {
          let cursor = await transaccion.objectStore('gastosRecurrentes').openCursor();
          while (cursor) {
            if (cursor.value.cadaMeses === undefined) {
              await cursor.update({ ...cursor.value, cadaMeses: 1, ancla: cursor.value.desde });
            }
            cursor = await cursor.continue();
          }
        })();
      }
      // Las migraciones de versiones futuras van aquí, una por versión.
    },
  });
}

export async function leerCategorias(db: BaseDeDatos): Promise<Categoria[]> {
  const categorias = await db.getAll('categorias');
  return categorias.sort((a, b) => a.orden - b.orden);
}

export async function leerAjustes(db: BaseDeDatos): Promise<Ajustes> {
  return (await db.get('ajustes', CLAVE_AJUSTES)) ?? ajustesIniciales();
}

export async function guardarCategoria(db: BaseDeDatos, categoria: Categoria): Promise<void> {
  await db.put('categorias', categoria);
}

export async function guardarAjustes(db: BaseDeDatos, ajustes: Ajustes): Promise<void> {
  await db.put('ajustes', ajustes, CLAVE_AJUSTES);
}

export async function guardarGasto(db: BaseDeDatos, gasto: Gasto): Promise<void> {
  await db.put('gastos', gasto);
}

export async function leerGastos(db: BaseDeDatos): Promise<Gasto[]> {
  return db.getAll('gastos');
}

/**
 * El mes más antiguo con algún dato real: un gasto no recurrente o un gasto
 * recurrente marcado como pagado. Las filas de recurrentes sin pagar no cuentan,
 * porque la app las crea sola cada mes.
 */
export async function primerMesConDatos(db: BaseDeDatos): Promise<string | null> {
  const tx = db.transaction(['gastos', 'pagosRecurrentes'], 'readonly');
  const primerGasto = await tx.objectStore('gastos').index('porFecha').openCursor();
  let primero: string | null = primerGasto ? mesDeFecha(primerGasto.value.fecha) : null;

  let cursor = await tx.objectStore('pagosRecurrentes').index('porMes').openCursor();
  while (cursor) {
    if (cursor.value.pagado) {
      if (primero === null || cursor.value.mes < primero) primero = cursor.value.mes;
      break; // El índice va en orden de mes: el primero pagado es el más antiguo.
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return primero;
}

export async function leerTodo(db: BaseDeDatos): Promise<DatosCompletos> {
  const tx = db.transaction([...ALMACENES], 'readonly');
  const [categorias, gastosRecurrentes, pagosRecurrentes, gastos, ajustes, comprobantes] = await Promise.all([
    tx.objectStore('categorias').getAll(),
    tx.objectStore('gastosRecurrentes').getAll(),
    tx.objectStore('pagosRecurrentes').getAll(),
    tx.objectStore('gastos').getAll(),
    tx.objectStore('ajustes').get(CLAVE_AJUSTES),
    tx.objectStore('comprobantes').getAll(),
  ]);
  await tx.done;
  return {
    categorias,
    gastosRecurrentes,
    pagosRecurrentes,
    gastos,
    comprobantes,
    ajustes: ajustes ?? ajustesIniciales(),
  };
}

/**
 * Reemplaza todos los datos en una sola transacción. Si algo falla, no cambia nada.
 * Lo usan los datos de ejemplo y, desde la fase 4, la restauración de un respaldo.
 */
export async function reemplazarTodo(db: BaseDeDatos, datos: DatosCompletos): Promise<void> {
  const tx = db.transaction([...ALMACENES], 'readwrite');
  // Cada operación se encola sin esperarla. Si una falla, IndexedDB anula la
  // transacción completa y tx.done rechaza con ese error.
  const encolar = (operacion: () => Promise<unknown>) => {
    try {
      operacion().catch(() => undefined); // El error se informa en tx.done.
    } catch (error) {
      // Un valor inválido puede fallar antes de crear la solicitud.
      tx.abort();
      throw error;
    }
  };
  try {
    for (const nombre of ALMACENES) encolar(() => tx.objectStore(nombre).clear());
    for (const c of datos.categorias) encolar(() => tx.objectStore('categorias').put(c));
    for (const g of datos.gastosRecurrentes) encolar(() => tx.objectStore('gastosRecurrentes').put(g));
    for (const p of datos.pagosRecurrentes) encolar(() => tx.objectStore('pagosRecurrentes').put(p));
    for (const g of datos.gastos) encolar(() => tx.objectStore('gastos').put(g));
    for (const c of datos.comprobantes) encolar(() => tx.objectStore('comprobantes').put(c));
    encolar(() => tx.objectStore('ajustes').put(datos.ajustes, CLAVE_AJUSTES));
  } catch (error) {
    await tx.done.catch(() => undefined);
    throw error;
  }
  await tx.done;
}

/** Deja la base como recién instalada: solo categorías iniciales y ajustes. */
export async function vaciarTodo(db: BaseDeDatos): Promise<void> {
  await reemplazarTodo(db, {
    categorias: categoriasIniciales(),
    gastosRecurrentes: [],
    pagosRecurrentes: [],
    gastos: [],
    comprobantes: [],
    ajustes: ajustesIniciales(),
  });
}

/**
 * Pide al navegador que no borre los datos de este sitio cuando falta espacio.
 * Safari puede negarlo; en ese caso el respaldo a archivo es la protección.
 */
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
