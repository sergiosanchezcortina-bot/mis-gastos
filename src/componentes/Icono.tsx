/**
 * Íconos de las pantallas de referencia (design/pantallas). Siempre acompañan a un texto,
 * por eso van ocultos para los lectores de pantalla.
 */
import type { ClaveIcono } from '../dominio/tipos';

const TRAZOS = {
  // Navegación
  resumen: 'M4 20V11M12 20V4M20 20v-7',
  recurrentes: 'M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5',
  noRecurrentes: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 8v8M8 12h8',
  cartola: 'M12 16V4M7 9l5-5l5 5M4 20h16',
  ajustes: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  // Acciones y estados
  anterior: 'M15 5l-7 7l7 7',
  siguiente: 'M9 5l7 7l-7 7',
  agregar: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7',
  abajo: 'M6 9l6 6l6-6',
  alerta: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 8v5M12 16.5h.01',
  // Categorías
  supermercado: 'M3 5h2l2.4 10h9.8L20 8H6.2M9 19.5h.01M17 19.5h.01',
  salud: 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM12 8.5v7M8.5 12h7',
  transporte: 'M5 17v-5l2-5h10l2 5v5M3.5 17h17M7 17v2M17 17v2M8 13h.01M16 13h.01',
  casa: 'M4 11l8-7l8 7M6 9.5V20h12V9.5',
  salidas: 'M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M6 21h9',
  familia: 'M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.4-7 10-7 10z',
  ropa: 'M8.5 4L3 8l2.5 3.5L8 10v10h8V10l2.5 1.5L21 8l-5.5-4a3.5 3.5 0 0 1-7 0z',
  otro: 'M6 12h.01M12 12h.01M18 12h.01',
} as const satisfies Record<ClaveIcono, string> & Record<string, string>;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre }: { nombre: NombreIcono }) {
  return (
    <svg
      className="icono"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
