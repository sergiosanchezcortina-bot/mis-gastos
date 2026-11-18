import { useCallback, useEffect, useState } from 'react';
import { AvisoRespaldo } from '../componentes/AvisoRespaldo';
import { BarraAvance } from '../componentes/BarraAvance';
import type { Pestana } from '../componentes/BarraLateral';
import { Icono } from '../componentes/Icono';
import { SelectorMes } from '../componentes/SelectorMes';
import { Tarjeta } from '../componentes/Tarjeta';
import { necesitaRespaldo } from '../dominio/avisoRespaldo';
import { nombreMes } from '../dominio/fechas';
import { formatearMonto } from '../dominio/montos';
import { avancePagados, textoPagados, totalesRecurrentes } from '../dominio/recurrentes';
import {
  etiquetaTotal,
  filasEnQueSeFue,
  filasMesAMes,
  leyendaMesAMes,
  fraseComparacion,
  gastado,
  gastosDelMes,
  textoGastosAnotados,
  textoVerPendientes,
  tieneDatos,
} from '../dominio/resumen';
import { leerDatosResumen, type DatosResumen } from '../datos/resumen';
import { useMes } from '../estado/MesContext';
import { descargarRespaldo } from '../respaldo/descargar';
import { EnQueSeFue } from './EnQueSeFue';
import { MesAMes } from './MesAMes';

type Props = {
  irA: (pestana: Pestana) => void;
};

export function Resumen({ irA }: Props) {
  const { db, hoy, mesActual, mesSeleccionado } = useMes();
  const [datos, setDatos] = useState<DatosResumen | null>(null);

  const cargar = useCallback(
    () => leerDatosResumen(db, mesSeleccionado, mesActual),
    [db, mesSeleccionado, mesActual],
  );

  useEffect(() => {
    let vigente = true;
    void cargar().then((leidos) => {
      if (vigente) setDatos(leidos);
    });
    return () => {
      vigente = false;
    };
  }, [cargar]);

  const base = datos && { gastos: datos.gastos, pagos: datos.pagos };

  const encabezado = (
    <>
      <div className="encabezado">
        <SelectorMes comoTitulo />
        <button type="button" className="boton-principal" onClick={() => irA('noRecurrentes')}>
          <Icono nombre="agregar" />
          Agregar gasto
        </button>
      </div>
      {/* RES-9 */}
      {datos && base && necesitaRespaldo(datos.ajustes.ultimoRespaldo, base, hoy) && (
        <AvisoRespaldo
          alHacerRespaldo={() => {
            void descargarRespaldo(db).then(cargar).then(setDatos);
          }}
        />
      )}
    </>
  );

  // Siempre la misma estructura, para que el encabezado no se vuelva a montar al cargar.
  if (datos === null || base === null) return <>{encabezado}</>;

  const mes = mesSeleccionado;
  const recurrentes = totalesRecurrentes(datos.pagos.filter((p) => p.mes === mes));
  const noRecurrentes = gastosDelMes(datos.gastos, mes);
  const totalNoRecurrentes = noRecurrentes.reduce((t, g) => t + g.monto, 0);
  const hayRecurrentes = recurrentes.cantidad > 0;

  const tarjetaFaltaPagar = hayRecurrentes && (
    <Tarjeta
      titulo="Te falta pagar"
      monto={recurrentes.porPagar}
      alerta={recurrentes.pendientes > 0}
      detalle={
        recurrentes.pendientes > 0 ? (
          <button type="button" className="boton-enlace" onClick={() => irA('recurrentes')}>
            {textoVerPendientes(recurrentes.pendientes)}
          </button>
        ) : (
          'Todo pagado'
        )
      }
    />
  );

  // Estado vacío (RES-8). Si quedan cuentas por pagar, se sigue viendo cuánto falta.
  if (!tieneDatos(base, mes)) {
    return (
      <>
        {encabezado}
        <div className="vacio">
          <p>Todavía no hay gastos este mes.</p>
          <button type="button" className="boton-principal" onClick={() => irA('noRecurrentes')}>
            <Icono nombre="agregar" />
            Agregar gasto
          </button>
        </div>
        {recurrentes.pendientes > 0 && <div className="tarjetas">{tarjetaFaltaPagar}</div>}
      </>
    );
  }

  const frase = fraseComparacion(base, mes, hoy);
  const filasMeses = filasMesAMes(base, mes, mesActual, datos.categorias);

  return (
    <>
      {encabezado}

      <div className="total-mes">
        <div className="ayuda">{etiquetaTotal(mes, mesActual)}</div>
        <div className="total-mes__cifra">{formatearMonto(gastado(base, mes))}</div>
        {frase && <div>{frase}</div>}
      </div>

      <div className="tarjetas">
        {hayRecurrentes && (
          <Tarjeta titulo="Recurrentes pagados" monto={recurrentes.pagado} detalle={textoPagados(recurrentes.pagados, recurrentes.cantidad)}>
            <BarraAvance proporcion={avancePagados(recurrentes.pagados, recurrentes.cantidad)} acento />
          </Tarjeta>
        )}
        <Tarjeta titulo="No recurrentes" monto={totalNoRecurrentes} detalle={textoGastosAnotados(noRecurrentes.length)} />
        {tarjetaFaltaPagar}
      </div>

      <div className="paneles">
        {/* La clave reinicia la fila abierta al cambiar de mes. */}
        <EnQueSeFue
          key={mes}
          filas={filasEnQueSeFue(base, mes, datos.categorias)}
          gastosRecurrentes={datos.gastosRecurrentes}
          hoy={hoy}
        />
      </div>

      <MesAMes
        filas={filasMeses}
        leyenda={leyendaMesAMes(base, filasMeses, mes, datos.categorias)}
        nombreMesSeleccionado={nombreMes(mes)}
      />
    </>
  );
}
