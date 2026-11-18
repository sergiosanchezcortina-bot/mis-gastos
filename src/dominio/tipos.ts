/**
 * Modelo de datos. Ver docs/arquitectura.md, sección 2.1.
 * Montos: enteros en pesos chilenos. Fechas: "AAAA-MM-DD". Meses: "AAAA-MM".
 */

export type ClaveIcono =
  | 'supermercado'
  | 'salud'
  | 'transporte'
  | 'casa'
  | 'salidas'
  | 'familia'
  | 'ropa'
  | 'otro';

export type Categoria = {
  id: string;
  nombre: string;
  icono: ClaveIcono;
  visible: boolean;
  orden: number;
};

/** Cada cuántos meses se repite un gasto recurrente (fase 8). */
export type CadaMeses = 1 | 2 | 3 | 6 | 12;

/** Plantilla de un gasto que se repite. */
export type GastoRecurrente = {
  id: string;
  nombre: string;
  diaVencimiento: number | null; // 1 a 31
  desde: string; // primer mes en que aplica
  hasta: string | null; // último mes en que aplica; null = sigue vigente
  palabrasClave: string[]; // fase 6
  creadoEn: string; // fecha y hora ISO
  cadaMeses: CadaMeses; // fase 8; 1 = cada mes
  ancla: string; // mes desde el que se cuenta la repetición (AAAA-MM)
};

/** Una fila por gasto recurrente y por mes. */
export type PagoRecurrente = {
  id: string;
  gastoRecurrenteId: string;
  mes: string;
  monto: number | null; // null = falta el monto
  pagado: boolean;
  fechaPago: string | null;
  origen: 'manual' | 'cartola';
  movimientoId: string | null; // fase 6
};

/** Gasto no recurrente. */
export type Gasto = {
  id: string;
  fecha: string;
  monto: number; // entero mayor que 0
  categoriaId: string;
  descripcion: string | null; // texto libre opcional, hasta 60 caracteres (fase 7)
  porHacer: boolean; // fase 8: true = todavía no se hace; no cuenta como gastado
  origen: 'manual' | 'cartola';
  glosa: string | null; // fase 6
  movimientoId: string | null; // fase 6
  creadoEn: string;
  actualizadoEn: string;
};

/** Comprobante de un gasto recurrente en un mes (fase 7). Uno por pago, como máximo. */
export type Comprobante = {
  pagoId: string;
  nombre: string; // nombre del archivo
  tipo: string; // tipo MIME; puede venir vacío
  tamano: number; // bytes
  datos: ArrayBuffer;
  agregadoEn: string; // fecha y hora ISO
};

export type Ajustes = {
  versionEsquema: number;
  ultimoRespaldo: string | null; // fecha y hora ISO
};

/** Todos los datos de la app. Es la misma forma que tendrá el respaldo. */
export type DatosCompletos = {
  categorias: Categoria[];
  gastosRecurrentes: GastoRecurrente[];
  pagosRecurrentes: PagoRecurrente[];
  gastos: Gasto[];
  comprobantes: Comprobante[];
  ajustes: Ajustes;
};
