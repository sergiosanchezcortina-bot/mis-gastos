import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CampoMonto } from '../componentes/CampoMonto';
import { MensajeError } from '../componentes/MensajeError';
import { validarFormulario, type ErroresFormulario } from '../dominio/recurrentes';

export type DatosRecurrente = { nombre: string; diaVencimiento: number | null; monto: number | null };

type Props = {
  /** "agregar" pide nombre, día y monto; "editar" solo nombre y día. */
  modo: 'agregar' | 'editar';
  inicial?: { nombre: string; diaVencimiento: number | null };
  alGuardar: (datos: DatosRecurrente) => void;
  alCancelar: () => void;
};

export function FormularioRecurrente({ modo, inicial, alGuardar, alCancelar }: Props) {
  const id = useId();
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [dia, setDia] = useState(inicial?.diaVencimiento != null ? String(inicial.diaVencimiento) : '');
  const [monto, setMonto] = useState<number | null>(null);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const campoNombre = useRef<HTMLInputElement>(null);
  const campoDia = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campoNombre.current?.focus();
  }, []);

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = validarFormulario({ nombre, dia });
    setErrores(resultado.errores);
    if (resultado.errores.nombre) return campoNombre.current?.focus();
    if (resultado.errores.dia) return campoDia.current?.focus();
    alGuardar({ nombre: resultado.nombre, diaVencimiento: resultado.dia, monto });
  };

  const titulo = modo === 'agregar' ? 'Agregar gasto recurrente' : 'Cambiar nombre o día';

  return (
    <form className="formulario-recurrente" onSubmit={enviar} noValidate aria-label={titulo}>
      <h2 className="subtitulo">{titulo}</h2>
      <div className="formulario-recurrente__campos">
        <div className="campo-grupo">
          <label htmlFor={`${id}-nombre`}>Nombre</label>
          <input
            ref={campoNombre}
            id={`${id}-nombre`}
            className="campo campo--texto"
            type="text"
            autoComplete="off"
            maxLength={40}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            aria-invalid={errores.nombre ? true : undefined}
            aria-describedby={errores.nombre ? `${id}-error-nombre` : undefined}
          />
          {errores.nombre && <MensajeError id={`${id}-error-nombre`} texto={errores.nombre} />}
        </div>
        <div className="campo-grupo">
          <label htmlFor={`${id}-dia`}>Día de vencimiento</label>
          <input
            ref={campoDia}
            id={`${id}-dia`}
            className="campo campo--dia"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            value={dia}
            onChange={(e) => setDia(e.target.value.replace(/\D/g, ''))}
            aria-invalid={errores.dia ? true : undefined}
            aria-describedby={errores.dia ? `${id}-error-dia` : `${id}-ayuda-dia`}
          />
          {errores.dia ? (
            <MensajeError id={`${id}-error-dia`} texto={errores.dia} />
          ) : (
            <div id={`${id}-ayuda-dia`} className="ayuda">
              Opcional. Del 1 al 31.
            </div>
          )}
        </div>
        {modo === 'agregar' && (
          <div className="campo-grupo">
            <label htmlFor={`${id}-monto`}>Monto estimado</label>
            <CampoMonto id={`${id}-monto`} valor={monto} alCambiar={setMonto} aria-describedby={`${id}-ayuda-monto`} />
            <div id={`${id}-ayuda-monto`} className="ayuda">
              Opcional.
            </div>
          </div>
        )}
      </div>
      <div className="acciones">
        <button type="submit" className="boton-principal">
          {modo === 'agregar' ? 'Guardar' : 'Guardar cambios'}
        </button>
        <button type="button" className="boton-secundario" onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
