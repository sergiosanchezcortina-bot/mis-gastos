import { useEffect, useRef, useState } from 'react';
import { AvisoDeshacer } from '../componentes/AvisoDeshacer';
import { BarraAvance } from '../componentes/BarraAvance';
import { DialogoConfirmacion } from '../componentes/DialogoConfirmacion';
import { EncabezadoPantalla } from '../componentes/EncabezadoPantalla';
import { Icono } from '../componentes/Icono';
import { Tarjeta } from '../componentes/Tarjeta';
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
  type DeshacerQuitar,
  type FilaRecurrente as Fila,
} from '../datos/recurrentes';
import { useMes } from '../estado/MesContext';
import { FilaRecurrente } from './FilaRecurrente';
import { FormularioRecurrente, type DatosRecurrente } from './FormularioRecurrente';

type Formulario = { modo: 'agregar' } | { modo: 'editar'; gastoId: string } | null;
type Aviso = { texto: string; deshacer: DeshacerQuitar } | null;

const ordenar = (filas: Fila[]) => [...filas].sort((a, b) => compararPorVencimiento(a.gasto, b.gasto));

export function GastosRecurrentes() {
  const { db, hoy, mesActual, mesSeleccionado, actualizarLimites } = useMes();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [editandoLista, setEditandoLista] = useState(false);
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [porQuitar, setPorQuitar] = useState<Fila | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const botonAgregar = useRef<HTMLButtonElement>(null);

  const cargar = async () => {
    setFilas(await leerMesRecurrentes(db, mesSeleccionado, mesActual));
  };

  useEffect(() => {
    let vigente = true;
    setFormulario(null);
    setAviso(null);
    void leerMesRecurrentes(db, mesSeleccionado, mesActual).then((leidas) => {
      if (vigente) setFilas(leidas);
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
    const gasto = await editarRecurrente(db, fila.gasto, { nombre: datos.nombre, diaVencimiento: datos.diaVencimiento });
    setFilas((actuales) => ordenar(actuales?.map((f) => (f.gasto.id === gasto.id ? { ...f, gasto } : f)) ?? []));
    setFormulario(null);
  };

  const quitar = async (fila: Fila) => {
    setPorQuitar(null);
    const deshacer = await quitarRecurrente(db, fila.gasto.id, mesSeleccionado);
    const leidas = await leerMesRecurrentes(db, mesSeleccionado, mesActual);
    // La fila desaparece y el aviso aparece en el mismo momento.
    setFilas(leidas);
    setAviso({ texto: `Se quitó ${fila.gasto.nombre}.`, deshacer });
    await actualizarLimites();
  };

  const deshacerUltimo = async () => {
    if (!aviso) return;
    await deshacerQuitar(db, aviso.deshacer);
    setAviso(null);
    await cargar();
    await actualizarLimites();
  };

  const abrirFormulario = (nuevo: Formulario) => {
    setAviso(null);
    setFormulario(nuevo);
  };

  const formularioAgregar = formulario?.modo === 'agregar' && (
    <FormularioRecurrente modo="agregar" alGuardar={(d) => void agregar(d)} alCancelar={() => {
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
        <div className="tabla__contenido">
          <div className="tabla__encabezado" aria-hidden="true">
            <div className="tabla__col-pagado">Pagado</div>
            <div className="tabla__col-gasto">Gasto</div>
            <div className="tabla__col-monto">Monto</div>
          </div>
          {filas.map((fila) =>
            formulario?.modo === 'editar' && formulario.gastoId === fila.gasto.id ? (
              <div key={fila.pago.id} className="tabla__formulario">
                <FormularioRecurrente
                  modo="editar"
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
