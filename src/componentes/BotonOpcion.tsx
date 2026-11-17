import type { KeyboardEvent, ReactNode } from 'react';
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
 *
 * Enter sobre una opción que no está elegida la elige. Sobre una que ya está elegida
 * guarda el formulario: así "monto, categoría, Enter" (brief, flujo 1) funciona aunque
 * el navegador haya dejado el foco en el botón después del clic.
 */
export function BotonOpcion({ elegido, alElegir, children, forma, icono }: Props) {
  const alTeclear = (evento: KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key === 'Enter' && elegido && evento.currentTarget.form) {
      evento.preventDefault();
      evento.currentTarget.form.requestSubmit();
    }
  };

  return (
    <button
      type="button"
      className={`opcion opcion--${forma}`}
      aria-pressed={elegido}
      onClick={alElegir}
      onKeyDown={alTeclear}
    >
      {forma === 'pildora' && elegido && <Icono nombre="check" />}
      {icono && <Icono nombre={icono} />}
      <span className="opcion__texto">{children}</span>
      {forma === 'categoria' && elegido && <Icono nombre="check" />}
    </button>
  );
}
