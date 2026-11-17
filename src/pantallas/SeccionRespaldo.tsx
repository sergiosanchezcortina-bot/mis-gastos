import { useRef } from 'react';
import { MensajeError } from '../componentes/MensajeError';
import { fechaLarga } from '../dominio/fechas';

type Props = {
  ultimoRespaldo: string | null;
  error: string | null;
  alDescargar: () => void;
  alElegirArchivo: (archivo: File) => void;
};

/** Descargar y restaurar el respaldo (AJU-2). */
export function SeccionRespaldo({ ultimoRespaldo, error, alDescargar, alElegirArchivo }: Props) {
  const selector = useRef<HTMLInputElement>(null);

  return (
    <section className="caja seccion-ajustes" aria-labelledby="titulo-respaldo">
      <div className="panel__titulo">
        <h2 id="titulo-respaldo" className="subtitulo">
          Respaldo
        </h2>
        <div className="ayuda">Un respaldo es un archivo con todos tus datos. Guárdalo en un lugar seguro.</div>
      </div>
      <p className="ultimo-respaldo">
        {ultimoRespaldo === null
          ? 'Todavía no has hecho un respaldo.'
          : `Último respaldo: ${fechaLarga(ultimoRespaldo.slice(0, 10))}.`}
      </p>
      <div className="acciones">
        <button type="button" className="boton-principal" onClick={alDescargar}>
          Descargar respaldo
        </button>
        <button type="button" className="boton-secundario" onClick={() => selector.current?.click()}>
          Restaurar desde un respaldo
        </button>
        {/* El selector de archivos del sistema se abre con el botón de arriba. */}
        <input
          ref={selector}
          type="file"
          accept="application/json,.json"
          className="solo-lector"
          tabIndex={-1}
          aria-label="Archivo de respaldo"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = ''; // Permite elegir el mismo archivo otra vez.
            if (archivo) alElegirArchivo(archivo);
          }}
        />
      </div>
      {error && <MensajeError id="error-respaldo" texto={error} />}
    </section>
  );
}
