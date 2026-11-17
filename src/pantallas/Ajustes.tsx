import { useCallback, useEffect, useState } from 'react';
import { AvisoDeshacer } from '../componentes/AvisoDeshacer';
import { DialogoConfirmacion } from '../componentes/DialogoConfirmacion';
import { EncabezadoPantalla } from '../componentes/EncabezadoPantalla';
import { fechaLarga } from '../dominio/fechas';
import type { Ajustes as TipoAjustes, Categoria, DatosCompletos } from '../dominio/tipos';
import { guardarCategoria, leerAjustes, leerCategorias, leerTodo, reemplazarTodo } from '../datos/db';
import { useMes } from '../estado/MesContext';
import { descargarRespaldo } from '../respaldo/descargar';
import { leerRespaldo, MENSAJES_RESPALDO } from '../respaldo/importar';
import { SeccionCategorias } from './SeccionCategorias';
import { SeccionRespaldo } from './SeccionRespaldo';

type PorRestaurar = { datos: DatosCompletos; exportadoEn: string };

export function Ajustes() {
  const { db, actualizarLimites } = useMes();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ajustes, setAjustes] = useState<TipoAjustes | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [porRestaurar, setPorRestaurar] = useState<PorRestaurar | null>(null);
  /** Los datos de antes de restaurar, para "Deshacer". */
  const [anteriores, setAnteriores] = useState<DatosCompletos | null>(null);

  const cargar = useCallback(async () => {
    const [cats, aj] = await Promise.all([leerCategorias(db), leerAjustes(db)]);
    setCategorias(cats);
    setAjustes(aj);
  }, [db]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Cualquier acción nueva cierra el aviso de "Deshacer" y el error del archivo. */
  const nuevaAccion = () => {
    setAnteriores(null);
    setErrorArchivo(null);
  };

  const editar = (id: string | null) => {
    nuevaAccion();
    // Al cancelar, el foco vuelve al botón "Cambiar nombre" de esa fila.
    const anterior = editandoId;
    setEditandoId(id);
    if (id === null && anterior) {
      setTimeout(() => document.querySelector<HTMLButtonElement>(`[data-categoria="${anterior}"]`)?.focus());
    }
  };

  const guardarNombre = async (categoria: Categoria, nombre: string) => {
    await guardarCategoria(db, { ...categoria, nombre });
    await cargar();
    editar(null);
  };

  const cambiarVisible = async (categoria: Categoria) => {
    nuevaAccion();
    await guardarCategoria(db, { ...categoria, visible: !categoria.visible });
    await cargar();
  };

  const descargar = async () => {
    nuevaAccion();
    await descargarRespaldo(db);
    await cargar();
  };

  const elegirArchivo = async (archivo: File) => {
    nuevaAccion();
    const leido = leerRespaldo(await archivo.text());
    if (!leido.ok) {
      setErrorArchivo(MENSAJES_RESPALDO[leido.motivo]);
      return;
    }
    setPorRestaurar({ datos: leido.datos, exportadoEn: leido.exportadoEn });
  };

  const restaurar = async ({ datos }: PorRestaurar) => {
    setPorRestaurar(null);
    const antes = await leerTodo(db);
    await reemplazarTodo(db, datos);
    await cargar();
    await actualizarLimites();
    setAnteriores(antes);
  };

  const deshacerRestaurar = async () => {
    if (!anteriores) return;
    const antes = anteriores;
    setAnteriores(null);
    await reemplazarTodo(db, antes);
    await cargar();
    await actualizarLimites();
  };

  return (
    <>
      <EncabezadoPantalla titulo="Ajustes" conSelectorMes={false} />

      {anteriores && <AvisoDeshacer texto="Se restauró el respaldo." alDeshacer={() => void deshacerRestaurar()} />}

      <SeccionCategorias
        categorias={categorias}
        editandoId={editandoId}
        alEditar={editar}
        alGuardarNombre={(c, nombre) => void guardarNombre(c, nombre)}
        alCambiarVisible={(c) => void cambiarVisible(c)}
      />

      {ajustes && (
        <SeccionRespaldo
          ultimoRespaldo={ajustes.ultimoRespaldo}
          error={errorArchivo}
          alDescargar={() => void descargar()}
          alElegirArchivo={(archivo) => void elegirArchivo(archivo)}
        />
      )}

      <section className="caja seccion-ajustes" aria-labelledby="titulo-acerca">
        <h2 id="titulo-acerca" className="subtitulo">
          Acerca de Mis gastos
        </h2>
        <p className="ultimo-respaldo">Versión {__VERSION__}</p>
      </section>

      {porRestaurar && (
        <DialogoConfirmacion
          mensaje={`¿Reemplazar todos tus datos por los del respaldo del ${fechaLarga(porRestaurar.exportadoEn.slice(0, 10))}?`}
          textoConfirmar="Restaurar"
          alConfirmar={() => void restaurar(porRestaurar)}
          alCancelar={() => setPorRestaurar(null)}
        />
      )}
    </>
  );
}
