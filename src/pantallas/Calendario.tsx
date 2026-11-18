import { useCallback, useEffect, useState } from 'react';
import { EncabezadoPantalla } from '../componentes/EncabezadoPantalla';
import { Icono, type NombreIcono } from '../componentes/Icono';
import {
  acumuladoPorSemana,
  diaInicial,
  elementosDelMes,
  estimadoDelMes,
  grillaDelMes,
  textoEstadoElemento,
  tituloDia,
  type Elemento,
  type EstadoElemento,
} from '../dominio/calendario';
import { nombreMes } from '../dominio/fechas';
import { fechaAlHacer } from '../dominio/gastos';
import { formatearMonto } from '../dominio/montos';
import { marcarPagado } from '../dominio/recurrentes';
import type { Categoria, Gasto } from '../dominio/tipos';
import { leerCategorias } from '../datos/db';
import { guardarGasto, leerGastosDelMes } from '../datos/gastos';
import { guardarPago, leerMesRecurrentes, type FilaRecurrente } from '../datos/recurrentes';
import { useMes } from '../estado/MesContext';

type Datos = { filas: FilaRecurrente[]; gastos: Gasto[]; categorias: Categoria[] };

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const NOMBRES_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const ICONO_ESTADO: Record<EstadoElemento, NombreIcono> = { hecho: 'check', pendiente: 'reloj', vencido: 'alerta' };

/** "2 pagados" / "1 por hacer" en la casilla del día. */
function textoResumenDia(estado: EstadoElemento, cantidad: number): string {
  if (estado === 'hecho') return cantidad === 1 ? '1 hecho' : `${cantidad} hechos`;
  if (estado === 'pendiente') return cantidad === 1 ? '1 pendiente' : `${cantidad} pendientes`;
  return cantidad === 1 ? '1 vencido' : `${cantidad} vencidos`;
}

