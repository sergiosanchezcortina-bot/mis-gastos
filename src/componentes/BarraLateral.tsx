import { Icono, type NombreIcono } from './Icono';

export type Pestana = 'resumen' | 'calendario' | 'recurrentes' | 'noRecurrentes' | 'ajustes';

type Item = { id: Pestana; texto: string; icono: NombreIcono };

// La pestaña Cartola se agrega en la fase 6 (brief 6.2).
const PRINCIPALES: Item[] = [
  { id: 'resumen', texto: 'Resumen', icono: 'resumen' },
  { id: 'calendario', texto: 'Calendario', icono: 'calendario' },
  { id: 'recurrentes', texto: 'Gastos recurrentes', icono: 'recurrentes' },
  { id: 'noRecurrentes', texto: 'Gastos no recurrentes', icono: 'noRecurrentes' },
];

const AJUSTES: Item = { id: 'ajustes', texto: 'Ajustes', icono: 'ajustes' };

export const TITULOS: Record<Pestana, string> = {
  resumen: 'Resumen',
  calendario: 'Calendario',
  recurrentes: 'Gastos recurrentes',
  noRecurrentes: 'Gastos no recurrentes',
  ajustes: 'Ajustes',
};

type Props = {
  activa: Pestana;
  alElegir: (pestana: Pestana) => void;
};

export function BarraLateral({ activa, alElegir }: Props) {
  const boton = (item: Item, extra = '') => (
    <button
      key={item.id}
      type="button"
      className={`menu__item ${extra}`.trim()}
      aria-current={item.id === activa ? 'page' : undefined}
      onClick={() => alElegir(item.id)}
    >
      <Icono nombre={item.icono} />
      <span>{item.texto}</span>
    </button>
  );

  return (
    <nav className="menu" aria-label="Secciones de la app">
      <div className="menu__nombre">Mis gastos</div>
      {PRINCIPALES.map((item) => boton(item))}
      {boton(AJUSTES, 'menu__item--ajustes')}
    </nav>
  );
}
