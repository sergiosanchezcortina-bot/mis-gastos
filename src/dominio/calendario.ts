/**
 * Cálculos de la pestaña Calendario (fase 8, CAL-1 a CAL-5). Funciones puras.
 *
 * Todo lo del mes se convierte en "elementos" con fecha, monto y estado. Desde ahí
 * salen el total estimado, la grilla de días y el acumulado por semana.
 */
import type { Categoria, Gasto, GastoRecurrente, PagoRecurrente } from './tipos';
import { diasDelMes, mesDeFecha, nombreDiaSemana, partesFecha } from './fechas';
import { diaVencimientoEn, estadoFila } from './recurrentes';

export type EstadoElemento = 'hecho' | 'pendiente' | 'vencido';

export type Elemento = {
  id: string;
  tipo: 'recurrente' | 'gasto' | 'porHacer';
  /** Día del mes (1 a 31), o null si es un recurrente sin día fijo y sin pagar. */
  dia: number | null;
  nombre: string;
  detalle: string | null; // descripción del gasto, si la hay
  monto: number;
  faltaMonto: boolean;
  estado: EstadoElemento;
  /** Para las acciones: el pago o el gasto original. */
  pago?: PagoRecurrente;
  gasto?: Gasto;
};

type Entrada = {
  mes: string;
  hoy: string;
  filas: ReadonlyArray<{ gasto: GastoRecurrente; pago: PagoRecurrente }>;
  gastos: readonly Gasto[];
  categorias: readonly Categoria[];
};

const diaDe = (fecha: string) => partesFecha(fecha).dia;

/** Todo lo del mes: recurrentes, gastos hechos y gastos por hacer. */
export function elementosDelMes({ mes, hoy, filas, gastos, categorias }: Entrada): Elemento[] {
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const elementos: Elemento[] = [];

  for (const { gasto, pago } of filas) {
    const estado = estadoFila(pago, gasto.diaVencimiento, hoy);
    elementos.push({
      id: pago.id,
      tipo: 'recurrente',
      dia: pago.pagado && pago.fechaPago ? diaDe(pago.fechaPago) : diaVencimientoEn(gasto.diaVencimiento, mes),
      nombre: gasto.nombre,
      detalle: null,
      monto: pago.monto ?? 0,
      faltaMonto: pago.monto === null,
      estado: pago.pagado ? 'hecho' : estado.tipo === 'vencio' ? 'vencido' : 'pendiente',
      pago,
    });
  }

  for (const g of gastos) {
    if (mesDeFecha(g.fecha) !== mes) continue;
    elementos.push({
      id: g.id,
      tipo: g.porHacer ? 'porHacer' : 'gasto',
      dia: diaDe(g.fecha),
      nombre: porId.get(g.categoriaId)?.nombre ?? 'Sin categoría',
      detalle: g.descripcion,
      monto: g.monto,
      faltaMonto: false,
      estado: !g.porHacer ? 'hecho' : g.fecha < hoy ? 'vencido' : 'pendiente',
      gasto: g,
    });
  }
  return elementos;
}

// ---------- CAL-1: cómo terminaría el mes ----------

export type Estimado = {
  gastado: number;
  recurrentesPorPagar: number;
  porHacer: number;
  total: number;
  /** El mes ya terminó: solo cuenta lo gastado. */
  terminado: boolean;
};

export function estimadoDelMes(elementos: readonly Elemento[], mes: string, hoy: string): Estimado {
  const terminado = mes < mesDeFecha(hoy);
  let gastado = 0;
  let recurrentesPorPagar = 0;
  let porHacer = 0;
  for (const e of elementos) {
    if (e.estado === 'hecho') gastado += e.monto;
    else if (terminado) continue;
    else if (e.tipo === 'recurrente') recurrentesPorPagar += e.monto;
    else porHacer += e.monto;
  }
  return { gastado, recurrentesPorPagar, porHacer, total: gastado + recurrentesPorPagar + porHacer, terminado };
}

// ---------- CAL-2: la grilla ----------

export type ResumenDia = { estado: EstadoElemento; cantidad: number; monto: number };

export type Dia = {
  dia: number;
  fecha: string;
  esHoy: boolean;
  /** Una línea por estado, en orden: vencido, pendiente, hecho. */
  resumen: ResumenDia[];
};

const ORDEN_ESTADOS: EstadoElemento[] = ['vencido', 'pendiente', 'hecho'];

