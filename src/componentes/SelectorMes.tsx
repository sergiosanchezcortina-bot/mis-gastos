import { nombreMesConAnio } from '../dominio/fechas';
import { useMes } from '../estado/MesContext';
import { Icono } from './Icono';

type Props = {
  /** En el Resumen el nombre del mes es el título de la pantalla. */
  comoTitulo?: boolean;
};

export function SelectorMes({ comoTitulo = false }: Props) {
  const { mesSeleccionado, puedeIrAnterior, puedeIrSiguiente, irAnterior, irSiguiente } = useMes();
  const nombre = nombreMesConAnio(mesSeleccionado);

  return (
    <div className="selector-mes">
      <button
        type="button"
        className="boton-redondo"
        aria-label="Mes anterior"
        disabled={!puedeIrAnterior}
        onClick={irAnterior}
      >
        <Icono nombre="anterior" />
      </button>
      {comoTitulo ? (
        <h1 className="titulo-pantalla" aria-live="polite">
          {nombre}
        </h1>
      ) : (
        <div className="selector-mes__nombre" aria-live="polite">
          {nombre}
        </div>
      )}
      <button
        type="button"
        className="boton-redondo"
        aria-label="Mes siguiente"
        disabled={!puedeIrSiguiente}
        onClick={irSiguiente}
      >
        <Icono nombre="siguiente" />
      </button>
    </div>
  );
}
