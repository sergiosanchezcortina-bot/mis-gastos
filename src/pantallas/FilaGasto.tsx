import { Icono } from '../componentes/Icono';
import { textoFechaGasto } from '../dominio/gastos';
import { formatearMonto } from '../dominio/montos';
import type { Categoria, Gasto } from '../dominio/tipos';

type Props = {
  gasto: Gasto;
  categoria: Categoria | undefined;
  hoy: string;
  alCorregir: () => void;
};

export function FilaGasto({ gasto, categoria, hoy, alCorregir }: Props) {
  const fecha = textoFechaGasto(gasto.fecha, hoy);
  const nombre = categoria?.nombre ?? 'Sin categoría';
  const monto = formatearMonto(gasto.monto);
  return (
    <div className="fila-gasto">
      <div className="fila-gasto__fecha">{fecha}</div>
      <div className="fila-gasto__categoria">
        {categoria && <Icono nombre={categoria.icono} />}
        <span className="fila-gasto__textos">
          <span>{nombre}</span>
          {gasto.descripcion && <span className="fila-gasto__descripcion">{gasto.descripcion}</span>}
        </span>
      </div>
      <div className="fila-gasto__monto">{monto}</div>
      <div className="fila-gasto__accion">
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
