import { useEffect, useMemo, useRef, useState } from 'react';
import { AvisoDeshacer } from '../componentes/AvisoDeshacer';
import { DialogoConfirmacion } from '../componentes/DialogoConfirmacion';
import { EncabezadoPantalla } from '../componentes/EncabezadoPantalla';
import { mesDeFecha, nombreMes } from '../dominio/fechas';
import {
  fechaAlHacer,
  FILAS_VISIBLES,
  ordenarGastos,
  textoConfirmarEliminar,
  textoResumenGastos,
  textoVerTodos,
} from '../dominio/gastos';
import type { Categoria, Gasto } from '../dominio/tipos';
import { leerCategorias } from '../datos/db';
import { eliminarGasto, guardarGasto, leerGastosDelMes, nuevoGasto } from '../datos/gastos';
import { useMes } from '../estado/MesContext';
import { FilaGasto } from './FilaGasto';
import { FormularioGasto, type DatosGasto } from './FormularioGasto';

const ahora = () => new Date().toISOString();

export function GastosNoRecurrentes() {
  const { db, hoy, mesSeleccionado, irAMes, actualizarLimites } = useMes();
  const [gastos, setGastos] = useState<Gasto[] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [verTodos, setVerTodos] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const [porEliminar, setPorEliminar] = useState<Gasto | null>(null);
  const [eliminado, setEliminado] = useState<Gasto | null>(null);
  /** Después de cancelar "Corregir", el foco vuelve al botón de esa fila. */
  const volverA = useRef<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setVerTodos(false);
    setCorrigiendo(null);
    setEliminado(null);
    void Promise.all([leerGastosDelMes(db, mesSeleccionado), leerCategorias(db)]).then(([leidos, cats]) => {
      if (!vigente) return;
      setGastos(leidos);
      setCategorias(cats);
    });
    return () => {
      vigente = false;
    };
  }, [db, mesSeleccionado]);

  useEffect(() => {
    if (corrigiendo === null && volverA.current) {
      document.querySelector<HTMLButtonElement>(`[data-corregir="${volverA.current}"]`)?.focus();
      volverA.current = null;
    }
  }, [corrigiendo]);

  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const visibles = useMemo(() => categorias.filter((c) => c.visible), [categorias]);

  /** Guarda y deja la vista en el mes del gasto (NOR-4). */
  const guardarYMostrar = async (gasto: Gasto) => {
    await guardarGasto(db, gasto);
    setEliminado(null);
    const mes = mesDeFecha(gasto.fecha);
    if (mes !== mesSeleccionado) {
      irAMes(mes); // Al cambiar de mes la tabla se vuelve a leer.
    } else {
      setGastos((actuales) => ordenarGastos([gasto, ...(actuales ?? []).filter((g) => g.id !== gasto.id)]));
    }
    await actualizarLimites();
  };

  const agregar = async (datos: DatosGasto) => {
    await guardarYMostrar(nuevoGasto(datos, ahora()));
  };

  const corregir = async (gasto: Gasto, datos: DatosGasto) => {
    if (mesDeFecha(datos.fecha) !== mesSeleccionado) {
      setGastos((actuales) => actuales?.filter((g) => g.id !== gasto.id) ?? null);
    }
    setCorrigiendo(null);
    await guardarYMostrar({ ...gasto, ...datos, actualizadoEn: ahora() });
  };

  /** "Ya lo hice" (NOR-11): pasa a gasto normal con la fecha de hoy. */
  const hacer = async (gasto: Gasto) => {
    await guardarYMostrar({ ...gasto, porHacer: false, fecha: fechaAlHacer(gasto.fecha, hoy), actualizadoEn: ahora() });
  };

  const eliminar = async (gasto: Gasto) => {
    setPorEliminar(null);
    setCorrigiendo(null);
    await eliminarGasto(db, gasto.id);
    setGastos((actuales) => actuales?.filter((g) => g.id !== gasto.id) ?? null);
    setEliminado(gasto);
    await actualizarLimites();
  };

  const deshacer = async () => {
    if (!eliminado) return;
    const gasto = eliminado;
    setEliminado(null);
    await guardarGasto(db, gasto);
    setGastos((actuales) => ordenarGastos([gasto, ...(actuales ?? [])]));
    volverA.current = gasto.id;
    await actualizarLimites();
  };

  /** Categorías para corregir: las visibles más la del gasto, aunque esté oculta. */
  const categoriasPara = (gasto: Gasto) => {
    const propia = categoriaPorId.get(gasto.categoriaId);
    return propia && !propia.visible ? [...visibles, propia] : visibles;
  };

  const lista = gastos ?? [];
  const mostrados = verTodos ? lista : lista.slice(0, FILAS_VISIBLES);

  return (
    <>
      <EncabezadoPantalla titulo="Gastos no recurrentes" />

      <section className="caja">
        <FormularioGasto
          modo="agregar"
          categorias={visibles}
          hoy={hoy}
          alGuardar={agregar}
        />
      </section>

      {eliminado && <AvisoDeshacer texto="Gasto eliminado." alDeshacer={() => void deshacer()} />}

      {gastos !== null && (
        <section className="tabla" aria-labelledby="titulo-gastos-mes">
          <div className="tabla__contenido">
            <div className="tabla__titulo">
              <h2 id="titulo-gastos-mes" className="subtitulo">
                Gastos de {nombreMes(mesSeleccionado)}
              </h2>
              {lista.length > 0 && <div className="ayuda">{textoResumenGastos(lista)}</div>}
            </div>

            {lista.length === 0 ? (
              <p className="tabla__vacia">Todavía no anotas gastos este mes. Usa el formulario de arriba.</p>
            ) : (
              <>
                <div className="tabla__encabezado fila-gasto" aria-hidden="true">
                  <div className="fila-gasto__fecha">Fecha</div>
                  <div className="fila-gasto__categoria">Categoría</div>
                  <div className="fila-gasto__monto">Monto</div>
                  <div className="fila-gasto__accion" />
                </div>
                {mostrados.map((gasto) =>
                  corrigiendo === gasto.id ? (
                    <div key={gasto.id} className="tabla__formulario">
                      <FormularioGasto
                        modo="corregir"
                        categorias={categoriasPara(gasto)}
                        hoy={hoy}
                        inicial={gasto}
                        alGuardar={(datos) => corregir(gasto, datos)}
                        alCancelar={() => {
                          volverA.current = gasto.id;
                          setCorrigiendo(null);
                        }}
                        alEliminar={() => setPorEliminar(gasto)}
                      />
                    </div>
                  ) : (
                    <FilaGasto
                      key={gasto.id}
                      gasto={gasto}
                      categoria={categoriaPorId.get(gasto.categoriaId)}
                      hoy={hoy}
                      alCorregir={() => {
                        setEliminado(null);
                        setCorrigiendo(gasto.id);
                      }}
                      alHacer={() => void hacer(gasto)}
                      alNoHacer={() => {
                        setEliminado(null);
                        setPorEliminar(gasto);
                      }}
                    />
                  ),
                )}
                {!verTodos && lista.length > FILAS_VISIBLES && (
                  <div className="tabla__mas">
                    <button
                      type="button"
                      className="boton-enlace"
                      onClick={() => {
                        setEliminado(null);
                        setVerTodos(true);
                        const siguiente = lista[FILAS_VISIBLES];
                        if (siguiente) volverA.current = siguiente.id;
                        // Lleva el foco a la primera fila que estaba oculta.
                        setTimeout(() => {
                          if (volverA.current) {
                            document.querySelector<HTMLButtonElement>(`[data-corregir="${volverA.current}"]`)?.focus();
                            volverA.current = null;
                          }
                        });
                      }}
                    >
                      {textoVerTodos(lista.length)}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {porEliminar && (
        <DialogoConfirmacion
          mensaje={textoConfirmarEliminar(porEliminar, categoriaPorId.get(porEliminar.categoriaId)?.nombre ?? 'Sin categoría', hoy)}
          textoConfirmar="Eliminar"
          alConfirmar={() => void eliminar(porEliminar)}
          alCancelar={() => setPorEliminar(null)}
        />
      )}
    </>
  );
}
