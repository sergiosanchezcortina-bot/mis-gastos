import { useEffect, useState } from 'react';
import { BarraLateral, TITULOS, type Pestana } from './componentes/BarraLateral';
import { ProveedorMes } from './estado/MesContext';
import type { BaseDeDatos } from './datos/db';
import { Resumen } from './pantallas/Resumen';
import { GastosRecurrentes } from './pantallas/GastosRecurrentes';
import { GastosNoRecurrentes } from './pantallas/GastosNoRecurrentes';
import { Ajustes } from './pantallas/Ajustes';

type Props = {
  db: BaseDeDatos;
  /** Solo para pruebas: reemplaza el reloj del computador. */
  obtenerHoy?: () => string;
};

export function App({ db, obtenerHoy }: Props) {
  // La app abre siempre en Resumen (brief 6.2).
  const [pestana, setPestana] = useState<Pestana>('resumen');

  useEffect(() => {
    document.title = `${TITULOS[pestana]} · Mis gastos`;
  }, [pestana]);

  return (
    <ProveedorMes db={db} obtenerHoy={obtenerHoy}>
      <div className="app">
        <BarraLateral activa={pestana} alElegir={setPestana} />
        <main className="contenido">
          <div className="contenido__columna">
            {pestana === 'resumen' && <Resumen irA={setPestana} />}
            {pestana === 'recurrentes' && <GastosRecurrentes />}
            {pestana === 'noRecurrentes' && <GastosNoRecurrentes />}
            {pestana === 'ajustes' && <Ajustes />}
          </div>
        </main>
      </div>
    </ProveedorMes>
  );
}
