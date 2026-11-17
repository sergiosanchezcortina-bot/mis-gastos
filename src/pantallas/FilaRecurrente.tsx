import { CampoMonto } from '../componentes/CampoMonto';
import { Icono } from '../componentes/Icono';
import { esAlerta, estadoFila, textoEstado } from '../dominio/recurrentes';
import type { FilaRecurrente as Fila } from '../datos/recurrentes';

type Props = {
  fila: Fila;
  hoy: string;
  editandoLista: boolean;
  alMarcar: () => void;
  alCambiarMonto: (monto: number | null) => void;
  alCambiarNombreODia: () => void;
  alQuitar: () => void;
};

export function FilaRecurrente({ fila, hoy, editandoLista, alMarcar, alCambiarMonto, alCambiarNombreODia, alQuitar }: Props) {
  const { gasto, pago } = fila;
  const estado = estadoFila(pago, gasto.diaVencimiento, hoy);
  const alerta = esAlerta(estado);
  const idCasilla = `pagado-${pago.id}`;
  const idEstado = `estado-${pago.id}`;

  return (
    <div className="fila-recurrente">
      <div className="tabla__col-pagado">
        {/* La casilla mide 32 px; su etiqueta la agranda a 48 × 48 px de área clicable. */}
        <label className="casilla" htmlFor={idCasilla}>
          <input
            id={idCasilla}
            type="checkbox"
            checked={pago.pagado}
            onChange={alMarcar}
            aria-label={gasto.nombre}
            aria-describedby={idEstado}
          />
        </label>
      </div>
      <div className="tabla__col-gasto">
        {/* Hacer clic en el nombre también marca o desmarca (REC-4). */}
        <label htmlFor={idCasilla} className="fila-recurrente__nombre">
          <span className="fila-recurrente__titulo">{gasto.nombre}</span>
          <span
            id={idEstado}
            className={`estado ${alerta ? 'estado--alerta' : pago.pagado ? 'estado--pagado' : ''}`.trim()}
          >
            {alerta && <Icono nombre="alerta" />}
            {textoEstado(estado)}
          </span>
        </label>
        {editandoLista && (
          <div className="fila-recurrente__acciones">
            <button type="button" className="boton-enlace" onClick={alCambiarNombreODia}>
              Cambiar nombre o día<span className="solo-lector"> de {gasto.nombre}</span>
            </button>
            <button type="button" className="boton-enlace" onClick={alQuitar}>
              Quitar<span className="solo-lector"> {gasto.nombre}</span>
            </button>
          </div>
        )}
      </div>
      <div className="tabla__col-monto">
        <CampoMonto valor={pago.monto} alCambiar={alCambiarMonto} aria-label={`Monto de ${gasto.nombre}`} />
      </div>
    </div>
  );
}