/**
 * Semanas de lunes a domingo. Las casillas fuera del mes son null.
 * Un mes puede tener 4, 5 o 6 semanas.
 */
export function grillaDelMes(elementos: readonly Elemento[], mes: string, hoy: string): Array<Array<Dia | null>> {
  const total = diasDelMes(mes);
  const { anio, mes: numeroMes } = partesFecha(`${mes}-01`);
  // getDay(): 0 domingo ... 6 sábado. Se pasa a 0 lunes ... 6 domingo.
  const inicio = (new Date(anio, numeroMes - 1, 1).getDay() + 6) % 7;
  const casillas: Array<Dia | null> = Array.from({ length: inicio }, () => null);
  for (let dia = 1; dia <= total; dia++) {
    const fecha = `${mes}-${String(dia).padStart(2, '0')}`;
    const delDia = elementos.filter((e) => e.dia === dia);
    const resumen = ORDEN_ESTADOS.flatMap((estado) => {
      const suyos = delDia.filter((e) => e.estado === estado);
      return suyos.length === 0 ? [] : [{ estado, cantidad: suyos.length, monto: suyos.reduce((t, e) => t + e.monto, 0) }];
    });
    casillas.push({ dia, fecha, esHoy: fecha === hoy, resumen });
  }
  while (casillas.length % 7 !== 0) casillas.push(null);
  const semanas: Array<Array<Dia | null>> = [];
  for (let i = 0; i < casillas.length; i += 7) semanas.push(casillas.slice(i, i + 7));
  return semanas;
}

/** "Hoy, miércoles 18" o "Sábado 28", para el título de la lista de un día. */
export function tituloDia(fecha: string, hoy: string): string {
  const texto = `${nombreDiaSemana(fecha)} ${diaDe(fecha)}`;
  return fecha === hoy ? `Hoy, ${texto}` : texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function textoEstadoElemento(e: Pick<Elemento, 'estado' | 'tipo'>): string {
  if (e.estado === 'hecho') return e.tipo === 'recurrente' ? 'Pagado' : 'Hecho';
  if (e.estado === 'vencido') return e.tipo === 'recurrente' ? 'Venció' : '¿Lo hiciste?';
  return e.tipo === 'recurrente' ? 'Por pagar' : 'Por hacer';
}

/** El día que se muestra al abrir: hoy en el mes actual, el 1 en otro mes. */
export function diaInicial(mes: string, hoy: string): number {
  return mesDeFecha(hoy) === mes ? diaDe(hoy) : 1;
}

// ---------- CAL-4 y CAL-5: acumulado por semana ----------

export type Semana = {
  desde: number;
  hasta: number;
  /** Lo ya gastado hasta el final de la semana. */
  gastado: number;
  /** Lo gastado más lo que se estima para entonces. */
  estimado: number;
};

/**
 * Semanas de lunes a domingo, recortadas al mes. Lo pendiente cuenta en su día;
 * lo vencido, en el día de hoy (CAL-5); lo que no tiene día, al final del mes.
 * En un mes terminado solo cuenta lo gastado.
 */
export function acumuladoPorSemana(elementos: readonly Elemento[], mes: string, hoy: string): Semana[] {
  const total = diasDelMes(mes);
  const estimado = estimadoDelMes(elementos, mes, hoy);
  const diaHoy = mesDeFecha(hoy) === mes ? diaDe(hoy) : 1;

  const diaEfectivo = (e: Elemento): number => {
    if (e.estado === 'vencido') return diaHoy;
    return e.dia ?? total;
  };

  const { anio, mes: numeroMes } = partesFecha(`${mes}-01`);
  const semanas: Semana[] = [];
  let desde = 1;
  while (desde <= total) {
    const diaSemana = (new Date(anio, numeroMes - 1, desde).getDay() + 6) % 7;
    const hasta = Math.min(total, desde + (6 - diaSemana));
    let gastado = 0;
    let pendiente = 0;
    for (const e of elementos) {
      if (e.estado === 'hecho') {
        if ((e.dia ?? total) <= hasta) gastado += e.monto;
      } else if (!estimado.terminado && diaEfectivo(e) <= hasta) {
        pendiente += e.monto;
      }
    }
    semanas.push({ desde, hasta, gastado, estimado: gastado + pendiente });
    desde = hasta + 1;
  }
  return semanas;
}
