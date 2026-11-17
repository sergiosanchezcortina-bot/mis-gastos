import { Icono } from './Icono';

/** Mensaje de validación junto al campo, con ícono para no depender del color. */
export function MensajeError({ id, texto }: { id: string; texto: string }) {
  return (
    <div id={id} className="mensaje-error">
      <Icono nombre="alerta" />
      <span>{texto}</span>
    </div>
  );
}
