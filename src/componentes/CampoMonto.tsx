import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { interpretarEntradaMonto, posicionCursor, textoEntradaMonto } from '../dominio/entradaMonto';

type Props = {
  valor: number | null;
  alCambiar: (valor: number | null) => void;
  /** Campos grandes (formulario de gasto) o de tabla. */
  grande?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'>;

/** Campo de monto: solo dígitos, máximo 8, con punto de miles mientras se escribe. */
export const CampoMonto = forwardRef<HTMLInputElement, Props>(function CampoMonto(
  { valor, alCambiar, grande = false, className, ...resto },
  refExterna,
) {
  const ref = useRef<HTMLInputElement>(null);
  useImperativeHandle(refExterna, () => ref.current as HTMLInputElement);
  const cursor = useRef<number | null>(null);
  // Fuerza un nuevo dibujo cuando el texto se rechaza, para reponer el cursor.
  const [, setVuelta] = useState(0);
  const texto = textoEntradaMonto(valor);

  useLayoutEffect(() => {
    const campo = ref.current;
    if (cursor.current !== null && campo && document.activeElement === campo) {
      campo.setSelectionRange(cursor.current, cursor.current);
    }
    cursor.current = null;
  });

  const alEscribir = (evento: ChangeEvent<HTMLInputElement>) => {
    const escrito = evento.target.value;
    const posicion = evento.target.selectionStart ?? escrito.length;
    const digitosAntes = escrito.slice(0, posicion).replace(/\D/g, '').length;
    const nuevo = interpretarEntradaMonto(escrito, valor);
    const textoNuevo = textoEntradaMonto(nuevo);
    const totalDigitos = textoNuevo.replace(/\D/g, '').length;
    cursor.current = posicionCursor(textoNuevo, Math.min(digitosAntes, totalDigitos));
    if (nuevo === valor) setVuelta((n) => n + 1);
    else alCambiar(nuevo);
  };

  return (
    <span className={grande ? 'campo-monto campo-monto--grande' : 'campo-monto'}>
      <span className="campo-monto__signo" aria-hidden="true">
        $
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={['campo', className].filter(Boolean).join(' ')}
        value={texto}
        onChange={alEscribir}
        {...resto}
      />
    </span>
  );
});
