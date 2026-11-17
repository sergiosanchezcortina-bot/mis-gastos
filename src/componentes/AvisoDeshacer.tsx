import { useEffect, useRef } from 'react';

type Props = {
  texto: string;
  alDeshacer: () => void;
};

/**
 * Aviso después de quitar o eliminar algo. Queda visible hasta la siguiente acción.
 * Recibe el foco para que "Deshacer" esté a un Enter de distancia.
 */
export function AvisoDeshacer({ texto, alDeshacer }: Props) {
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    boton.current?.focus();
  }, []);

  return (
    <div className="aviso" role="status">
      <span>{texto}</span>
      <button ref={boton} type="button" className="boton-enlace" onClick={alDeshacer}>
        Deshacer
      </button>
    </div>
  );
}
