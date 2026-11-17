import { describe, expect, it } from 'vitest';
import type { Gasto, PagoRecurrente } from './tipos';
import { necesitaRespaldo } from './avisoRespaldo';

const gasto = (fecha: string) => ({ fecha }) as Gasto;
const pago = (fechaPago: string | null) => ({ pagado: fechaPago !== null, fechaPago }) as PagoRecurrente;
const sinDatos = { gastos: [], pagos: [] };

describe('necesitaRespaldo (RES-9, AJU-A7)', () => {
  it('con 30 días desde el último respaldo todavía no avisa', () => {
    expect(necesitaRespaldo('2026-10-18T10:00:00', sinDatos, '2026-11-17')).toBe(false);
  });

  it('con 31 días avisa', () => {
    expect(necesitaRespaldo('2026-10-17T23:59:00', sinDatos, '2026-11-17')).toBe(true);
  });

  it('cruza el cambio de año', () => {
    expect(necesitaRespaldo('2026-12-01T09:00:00', sinDatos, '2027-01-02')).toBe(true);
  });

  it('sin respaldo ni datos no avisa', () => {
    expect(necesitaRespaldo(null, sinDatos, '2026-11-17')).toBe(false);
  });

  it('sin respaldo cuenta desde el dato más antiguo', () => {
    expect(necesitaRespaldo(null, { gastos: [gasto('2026-11-01')], pagos: [] }, '2026-11-17')).toBe(false);
    expect(necesitaRespaldo(null, { gastos: [gasto('2026-11-01')], pagos: [pago('2026-10-05')] }, '2026-11-17')).toBe(true);
  });

  it('los recurrentes sin pagar no cuentan como dato', () => {
    expect(necesitaRespaldo(null, { gastos: [], pagos: [pago(null)] }, '2026-11-17')).toBe(false);
  });
});
