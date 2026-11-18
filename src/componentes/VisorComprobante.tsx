import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icono } from './Icono';
import { textoTamano, vistaDe } from '../dominio/comprobantes';
import type { Comprobante } from '../dominio/tipos';

type Props = {
  /** "Comprobante de Luz, noviembre" */
  titulo: string;
  comprobante: Comprobante;
  alCambiar: () => void;
  alQuitar: () => void;
  alCerrar: () => void;
};

/** Dirección temporal del archivo para mostrarlo. En las pruebas (jsdom) no existe. */
function useDireccion(comprobante: Comprobante, tipo: string): string | null {
  const [direccion, setDireccion] = useState<string | null>(null);
  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return;
    const nueva = URL.createObjectURL(new Blob([comprobante.datos], { type: tipo }));
    setDireccion(nueva);
    return () => {
      URL.revokeObjectURL(nueva);
      setDireccion(null);
    };
  }, [comprobante, tipo]);
  return direccion;
}

/**
 * Ventana con la vista previa del comprobante (REC-12). Imagen o PDF se ven aquí;
 * otro tipo de archivo muestra su nombre y "Descargar". Escape cierra y Tab no sale.
 */
export function VisorComprobante({ titulo, comprobante, alCambiar, alQuitar, alCerrar }: Props) {
  const idTitulo = useId();
  const dialogo = useRef<HTMLDivElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);
  const vista = vistaDe(comprobante.tipo, comprobante.nombre);
  const tipo = comprobante.tipo || (vista === 'pdf' ? 'application/pdf' : 'application/octet-stream');
  const direccion = useDireccion(comprobante, tipo);

  useEffect(() => {
    cerrar.current?.focus();
  }, []);

  const alTeclear = (evento: KeyboardEvent) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      alCerrar();
      return;
    }
    if (evento.key !== 'Tab' || !dialogo.current) return;
    const enfocables = [...dialogo.current.querySelectorAll<HTMLElement>('button, a[href], iframe')];
    const primero = enfocables[0];
    const ultimo = enfocables.at(-1);
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo?.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero?.focus();
    }
  };

  return (
    <div className="dialogo__fondo">
      <div
        ref={dialogo}
        className="dialogo dialogo--visor"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onKeyDown={alTeclear}
      >
        <div className="visor__encabezado">
          <div>
            <h2 id={idTitulo} className="subtitulo">
              {titulo}
            </h2>
            <div className="ayuda">
              {comprobante.nombre} · {textoTamano(comprobante.tamano)}
            </div>
          </div>
          <button ref={cerrar} type="button" className="boton-secundario" onClick={alCerrar}>
            <Icono nombre="cerrar" />
            Cerrar
          </button>
        </div>

        <div className="visor__contenido">
          {vista === 'imagen' && direccion && <img className="visor__imagen" src={direccion} alt={titulo} />}
          {vista === 'pdf' && direccion && <iframe className="visor__pdf" src={direccion} title={titulo} />}
          {vista === 'otro' && (
            <div className="visor__otro">
              <p>Este tipo de archivo no se puede ver aquí. Descárgalo para abrirlo.</p>
              {direccion && (
                <a className="boton-secundario" href={direccion} download={comprobante.nombre}>
                  Descargar
                </a>
              )}
            </div>
          )}
        </div>

        <div className="dialogo__acciones">
          <button type="button" className="boton-secundario" onClick={alCambiar}>
            Cambiar
          </button>
          <button type="button" className="boton-secundario" onClick={alQuitar}>
            Quitar comprobante
          </button>
        </div>
      </div>
    </div>
  );
}
