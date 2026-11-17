/**
 * El mes seleccionado es uno solo para toda la app (brief 6.3).
 * Al abrir la app es el mes actual.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fechaLocal, limitesSelectorMes, mesAnterior, mesDeFecha, mesSiguiente } from '../dominio/fechas';
import { primerMesConDatos as leerPrimerMes, type BaseDeDatos } from '../datos/db';

type ValorMes = {
  db: BaseDeDatos;
  hoy: string;
  mesActual: string;
  mesSeleccionado: string;
  puedeIrAnterior: boolean;
  puedeIrSiguiente: boolean;
  irAnterior: () => void;
  irSiguiente: () => void;
  irAMes: (mes: string) => void;
  /** Volver a calcular el primer mes con datos después de guardar o borrar algo. */
  actualizarLimites: () => Promise<void>;
};

const ContextoMes = createContext<ValorMes | null>(null);

type Props = {
  db: BaseDeDatos;
  children: ReactNode;
  /** Solo para pruebas: reemplaza el reloj del computador. */
  obtenerHoy?: () => string;
};

export function ProveedorMes({ db, children, obtenerHoy = fechaLocal }: Props) {
  const [hoy, setHoy] = useState(obtenerHoy);
  const mesActual = mesDeFecha(hoy);
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual);
  const [primerMes, setPrimerMes] = useState<string | null>(null);

  const actualizarLimites = useCallback(async () => {
    setPrimerMes(await leerPrimerMes(db));
  }, [db]);

  useEffect(() => {
    void actualizarLimites();
  }, [actualizarLimites]);

  // Si la app queda abierta de un día para otro, "hoy" se actualiza al volver a ella.
  useEffect(() => {
    const revisar = () => setHoy(obtenerHoy());
    window.addEventListener('focus', revisar);
    document.addEventListener('visibilitychange', revisar);
    return () => {
      window.removeEventListener('focus', revisar);
      document.removeEventListener('visibilitychange', revisar);
    };
  }, [obtenerHoy]);

  const { puedeIrAnterior, puedeIrSiguiente } = limitesSelectorMes(mesSeleccionado, mesActual, primerMes);

  const valor = useMemo<ValorMes>(
    () => ({
      db,
      hoy,
      mesActual,
      mesSeleccionado,
      puedeIrAnterior,
      puedeIrSiguiente,
      irAnterior: () => {
        if (puedeIrAnterior) setMesSeleccionado(mesAnterior(mesSeleccionado));
      },
      irSiguiente: () => {
        if (puedeIrSiguiente) setMesSeleccionado(mesSiguiente(mesSeleccionado));
      },
      irAMes: (mes) => setMesSeleccionado(mes > mesActual ? mesActual : mes),
      actualizarLimites,
    }),
    [db, hoy, mesActual, mesSeleccionado, puedeIrAnterior, puedeIrSiguiente, actualizarLimites],
  );

  return <ContextoMes.Provider value={valor}>{children}</ContextoMes.Provider>;
}

export function useMes(): ValorMes {
  const valor = useContext(ContextoMes);
  if (!valor) throw new Error('useMes debe usarse dentro de ProveedorMes');
  return valor;
}