export function Calendario() {
  const { db, hoy, mesActual, mesSeleccionado, actualizarLimites } = useMes();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [diaElegido, setDiaElegido] = useState(() => diaInicial(mesSeleccionado, hoy));

  const cargar = useCallback(async () => {
    const [filas, gastos, categorias] = await Promise.all([
      leerMesRecurrentes(db, mesSeleccionado, mesActual),
      leerGastosDelMes(db, mesSeleccionado),
      leerCategorias(db),
    ]);
    return { filas, gastos, categorias };
  }, [db, mesSeleccionado, mesActual]);

  useEffect(() => {
    let vigente = true;
    setDiaElegido(diaInicial(mesSeleccionado, hoy));
    void cargar().then((leidos) => {
      if (vigente) setDatos(leidos);
    });
    return () => {
      vigente = false;
    };
  }, [cargar, mesSeleccionado, hoy]);

  const encabezado = <EncabezadoPantalla titulo="Calendario" />;
  if (datos === null) return encabezado;

  const elementos = elementosDelMes({ mes: mesSeleccionado, hoy, ...datos });
  const estimado = estimadoDelMes(elementos, mesSeleccionado, hoy);
  const semanas = grillaDelMes(elementos, mesSeleccionado, hoy);
  const acumulado = acumuladoPorSemana(elementos, mesSeleccionado, hoy);
  const sinDia = elementos.filter((e) => e.dia === null);
  const delDia = elementos
    .filter((e) => e.dia === diaElegido)
    .sort((a, b) => ['vencido', 'pendiente', 'hecho'].indexOf(a.estado) - ['vencido', 'pendiente', 'hecho'].indexOf(b.estado));
  const fechaElegida = `${mesSeleccionado}-${String(diaElegido).padStart(2, '0')}`;
  const mayor = Math.max(1, estimado.total);

  const recargar = async () => {
    setDatos(await cargar());
    await actualizarLimites();
  };

  const completar = async (e: Elemento) => {
    if (e.pago) await guardarPago(db, marcarPagado(e.pago, true, hoy));
    if (e.gasto) {
      await guardarGasto(db, {
        ...e.gasto,
        porHacer: false,
        fecha: fechaAlHacer(e.gasto.fecha, hoy),
        actualizadoEn: new Date().toISOString(),
      });
    }
    await recargar();
  };

  const tramos = [
    { clave: 'gastado', texto: 'Ya gastado', monto: estimado.gastado },
    { clave: 'recurrentes', texto: 'Recurrentes por pagar', monto: estimado.recurrentesPorPagar },
    { clave: 'por-hacer', texto: 'Por hacer', monto: estimado.porHacer },
  ].filter((t) => !estimado.terminado || t.clave === 'gastado');

  const filaElemento = (e: Elemento) => (
    <li key={e.id} className={`elemento-dia elemento-dia--${e.estado}`}>
      <span className={`estado ${e.estado === 'vencido' ? 'estado--alerta' : e.estado === 'hecho' ? 'estado--pagado' : 'estado--por-hacer'}`}>
        <Icono nombre={ICONO_ESTADO[e.estado]} />
        {textoEstadoElemento(e)}
      </span>
      <span className="elemento-dia__nombre">
        {e.nombre}
        {e.detalle && <span className="fila-gasto__descripcion">{e.detalle}</span>}
      </span>
      <span className="elemento-dia__monto">{e.faltaMonto ? 'Falta el monto' : formatearMonto(e.monto)}</span>
      <span className="elemento-dia__accion">
        {e.estado !== 'hecho' && !estimado.terminado && (
          <button
            type="button"
            className="boton-hecho"
            aria-label={`${e.tipo === 'recurrente' ? 'Marcar pagado' : 'Ya lo hice'}: ${e.nombre}`}
            onClick={() => void completar(e)}
          >
            <Icono nombre="check" />
            {e.tipo === 'recurrente' ? 'Marcar pagado' : 'Ya lo hice'}
          </button>
        )}
      </span>
    </li>
  );

  return (
    <>
      {encabezado}

      {/* CAL-1 */}
      <section className="caja estimado" aria-labelledby="titulo-estimado">
        <div id="titulo-estimado" className="ayuda">
          {estimado.terminado ? `Así terminó ${nombreMes(mesSeleccionado)}` : 'Este mes terminarías en'}
        </div>
        <div className="total-mes__cifra">{formatearMonto(estimado.total)}</div>
        <div className="barra-tramos" aria-hidden="true">
          {tramos.map((t) =>
            t.monto > 0 ? (
              <span key={t.clave} className={`barra-tramos__tramo tramo-estimado--${t.clave}`} style={{ flexGrow: t.monto }} />
            ) : null,
          )}
        </div>
        <ul className="leyenda-estimado">
          {tramos.map((t) => (
            <li key={t.clave}>
              <span className={`leyenda-estimado__muestra tramo-estimado--${t.clave}`} aria-hidden="true" />
              <span>{t.texto}</span>
              <strong>{formatearMonto(t.monto)}</strong>
            </li>
          ))}
        </ul>
      </section>

      {/* CAL-2 y CAL-3 */}
      <section className="caja calendario" aria-labelledby="titulo-calendario">
        <h2 id="titulo-calendario" className="subtitulo">
          Calendario de {nombreMes(mesSeleccionado)}
        </h2>
        <div className="ayuda">Haz clic en un día para ver qué tiene.</div>
        <div className="calendario__grilla" role="group" aria-labelledby="titulo-calendario">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="calendario__cabecera" aria-hidden="true">
              {d}
            </div>
          ))}
          {semanas.flat().map((dia, i) =>
            dia === null ? (
              <div key={`vacio-${i}`} className="calendario__vacio" />
            ) : (
              <button
                key={dia.dia}
                type="button"
                className={`calendario__dia${dia.esHoy ? ' calendario__dia--hoy' : ''}`}
                aria-pressed={dia.dia === diaElegido}
                aria-label={[
                  `${dia.esHoy ? 'Hoy, ' : ''}${NOMBRES_SEMANA[i % 7]} ${dia.dia}`,
                  ...dia.resumen.map((r) => `${textoResumenDia(r.estado, r.cantidad)}, ${formatearMonto(r.monto)}`),
                ].join('. ')}
                onClick={() => setDiaElegido(dia.dia)}
              >
                <span className="calendario__numero">
                  {dia.dia}
                  {dia.esHoy && <span className="calendario__hoy">Hoy</span>}
                </span>
                {dia.resumen.map((r) => (
                  <span key={r.estado} className={`calendario__linea calendario__linea--${r.estado}`}>
                    <Icono nombre={ICONO_ESTADO[r.estado]} />
                    {formatearMonto(r.monto)}
                  </span>
                ))}
              </button>
            ),
          )}
        </div>
        <div className="calendario__simbolos ayuda" aria-hidden="true">
          <span>
            <Icono nombre="check" /> Hecho o pagado
          </span>
          <span>
            <Icono nombre="reloj" /> Pendiente
          </span>
          <span>
            <Icono nombre="alerta" /> Vencido
          </span>
        </div>

        <div className="detalle-dia" aria-live="polite">
          <h3 className="detalle-dia__titulo">{tituloDia(fechaElegida, hoy)}</h3>
          {delDia.length === 0 ? (
            <p className="ayuda">No hay nada este día.</p>
          ) : (
            <ul className="detalle-dia__lista">{delDia.map(filaElemento)}</ul>
          )}
        </div>

        {sinDia.length > 0 && (
          <div className="detalle-dia">
            <h3 className="detalle-dia__titulo">Sin día fijo</h3>
            <ul className="detalle-dia__lista">{sinDia.map(filaElemento)}</ul>
          </div>
        )}
      </section>

      {/* CAL-4 */}
      <section className="caja panel" aria-labelledby="titulo-acumulado">
        <h2 id="titulo-acumulado" className="subtitulo">
          Cómo se acumula tu gasto
        </h2>
        <ul className="lista-barras acumulado">
          {acumulado.map((s) => {
            const estimadoExtra = s.estimado - s.gastado;
            return (
              <li key={s.desde} className="fila-barra">
                <span className="fila-barra__linea">
                  <span className="fila-barra__nombre">
                    Del {s.desde} al {s.hasta}
                  </span>
                  <span className="fila-barra__monto">{formatearMonto(s.estimado)}</span>
                </span>
                <span className="barra barra--acumulado" aria-hidden="true">
                  <span className="barra__relleno" style={{ width: `${(s.gastado / mayor) * 100}%` }} />
                  {estimadoExtra > 0 && (
                    <span className="barra__estimado" style={{ width: `${(estimadoExtra / mayor) * 100}%` }} />
                  )}
                </span>
                <span className="ayuda">
                  {formatearMonto(s.gastado)} gastado
                  {estimadoExtra > 0 && ` + ${formatearMonto(estimadoExtra)} estimado`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
