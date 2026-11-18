import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AvisoDeshacer } from '../componentes/AvisoDeshacer';
import { BarraAvance } from '../componentes/BarraAvance';
import { DialogoConfirmacion } from '../componentes/DialogoConfirmacion';
import { EncabezadoPantalla } from '../componentes/EncabezadoPantalla';
import { Icono } from '../componentes/Icono';
import { Tarjeta } from '../componentes/Tarjeta';
import { VisorComprobante } from '../componentes/VisorComprobante';
import { validarArchivo } from '../dominio/comprobantes';
import { nombreMes } from '../dominio/fechas';
import type { Comprobante } from '../dominio/tipos';
import { comprobanteDesdeArchivo, guardarComprobante, leerComprobantes, quitarComprobante } from '../datos/comprobantes';
import {
  avancePagados,
  compararPorVencimiento,
  marcarPagado,
  textoCantidadRecurrentes,
  textoPagados,
  textoPendientes,
  totalesRecurrentes,
} from '../dominio/recurrentes';
import {
  agregarRecurrente,
  deshacerQuitar,
  editarRecurrente,
  guardarPago,
  leerMesRecurrentes,
  quitarRecurrente,
  type FilaRecurrente as Fila,
} from '../datos/recurrentes';
import { useMes } from '../estado/MesContext';
import { FilaRecurrente } from './FilaRecurrente';
import { FormularioRecurrente, type DatosRecurrente } from './FormularioRecurrente';

type Formulario = { modo: 'agregar' } | { modo: 'editar'; gastoId: string } | null;
type Aviso = { texto: string; deshacer: () => Promise<void> } | null;

const ordenar = (filas: Fila[]) => [...filas].sort((a, b) => compararPorVencimiento(a.gasto, b.gasto));

