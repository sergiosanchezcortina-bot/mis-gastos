import { TEXTO_AVISO_RESPALDO } from '../dominio/avisoRespaldo';
import { Icono } from './Icono';

/** Aviso del Resumen cuando hace más de 30 días que no hay respaldo (RES-9). */
export function AvisoRespaldo({ alHacerRespaldo }: { alHacerRespaldo: () => void }) {
  return (
    <div className="aviso-respaldo">
      <Icono nombre="alerta" />
      <span className="aviso-respaldo__texto">{TEXTO_AVISO_RESPALDO}</span>
      <button type="button" className="boton-secundario" onClick={alHacerRespaldo}>
        Hacer respaldo ahora
      </button>
    </div>
  );
}
