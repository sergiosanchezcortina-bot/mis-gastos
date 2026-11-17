import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { BotonOpcion } from '../componentes/BotonOpcion';
import { CampoMonto } from '../componentes/CampoMonto';
import { MensajeError } from '../componentes/MensajeError';
import { fechaDeOpcion, opcionDeFecha, validarGasto, type ErroresGasto, type OpcionDia } from '../dominio/gastos';
import type { Categoria, Gasto } from '../dominio/tipos';

export type DatosGasto = { monto: number; fecha: string; categoriaId: string };

type Props = {
  /** "agregar" queda vacío después de guardar; "corregir" parte con los datos del gasto. */
  modo: 'agregar' | 'corregir';
  categorias: Categoria[];
  hoy: string;
  inicial?: Gasto;
  alGuardar: (datos: DatosGasto) => Promise<void>;
  alCancelar?: () => void;
  alEliminar?: () => void;
};

const OPCIONES_DIA: Array<{ valor: OpcionDia; texto: string }> = [
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'ayer', texto: 'Ayer' },
  { valor: 'otro', texto: 'Otro día' },
];

export function FormularioGasto({ modo, categorias, hoy, inicial, alGuardar, alCancelar, alEliminar }: Props) {
  const id = useId();
  const [monto, setMonto] = useState<number | null>(inicial?.monto ?? null);
  const [opcion, setOpcion] = useState<OpcionDia>(inicial ? opcionDeFecha(inicial.fecha, hoy) : 'hoy');
  const [otraFecha, setOtraFecha] = useState(inicial && opcionDeFecha(inicial.fecha, hoy) === 'otro' ? inicial.fecha : '');
  const [categoriaId, setCategoriaId] = useState<string | null>(inicial?.categoriaId ?? null);
  const [errores, setErrores] = useState<ErroresGasto>({});
  const guardando = useRef(false);
  const campoMonto = useRef<HTMLInputElement>(null);
  const campoFecha = useRef<HTMLInputElement>(null);
  const grupoCategorias = useRef<HTMLDivElement>(null);

  // El cursor parte en el monto (RES-7, NOR-4).
  useEffect(() => {
    campoMonto.current?.focus();
  }, []);

  const elegirOpcion = (valor: OpcionDia) => {
    setOpcion(valor);
    setErrores(({ fecha: _, ...resto }) => resto);
  };

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    // Un segundo clic mientras se guarda no crea otro gasto (NOR-A7).
    if (guardando.current) return;

    const fecha = fechaDeOpcion(opcion, hoy, otraFecha);
    const encontrados = validarGasto({ monto, fecha, categoriaId, hoy });
    setErrores(encontrados);
    if (encontrados.monto) return campoMonto.current?.focus();
    if (encontrados.fecha) return campoFecha.current?.focus();
    if (encontrados.categoria) return grupoCategorias.current?.querySelector('button')?.focus();
    if (monto === null || categoriaId === null) return;

    guardando.current = true;
    try {
      await alGuardar({ monto, fecha, categoriaId });
      if (modo === 'agregar') {
        setMonto(null);
        setOpcion('hoy');
        setOtraFecha('');
        setCategoriaId(null);
        campoMonto.current?.focus();
      }
    } finally {
      guardando.current = false;
    }
  };

  return (
    <form
      className={`formulario-gasto formulario-gasto--${modo}`}
      onSubmit={(e) => void enviar(e)}
      noValidate
      aria-label={modo === 'agregar' ? 'Agregar gasto' : 'Corregir gasto'}
    >
      {modo === 'agregar' && <h2 className="subtitulo">Agregar gasto</h2>}

      <div className="formulario-gasto__fila">
        <div className="campo-grupo">
          <label htmlFor={`${id}-monto`}>1. ¿Cuánto gastaste?</label>
          <CampoMonto
            ref={campoMonto}
            id={`${id}-monto`}
            grande
            valor={monto}
            alCambiar={(valor) => {
              setMonto(valor);
              setErrores(({ monto: _, ...resto }) => resto);
            }}
            aria-invalid={errores.monto ? true : undefined}
            aria-describedby={errores.monto ? `${id}-error-monto` : undefined}
          />
          {errores.monto && <MensajeError id={`${id}-error-monto`} texto={errores.monto} />}
        </div>

        <div className="campo-grupo">
          <div id={`${id}-cuando`} className="campo-grupo__titulo">
            2. ¿Cuándo fue?
          </div>
          <div className="opciones" role="group" aria-labelledby={`${id}-cuando`}>
            {OPCIONES_DIA.map((o) => (
              <BotonOpcion key={o.valor} forma="pildora" elegido={opcion === o.valor} alElegir={() => elegirOpcion(o.valor)}>
                {o.texto}
              </BotonOpcion>
            ))}
          </div>
          {opcion === 'otro' && (
            <div className="campo-grupo">
              <label htmlFor={`${id}-fecha`}>¿Qué día?</label>
              <input
                ref={campoFecha}
                id={`${id}-fecha`}
                className="campo campo--fecha"
                type="date"
                max={hoy}
                value={otraFecha}
                onChange={(e) => {
                  setOtraFecha(e.target.value);
                  setErrores(({ fecha: _, ...resto }) => resto);
                }}
                aria-invalid={errores.fecha ? true : undefined}
                aria-describedby={errores.fecha ? `${id}-error-fecha` : undefined}
              />
            </div>
          )}
          {errores.fecha && <MensajeError id={`${id}-error-fecha`} texto={errores.fecha} />}
        </div>
      </div>

      <div className="campo-grupo">
        <div id={`${id}-categoria`} className="campo-grupo__titulo">
          3. ¿En qué fue?
        </div>
        <div ref={grupoCategorias} className="opciones opciones--categorias" role="group" aria-labelledby={`${id}-categoria`}>
          {categorias.map((c) => (
            <BotonOpcion
              key={c.id}
              forma="categoria"
              icono={c.icono}
              elegido={categoriaId === c.id}
              alElegir={() => {
                setCategoriaId(c.id);
                setErrores(({ categoria: _, ...resto }) => resto);
              }}
            >
              {c.nombre}
            </BotonOpcion>
          ))}
        </div>
        {errores.categoria && <MensajeError id={`${id}-error-categoria`} texto={errores.categoria} />}
      </div>

      {modo === 'agregar' ? (
        <div className="formulario-gasto__pie">
          <div className="ayuda">También puedes guardar con la tecla Enter.</div>
          <button type="submit" className="boton-principal">
            Guardar gasto
          </button>
        </div>
      ) : (
        <div className="acciones">
          <button type="submit" className="boton-principal">
            Guardar cambios
          </button>
          <button type="button" className="boton-secundario" onClick={alEliminar}>
            Eliminar gasto
          </button>
          <button type="button" className="boton-enlace" onClick={alCancelar}>
            Cancelar
          </button>
        </div>
      )}
    </form>
  );
}