export function GastosRecurrentes() {
  const { db, hoy, mesActual, mesSeleccionado, actualizarLimites } = useMes();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [editandoLista, setEditandoLista] = useState(false);
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [porQuitar, setPorQuitar] = useState<Fila | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const botonAgregar = useRef<HTMLButtonElement>(null);
  // Comprobantes (REC-12).
  const [comprobantes, setComprobantes] = useState<Map<string, Comprobante>>(new Map());
  const [viendo, setViendo] = useState<Fila | null>(null);
  const [porQuitarComprobante, setPorQuitarComprobante] = useState<Fila | null>(null);
  const [errorComprobante, setErrorComprobante] = useState<{ pagoId: string; texto: string } | null>(null);
  const selectorArchivo = useRef<HTMLInputElement>(null);
  const filaDelArchivo = useRef<Fila | null>(null);

  const cargar = async () => {
    const leidas = await leerMesRecurrentes(db, mesSeleccionado, mesActual);
    setComprobantes(await leerComprobantes(db, leidas.map((f) => f.pago.id)));
    setFilas(leidas);
  };

  useEffect(() => {
    let vigente = true;
    setFormulario(null);
    setAviso(null);
    setEditandoLista(false);
    setViendo(null);
    setErrorComprobante(null);
    void leerMesRecurrentes(db, mesSeleccionado, mesActual).then(async (leidas) => {
      const deEsteMes = await leerComprobantes(db, leidas.map((f) => f.pago.id));
      if (!vigente) return;
      setComprobantes(deEsteMes);
      setFilas(leidas);
    });
    return () => {
      vigente = false;
    };
  }, [db, mesSeleccionado, mesActual]);

  if (filas === null) return <EncabezadoPantalla titulo="Gastos recurrentes" />;

  // Cualquier acción nueva cierra el aviso de "Deshacer" (brief NOR-9).
  const actualizarPago = (fila: Fila, cambios: Partial<Fila['pago']>) => {
    setAviso(null);
    const pago = { ...fila.pago, ...cambios };
    setFilas((actuales) => actuales?.map((f) => (f.pago.id === pago.id ? { ...f, pago } : f)) ?? null);
    void guardarPago(db, pago).then(() => actualizarLimites());
  };

  const marcar = (fila: Fila) => {
    const { pagado, fechaPago } = marcarPagado(fila.pago, !fila.pago.pagado, hoy);
    actualizarPago(fila, { pagado, fechaPago });
  };

  const agregar = async (datos: DatosRecurrente) => {
    const nueva = await agregarRecurrente(db, datos, mesSeleccionado);
    setFilas((actuales) => ordenar([...(actuales ?? []), nueva]));
    setFormulario(null);
    botonAgregar.current?.focus();
  };

  const editar = async (fila: Fila, datos: DatosRecurrente) => {
    const gasto = await editarRecurrente(
      db,
      fila.gasto,
      { nombre: datos.nombre, diaVencimiento: datos.diaVencimiento, cadaMeses: datos.cadaMeses },
      mesSeleccionado,
    );
    setFilas((actuales) => ordenar(actuales?.map((f) => (f.gasto.id === gasto.id ? { ...f, gasto } : f)) ?? []));
    setFormulario(null);
  };

  const quitar = async (fila: Fila) => {
    setPorQuitar(null);
    const deshacer = await quitarRecurrente(db, fila.gasto.id, mesSeleccionado);
    const leidas = await leerMesRecurrentes(db, mesSeleccionado, mesActual);
    // La fila desaparece y el aviso aparece en el mismo momento.
    setFilas(leidas);
    setAviso({
      texto: `Se quitó ${fila.gasto.nombre}.`,
      deshacer: async () => {
        await deshacerQuitar(db, deshacer);
        await cargar();
        await actualizarLimites();
      },
    });
    await actualizarLimites();
  };

  const deshacerUltimo = async () => {
    if (!aviso) return;
    setAviso(null);
    await aviso.deshacer();
  };

  // ---------- Comprobante (REC-12) ----------

  const ponerComprobante = (pagoId: string, comprobante: Comprobante | undefined) =>
    setComprobantes((actuales) => {
      const nuevos = new Map(actuales);
      if (comprobante) nuevos.set(pagoId, comprobante);
      else nuevos.delete(pagoId);
      return nuevos;
    });

  const enfocarBoton = (fila: Fila) =>
    setTimeout(() => document.querySelector<HTMLElement>(`[data-comprobante="${fila.pago.id}"]`)?.focus());

  /** Abre el selector de archivos del Mac para esa fila. */
  const elegirArchivo = (fila: Fila) => {
    setAviso(null);
    setErrorComprobante(null);
    filaDelArchivo.current = fila;
    if (selectorArchivo.current) {
      selectorArchivo.current.value = '';
      selectorArchivo.current.click();
    }
  };

  const alElegirArchivo = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    const fila = filaDelArchivo.current;
    if (!archivo || !fila) return;
    const error = validarArchivo(archivo.size);
    if (error) {
      setViendo(null);
      setErrorComprobante({ pagoId: fila.pago.id, texto: error });
      return;
    }
    const anterior = comprobantes.get(fila.pago.id);
    const nuevo = await comprobanteDesdeArchivo(fila.pago.id, archivo, new Date().toISOString());
    await guardarComprobante(db, nuevo);
    ponerComprobante(fila.pago.id, nuevo);
    // El botón cambia a "Comprobante" con check; el foco queda en él.
    enfocarBoton(fila);
    if (anterior) {
      // "Cambiar" reemplaza el archivo; el anterior se puede recuperar.
      setViendo(null);
      setAviso({
        texto: `Se cambió el comprobante de ${fila.gasto.nombre}.`,
        deshacer: async () => {
          await guardarComprobante(db, anterior);
          ponerComprobante(fila.pago.id, anterior);
        },
      });
    }
  };

  const confirmarQuitarComprobante = async (fila: Fila) => {
    const anterior = comprobantes.get(fila.pago.id);
    setPorQuitarComprobante(null);
    setViendo(null);
    if (!anterior) return;
    await quitarComprobante(db, fila.pago.id);
    ponerComprobante(fila.pago.id, undefined);
    setAviso({
      texto: `Se quitó el comprobante de ${fila.gasto.nombre}.`,
      deshacer: async () => {
        await guardarComprobante(db, anterior);
        ponerComprobante(fila.pago.id, anterior);
      },
    });
  };

  /** Al cerrar la ventana, el foco vuelve al botón de la fila. */
  const cerrarVisor = (fila: Fila) => {
    setViendo(null);
    enfocarBoton(fila);
  };

  const tituloComprobante = (fila: Fila) => `Comprobante de ${fila.gasto.nombre}, ${nombreMes(fila.pago.mes)}`;
  const comprobanteViendo = viendo && comprobantes.get(viendo.pago.id);

  const abrirFormulario = (nuevo: Formulario) => {
    setAviso(null);
    setFormulario(nuevo);
  };

  const formularioAgregar = formulario?.modo === 'agregar' && (
    <FormularioRecurrente modo="agregar" mes={mesSeleccionado} alGuardar={(d) => void agregar(d)} alCancelar={() => {
      setFormulario(null);
      botonAgregar.current?.focus();
    }} />
  );

  const botonAgregarGasto = (
    <button ref={botonAgregar} type="button" className="boton-secundario" onClick={() => abrirFormulario({ modo: 'agregar' })}>
      <Icono nombre="agregar" />
      Agregar gasto recurrente
    </button>
  );

  const avisoDeshacer = aviso && <AvisoDeshacer texto={aviso.texto} alDeshacer={() => void deshacerUltimo()} />;

  // Estado vacío (REC-11).
  if (filas.length === 0) {
    return (
      <>
        <EncabezadoPantalla titulo="Gastos recurrentes" />
        {avisoDeshacer}
        <div className="vacio">
          <p>Todavía no tienes gastos recurrentes.</p>
          {formularioAgregar || botonAgregarGasto}
        </div>
      </>
    );
  }

  const t = totalesRecurrentes(filas.map((f) => f.pago));

  return (
    <>
      <EncabezadoPantalla titulo="Gastos recurrentes" />

      <div className="tarjetas">
        <Tarjeta titulo="Total del mes" monto={t.total} detalle={textoCantidadRecurrentes(t.cantidad)} />
        <Tarjeta titulo="Pagado" monto={t.pagado} detalle={textoPagados(t.pagados, t.cantidad)}>
          <BarraAvance proporcion={avancePagados(t.pagados, t.cantidad)} acento />
        </Tarjeta>
        <Tarjeta titulo="Por pagar" monto={t.porPagar} detalle={textoPendientes(t.pendientes)} alerta={t.pendientes > 0} />
      </div>

      {avisoDeshacer}

      <section className="tabla" aria-label="Gastos recurrentes del mes">
        <div className="tabla__contenido tabla__contenido--recurrentes">
          <div className="tabla__encabezado" aria-hidden="true">
            <div className="tabla__col-pagado">Pagado</div>
            <div className="tabla__col-gasto">Gasto</div>
            <div className="tabla__col-comprobante">Comprobante</div>
            <div className="tabla__col-monto">Monto</div>
          </div>
          {filas.map((fila) =>
            formulario?.modo === 'editar' && formulario.gastoId === fila.gasto.id ? (
              <div key={fila.pago.id} className="tabla__formulario">
                <FormularioRecurrente
                  modo="editar"
                  mes={mesSeleccionado}
                  inicial={fila.gasto}
                  alGuardar={(d) => void editar(fila, d)}
                  alCancelar={() => setFormulario(null)}
                />
              </div>
            ) : (
              <FilaRecurrente
                key={fila.pago.id}
                fila={fila}
                hoy={hoy}
                editandoLista={editandoLista}
                alMarcar={() => marcar(fila)}
                alCambiarMonto={(monto) => actualizarPago(fila, { monto })}
                alCambiarNombreODia={() => abrirFormulario({ modo: 'editar', gastoId: fila.gasto.id })}
                alQuitar={() => {
                  setAviso(null);
                  setPorQuitar(fila);
                }}
                tieneComprobante={comprobantes.has(fila.pago.id)}
                errorComprobante={errorComprobante?.pagoId === fila.pago.id ? errorComprobante.texto : null}
                alAgregarComprobante={() => elegirArchivo(fila)}
                alVerComprobante={() => {
                  setAviso(null);
                  setErrorComprobante(null);
                  setViendo(fila);
                }}
              />
            ),
          )}
        </div>
      </section>

      {formularioAgregar || (
        <div className="acciones">
          {botonAgregarGasto}
          <button
            type="button"
            className="boton-enlace"
            onClick={() => {
              setAviso(null);
              setFormulario(null);
              setEditandoLista(!editandoLista);
            }}
          >
            {editandoLista ? 'Listo' : 'Editar lista'}
          </button>
        </div>
      )}

      {/* Un solo selector de archivos para toda la tabla. Acepta cualquier tipo. */}
      <input
        ref={selectorArchivo}
        type="file"
        className="solo-lector"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="selector-comprobante"
        onChange={(e) => void alElegirArchivo(e)}
      />

      {viendo && comprobanteViendo && !porQuitarComprobante && (
        <VisorComprobante
          titulo={tituloComprobante(viendo)}
          comprobante={comprobanteViendo}
          alCambiar={() => elegirArchivo(viendo)}
          alQuitar={() => setPorQuitarComprobante(viendo)}
          alCerrar={() => cerrarVisor(viendo)}
        />
      )}

      {porQuitarComprobante && (
        <DialogoConfirmacion
          mensaje={`¿Quitar el comprobante de ${porQuitarComprobante.gasto.nombre} de ${nombreMes(porQuitarComprobante.pago.mes)}?`}
          textoConfirmar="Quitar comprobante"
          alConfirmar={() => void confirmarQuitarComprobante(porQuitarComprobante)}
          alCancelar={() => setPorQuitarComprobante(null)}
        />
      )}

      {porQuitar && (
        <DialogoConfirmacion
          mensaje={`¿Quitar ${porQuitar.gasto.nombre} de tus gastos recurrentes? Los meses anteriores no cambian.`}
          textoConfirmar="Quitar"
          alConfirmar={() => void quitar(porQuitar)}
          alCancelar={() => setPorQuitar(null)}
        />
      )}
    </>
  );
}
