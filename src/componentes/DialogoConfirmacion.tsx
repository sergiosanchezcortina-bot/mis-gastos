import { useEffect, useId, useRef, type KeyboardEvent } from 'react';

type Props = {
  mensaje: string;
  textoConfirmar: string;
  alConfirmar: () => void;
  alCancelar: () => void;
};

/**
 * Pide confirmación antes de quitar o eliminar algo.
 * El foco parte en "Cancelar", Escape cancela y Tab no sale del diálogo.
 */
export function DialogoConfirmacion({ mensaje, textoConfirmar, alConfirmar, alCancelar }: Props) {
  const idMensaje = useId();
  const cancelar = useRef<HTMLButtonElement>(null);
  const confirmar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    cancelar.current?.focus();
    return () => {
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, []);

  const alTeclear = (evento: KeyboardEvent) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      alCancelar();
    } else if (evento.key === 'Tab') {
      evento.preventDefault();
      const siguiente = document.activeElement === cancelar.current ? confirmar.current : cancelar.current;
      siguiente?.focus();
    }
  };

  return (
    <div className="dialogo__fondo">
      <div className="dialogo" role="alertdialog" aria-modal="true" aria-labelledby={idMensaje} onKeyDown={alTeclear}>
        <p id={idMensaje} className="dialogo__mensaje">
          {mensaje}
        </p>
        <div className="dialogo__acciones">
          <button ref={confirmar} type="button" className="boton-principal" onClick={alConfirmar}>
            {textoConfirmar}
          </button>
          <button ref={cancelar} type="button" className="boton-secundario" onClick={alCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
