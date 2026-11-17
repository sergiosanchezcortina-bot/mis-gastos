/**
 * Datos de ejemplo, solo para desarrollo. Nunca se incluyen en la versión publicada:
 * main.tsx los importa únicamente cuando import.meta.env.DEV es verdadero.
 *
 * Se cargan abriendo la app con ?datos=ejemplo y se borran con ?datos=vacio.
 */
import type {
  ClaveIcono,
  DatosCompletos,
  Gasto,
  GastoRecurrente,
  PagoRecurrente,
} from '../dominio/tipos';
import { diasDelMes, fechaLocal, mesAnterior, mesDeFecha, partesMes } from '../dominio/fechas';
import { categoriasIniciales, VERSION_ESQUEMA } from './db';

const RECURRENTES: Array<{ nombre: string; dia: number | null; monto: number }> = [
  { nombre: 'Gastos comunes', dia: 5, monto: 120000 },
  { nombre: 'Celular e internet', dia: 10, monto: 52000 },
  { nombre: 'Luz', dia: 15, monto: 38000 },
  { nombre: 'Agua', dia: 20, monto: 18000 },
  { nombre: 'Gas', dia: 25, monto: 27000 },
  { nombre: 'Seguro del auto', dia: 28, monto: 42000 },
];

const MONTOS_POR_CATEGORIA: Record<ClaveIcono, number[]> = {
  supermercado: [23500, 41200, 18900, 35600, 12300, 27800],
  salud: [8500, 12990, 24000],
  transporte: [30000, 10500, 25000],
  casa: [15990, 8900],
  salidas: [14000, 9500, 22000],
  familia: [20000, 15000],
  ropa: [29990],
  otro: [5000, 7000],
};

/** Generador pseudoaleatorio con semilla, para que los datos sean siempre los mismos. */
function crearAzar(semilla: number): () => number {
  let estado = semilla;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado / 2147483648;
  };
}

function elegir<T>(lista: readonly T[], azar: () => number): T {
  const elemento = lista[Math.floor(azar() * lista.length)];
  if (elemento === undefined) throw new Error('Lista vacía');
  return elemento;
}

function fechaDelMes(mes: string, dia: number): string {
  return `${mes}-${String(Math.min(dia, diasDelMes(mes))).padStart(2, '0')}`;
}

/** Seis meses de datos que terminan hoy. */
export function crearDatosDeEjemplo(hoy: string = fechaLocal()): DatosCompletos {
  const mesActual = mesDeFecha(hoy);
  const diaHoy = Number(hoy.slice(8, 10));
  const meses: string[] = [mesActual];
  for (let i = 0; i < 5; i++) meses.unshift(mesAnterior(meses[0] ?? mesActual));
  const primerMes = meses[0] ?? mesActual;
  const ahora = new Date().toISOString();
  const azar = crearAzar(partesMes(mesActual).anio * 100 + partesMes(mesActual).mes);

  const categorias = categoriasIniciales();
  const idPorIcono = new Map(categorias.map((c) => [c.icono, c.id]));

  const gastosRecurrentes: GastoRecurrente[] = RECURRENTES.map((r) => ({
    id: crypto.randomUUID(),
    nombre: r.nombre,
    diaVencimiento: r.dia,
    desde: primerMes,
    hasta: null,
    palabrasClave: [],
    creadoEn: ahora,
  }));

  const pagosRecurrentes: PagoRecurrente[] = [];
  const gastos: Gasto[] = [];

  for (const mes of meses) {
    const esActual = mes === mesActual;
    const ultimoDia = esActual ? diaHoy : diasDelMes(mes);

    gastosRecurrentes.forEach((plantilla, i) => {
      const base = RECURRENTES[i];
      if (!base) return;
      // Variación de hasta ±10 % en las cuentas que cambian (luz, agua, gas).
      const varia = ['Luz', 'Agua', 'Gas'].includes(base.nombre);
      const monto = varia ? Math.round((base.monto * (0.9 + azar() * 0.2)) / 100) * 100 : base.monto;
      const pagado = !esActual || (base.dia !== null && base.dia < diaHoy);
      pagosRecurrentes.push({
        id: crypto.randomUUID(),
        gastoRecurrenteId: plantilla.id,
        mes,
        monto,
        pagado,
        fechaPago: pagado ? fechaDelMes(mes, base.dia ?? diasDelMes(mes)) : null,
        origen: 'manual',
        movimientoId: null,
      });
    });

    for (let dia = 1; dia <= ultimoDia; dia++) {
      // Entre cero y dos gastos por día.
      const cantidad = azar() < 0.35 ? 0 : azar() < 0.75 ? 1 : 2;
      for (let n = 0; n < cantidad; n++) {
        const icono = elegir(
          ['supermercado', 'supermercado', 'supermercado', 'salud', 'transporte', 'transporte', 'casa', 'salidas', 'familia', 'ropa', 'otro'] as const,
          azar,
        );
        const categoriaId = idPorIcono.get(icono);
        if (!categoriaId) continue;
        gastos.push({
          id: crypto.randomUUID(),
          fecha: fechaDelMes(mes, dia),
          monto: elegir(MONTOS_POR_CATEGORIA[icono], azar),
          categoriaId,
          origen: 'manual',
          glosa: null,
          movimientoId: null,
          creadoEn: ahora,
          actualizadoEn: ahora,
        });
      }
    }
  }

  return {
    categorias,
    gastosRecurrentes,
    pagosRecurrentes,
    gastos,
    ajustes: { versionEsquema: VERSION_ESQUEMA, ultimoRespaldo: null },
  };
}
