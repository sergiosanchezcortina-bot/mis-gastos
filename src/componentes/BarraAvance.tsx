type Props = {
  /** De 0 a 1. */
  proporcion: number;
  /** Color de acento para el avance de pagados y el mes en curso. */
  acento?: boolean;
};

/** Barra decorativa: el texto que la acompaña siempre dice lo mismo en palabras. */
export function BarraAvance({ proporcion, acento = false }: Props) {
  const ancho = `${Math.round(Math.max(0, Math.min(1, proporcion)) * 100)}%`;
  return (
    <div className="barra" aria-hidden="true">
      <div className={acento ? 'barra__relleno barra__relleno--acento' : 'barra__relleno'} style={{ width: ancho }} />
    </div>
  );
}
