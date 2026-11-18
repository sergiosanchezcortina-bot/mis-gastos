import { Icono } from '../componentes/Icono';
import { porHacerVencido, textoFechaGasto, textoPorHacer } from '../dominio/gastos';
import { formatearMonto } from '../dominio/montos';
import type { Categoria, Gasto } from '../dominio/tipos';

type Props = {
  gasto: Gasto;
  categoria: Categoria | undefined;
  hoy: string;
  alCorregir: () => void;
  /** Gastos por hacer (NOR-11). */
  alHacer: () => void;
  alNoHacer: () => void;
};

export function FilaGasto({ gasto, categoria, hoy, alCorregir, alHacer, alNoHacer }: Props) {
  const nombre = categoria?.nombre ?? 'Sin categoría';
  const monto = formatearMonto(gasto.monto);
  const vencido = porHacerVencido(gasto, hoy);
  const fecha = gasto.porHacer ? textoPorHacer(gasto.fecha, hoy) : textoFechaGasto(gasto.fecha, hoy);
  const clase = gasto.porHacer ? `fila-gasto fila-gasto--por-hacer${vencido ? ' fila-gasto--vencido' : ''}` : 'fila-gasto';

  return (
    <div className={clase}>
      <div className="fila-gasto__fecha">
        {gasto.porHacer ? (
          <span className={vencido ? 'estado estado--alerta' : 'estado estado--por-hacer'}>
            <Icono nombre={vencido ? 'alerta' : 'reloj'} />
            {fecha}
          </span>
        ) : (
          fecha
        )}
      </div>
      <div className="fila-gasto__categoria">
        {categoria && <Icono nombre={categoria.icono} />}
        <span className="fila-gasto__textos">
          <span>{nombre}</span>
          {gasto.descripcion && <span className="fila-gasto__descripcion">{gasto.descripcion}</span>}
        </span>
      </div>
      <div className="fila-gasto__monto">{monto}</div>
      <div className="fila-gasto__accion">
        {gasto.porHacer && (
          <button
            type="button"
            className="boton-hecho"
            aria-label={`Ya lo hice: ${nombre}, ${monto}`}
            onClick={alHacer}
          >
            <Icono nombre="check" />
            Ya lo hice
          </button>
        )}
        {vencido && (
          <button type="button" className="boton-enlace" aria-label={`No lo hice: ${nombre}, ${monto}`} onClick={alNoHacer}>
            No lo hice
          </button>
        )}
        <button
          type="button"
          className="boton-enlace"
          data-corregir={gasto.id}
          aria-label={`Corregir gasto de ${monto} en ${nombre}, ${fecha}`}
          onClick={alCorregir}
        >
          Corregir
        </button>
      </div>
    </div>
  );
}
