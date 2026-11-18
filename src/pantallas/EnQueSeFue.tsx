import { useState } from 'react';
import { BarraAvance } from '../componentes/BarraAvance';
import { Icono } from '../componentes/Icono';
import { textoFechaGasto } from '../dominio/gastos';
import { formatearMonto } from '../dominio/montos';
import { compararPorVencimiento } from '../dominio/recurrentes';
import type { FilaEnQueSeFue } from '../dominio/resumen';
import type { GastoRecurrente } from '../dominio/tipos';

type Props = {
  filas: FilaEnQueSeFue[];
  gastosRecurrentes: GastoRecurrente[];
  hoy: string;
};

type Detalle = { id: string; texto: string; monto: number };

/** Lo que se ve al abrir una fila (RES-5). Recurrentes: nombre y monto. Categorías: fecha y monto. */
function detalleDe(fila: FilaEnQueSeFue, recurrentes: Map<string, GastoRecurrente>, hoy: string): Detalle[] {
  if (fila.tipo === 'categoria') {
    return fila.gastos.map((g) => ({
      id: g.id,
      texto: g.descripcion ? `${textoFechaGasto(g.fecha, hoy)}: ${g.descripcion}` : textoFechaGasto(g.fecha, hoy),
      monto: g.monto,
    }));
  }
  return fila.pagos
    .map((p) => ({ pago: p, gasto: recurrentes.get(p.gastoRecurrenteId) }))
    .sort((a, b) =>
      a.gasto && b.gasto ? compararPorVencimiento(a.gasto, b.gasto) : 0,
    )
    .map(({ pago, gasto }) => ({ id: pago.id, texto: gasto?.nombre ?? 'Gasto recurrente', monto: pago.monto ?? 0 }));
}

export function EnQueSeFue({ filas, gastosRecurrentes, hoy }: Props) {
  // Solo una fila abierta a la vez.
  const [abierta, setAbierta] = useState<string | null>(null);
  const porId = new Map(gastosRecurrentes.map((g) => [g.id, g]));

  return (
    <section className="caja panel panel--ancho" aria-labelledby="titulo-en-que">
      <div className="panel__titulo">
        <h2 id="titulo-en-que" className="subtitulo">
          ¿En qué se fue?
        </h2>
        <div className="ayuda">Haz clic en una categoría para ver sus gastos.</div>
      </div>
      <ul className="lista-barras">
        {filas.map((fila) => {
          const nombre = fila.tipo === 'recurrentes' ? 'Gastos recurrentes' : fila.categoria.nombre;
          const icono = fila.tipo === 'recurrentes' ? 'recurrentes' : fila.categoria.icono;
          const estaAbierta = abierta === fila.clave;
          const idDetalle = `detalle-${fila.clave}`;
          return (
            <li key={fila.clave}>
              <button
                type="button"
                className="fila-barra fila-barra--boton"
                aria-expanded={estaAbierta}
                aria-controls={idDetalle}
                onClick={() => setAbierta(estaAbierta ? null : fila.clave)}
              >
                <span className="fila-barra__linea">
                  <Icono nombre={icono} />
                  <span className="fila-barra__nombre">{nombre}</span>
                  <span className="fila-barra__monto">{formatearMonto(fila.total)}</span>
                  <span className={estaAbierta ? 'flecha flecha--abierta' : 'flecha'}>
                    <Icono nombre="abajo" />
                  </span>
                </span>
                <BarraAvance proporcion={fila.proporcion} />
              </button>
              {estaAbierta && (
                <ul id={idDetalle} className="detalle-barra" aria-label={`Gastos de ${nombre}`}>
                  {detalleDe(fila, porId, hoy).map((d) => (
                    <li key={d.id}>
                      <span>{d.texto}</span>
                      <span className="detalle-barra__monto">{formatearMonto(d.monto)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
