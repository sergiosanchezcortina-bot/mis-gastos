import { describe, expect, it } from 'vitest';
import type { Gasto, PagoRecurrente } from './tipos';
import { DIAS_SIN_RESPALDO, necesitaRespaldo } from './avisoRespaldo';

const gasto = (fecha: string) => ({ fecha }) as Gasto;
const pago = (fechaPago: string | null) => ({ pagado: fechaPago !== null, fechaPago }) as PagoRecurrente;
const sinDatos = { gastos: [], pagos: [] };

describe('necesitaRespaldo (RES-9, AJU-A7)', () => {
  it('con 7 días desde el último respaldo todavía no avisa', () => {
    expect(DIAS_SIN_RESPALDO).toBe(7);
    expect(necesitaRespaldo('2026-11-10T10:00:00', sinDatos, '2026-11-17')).toBe(false);
  });

  it('con 8 días avisa', () => {
    expect(necesitaRespaldo('2026-11-09T23:59:00', sinDatos, '2026-11-17')).toBe(true);
  });

  it('cruza el cambio de año', () => {
    expect(necesitaRespaldo('2026-12-28T09:00:00', sinDatos, '2027-01-05')).toBe(true);
    expect(necesitaRespaldo('2026-12-29T09:00:00', sinDatos, '2027-01-05')).toBe(false);
  });

  it('sin respaldo ni datos no avisa', () => {
    expect(necesitaRespaldo(null, sinDatos, '2026-11-17')).toBe(false);
  });

  it('sin respaldo cuenta desde el dato más antiguo', () => {
    expect(necesitaRespaldo(null, { gastos: [gasto('2026-11-12')], pagos: [] }, '2026-11-17')).toBe(false);
    expect(necesitaRespaldo(null, { gastos: [gasto('2026-11-12')], pagos: [pago('2026-11-05')] }, '2026-11-17')).toBe(true);
  });

  it('los recurrentes sin pagar no cuentan como dato', () => {
    expect(necesitaRespaldo(null, { gastos: [], pagos: [pago(null)] }, '2026-11-17')).toBe(false);
  });
});
