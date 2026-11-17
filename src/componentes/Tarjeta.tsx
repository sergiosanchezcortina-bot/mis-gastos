import type { ReactNode } from 'react';
import { formatearMonto } from '../dominio/montos';

type Props = {
  titulo: string;
  monto: number;
  /** Texto bajo la cifra, por ejemplo "3 de 6 pagados". */
  detalle?: ReactNode;
  /** Estilo de alerta: fondo y borde naranjos. El texto del detalle siempre explica el estado. */
  alerta?: boolean;
  children?: ReactNode;
};

export function Tarjeta({ titulo, monto, detalle, alerta = false, children }: Props) {
  return (
    <div className={alerta ? 'tarjeta tarjeta--alerta' : 'tarjeta'}>
      <div className="tarjeta__titulo">{titulo}</div>
      <div className="tarjeta__cifra">{formatearMonto(monto)}</div>
      {detalle !== undefined && <div className="tarjeta__detalle">{detalle}</div>}
      {children}
    </div>
  );
}
