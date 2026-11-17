import { SelectorMes } from './SelectorMes';

type Props = {
  titulo: string;
  /** Ajustes no depende del mes, así que no lleva selector. */
  conSelectorMes?: boolean;
};

/** Título de la pantalla a la izquierda y selector de mes a la derecha. */
export function EncabezadoPantalla({ titulo, conSelectorMes = true }: Props) {
  return (
    <div className="encabezado">
      <h1 className="titulo-pantalla">{titulo}</h1>
      {conSelectorMes && <SelectorMes />}
    </div>
  );
}
