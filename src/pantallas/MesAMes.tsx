import { useState } from 'react';
import { Icono } from '../componentes/Icono';
import { formatearMonto } from '../dominio/montos';
import type { FilaMesAMes, TramoMes } from '../dominio/resumen';

type Props = {
  filas: FilaMesAMes[];
  /** Tramos de la leyenda, con sus montos del mes seleccionado (RES-10). */
  leyenda: TramoMes[];
  /** "noviembre" */
  nombreMesSeleccionado: string;
};

const textoTramos = (tramos: TramoMes[]) => tramos.map((t) => `${t.nombre}, ${formatearMonto(t.total)}`).join('; ');

/**
 * Gráfico de barras verticales con hasta seis meses (RES-6). El botón "Por categorías"
 * divide cada barra en tramos y muestra la leyenda con nombres y montos (RES-10).
 */
export function MesAMes({ filas, leyenda, nombreMesSeleccionado }: Props) {
  const [porCategorias, setPorCategorias] = useState(false);

  return (
    <section className="caja panel mes-a-mes" aria-labelledby="titulo-mes-a-mes">
      <div className="mes-a-mes__titulo">
        <h2 id="titulo-mes-a-mes" className="subtitulo">
          Mes a mes
        </h2>
        <button
          type="button"
          className="opcion opcion--pildora"
          aria-pressed={porCategorias}
          onClick={() => setPorCategorias(!porCategorias)}
        >
          {porCategorias && <Icono nombre="check" />}
          <span className="opcion__texto">Por categorías</span>
        </button>
      </div>

      <ul className="grafico">
        {filas.map((fila) => (
          <li key={fila.mes} className="grafico__columna">
            <span className="grafico__monto">{formatearMonto(fila.total)}</span>
            <span className="grafico__area" aria-hidden="true">
              <span
                className={
                  porCategorias
                    ? 'grafico__barra grafico__barra--tramos'
                    : fila.esActual
                      ? 'grafico__barra grafico__barra--acento'
                      : 'grafico__barra'
                }
                style={{ height: `${fila.proporcion * 100}%` }}
              >
                {porCategorias &&
                  fila.tramos.map((t) => (
                    <span
                      key={t.clave}
                      className={`grafico__tramo tramo--${t.color}`}
                      style={{ flexGrow: t.total }}
                    />
                  ))}
              </span>
            </span>
            <span className="grafico__mes">{fila.etiqueta}</span>
            {porCategorias && <span className="solo-lector">{textoTramos(fila.tramos)}</span>}
          </li>
        ))}
      </ul>

      {porCategorias && (
        <div className="leyenda">
          <h3 className="leyenda__titulo">Por categorías en {nombreMesSeleccionado}</h3>
          <ul className="leyenda__lista">
            {leyenda.map((t) => (
              <li key={t.clave} className="leyenda__item">
                <span className={`leyenda__muestra tramo--${t.color}`} aria-hidden="true" />
                <span className="leyenda__nombre">{t.nombre}</span>
                <span className="leyenda__monto">{formatearMonto(t.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
