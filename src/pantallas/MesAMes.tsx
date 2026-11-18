import { BarraAvance } from '../componentes/BarraAvance';
import { formatearMonto } from '../dominio/montos';
import type { FilaMesAMes } from '../dominio/resumen';

/** Hasta cuatro meses con su total. El mes en curso lleva el color de acento (RES-6). */
export function MesAMes({ filas }: { filas: FilaMesAMes[] }) {
  return (
    <section className="caja panel panel--angosto" aria-labelledby="titulo-mes-a-mes">
      <h2 id="titulo-mes-a-mes" className="subtitulo">
        Mes a mes
      </h2>
      <ul className="lista-barras">
        {filas.map((fila) => (
          <li key={fila.mes} className="fila-barra">
            <span className="fila-barra__linea">
              <span className="fila-barra__nombre">{fila.etiqueta}</span>
              <span className="fila-barra__monto">{formatearMonto(fila.total)}</span>
            </span>
            <BarraAvance proporcion={fila.proporcion} acento={fila.esActual} />
          </li>
        ))}
      </ul>
    </section>
  );
}
