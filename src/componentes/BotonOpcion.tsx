import type { ReactNode } from 'react';
import { Icono, type NombreIcono } from './Icono';

type Props = {
  elegido: boolean;
  alElegir: () => void;
  children: ReactNode;
  /** "pildora" para los días, "categoria" para las categorías. */
  forma: 'pildora' | 'categoria';
  icono?: NombreIcono;
};

/**
 * Botón para elegir una opción de un grupo. La opción elegida se nota por fondo,
 * borde y un ícono de visto, no solo por el color.
 */
export function BotonOpcion({ elegido, alElegir, children, forma, icono }: Props) {
  return (
    <button type="button" className={`opcion opcion--${forma}`} aria-pressed={elegido} onClick={alElegir}>
      {forma === 'pildora' && elegido && <Icono nombre="check" />}
      {icono && <Icono nombre={icono} />}
      <span className="opcion__texto">{children}</span>
      {forma === 'categoria' && elegido && <Icono nombre="check" />}
    </button>
  );
}
