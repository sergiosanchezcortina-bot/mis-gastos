/**
 * Fechas y meses como texto local, sin horas ni zonas horarias.
 * Fecha: "AAAA-MM-DD". Mes: "AAAA-MM".
 * Nunca usar toISOString(): convierte a UTC y puede cambiar el día.
 */

const NOMBRES_MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const PATRON_MES = /^(\d{4})-(\d{2})$/;
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function armarMes(anio: number, mes: number): string {
  return `${anio}-${dosDigitos(mes)}`;
}

/** Separa "AAAA-MM" en año y número de mes (1 a 12). */
export function partesMes(mes: string): { anio: number; mes: number } {
  const coincidencia = PATRON_MES.exec(mes);
  if (!coincidencia) throw new RangeError(`Mes inválido: ${mes}`);
  const anio = Number(coincidencia[1]);
  const numero = Number(coincidencia[2]);
  if (numero < 1 || numero > 12) throw new RangeError(`Mes inválido: ${mes}`);
  return { anio, mes: numero };
}

/** La fecha de hoy en hora local: "2026-11-17". */
export function fechaLocal(ahora: Date = new Date()): string {
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}

/** El mes al que pertenece una fecha: "2026-11-17" -> "2026-11". */
export function mesDeFecha(fecha: string): string {
  const coincidencia = PATRON_FECHA.exec(fecha);
  if (!coincidencia) throw new RangeError(`Fecha inválida: ${fecha}`);
  return `${coincidencia[1]}-${coincidencia[2]}`;
}

export function mesAnterior(mes: string): string {
  const p = partesMes(mes);
  return p.mes === 1 ? armarMes(p.anio - 1, 12) : armarMes(p.anio, p.mes - 1);
}

export function mesSiguiente(mes: string): string {
  const p = partesMes(mes);
  return p.mes === 12 ? armarMes(p.anio + 1, 1) : armarMes(p.anio, p.mes + 1);
}

/** Cantidad de días del mes, considerando años bisiestos. */
export function diasDelMes(mes: string): number {
  const p = partesMes(mes);
  // El día 0 del mes siguiente es el último día de este mes.
  return new Date(p.anio, p.mes, 0).getDate();
}

/** Nombre del mes en minúscula, para usar dentro de una frase: "noviembre". */
export function nombreMes(mes: string): string {
  const nombre = NOMBRES_MESES[partesMes(mes).mes - 1];
  if (nombre === undefined) throw new RangeError(`Mes inválido: ${mes}`);
  return nombre;
}

/** Nombre del mes con año, para títulos: "Noviembre 2026". */
export function nombreMesConAnio(mes: string): string {
  const nombre = nombreMes(mes);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${partesMes(mes).anio}`;
}

/**
 * Hasta dónde se puede mover el selector de mes.
 * "Mes siguiente" se desactiva en el mes actual.
 * "Mes anterior" se desactiva en el primer mes con datos, o en el mes actual si no hay datos.
 * Los textos "AAAA-MM" se pueden comparar como texto.
 */
export function limitesSelectorMes(
  mesSeleccionado: string,
  mesActual: string,
  primerMesConDatos: string | null,
): { puedeIrAnterior: boolean; puedeIrSiguiente: boolean } {
  const tope = primerMesConDatos !== null && primerMesConDatos < mesActual ? primerMesConDatos : mesActual;
  return {
    puedeIrAnterior: mesSeleccionado > tope,
    puedeIrSiguiente: mesSeleccionado < mesActual,
  };
}
