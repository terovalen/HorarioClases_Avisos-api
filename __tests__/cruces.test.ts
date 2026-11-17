/** Lógica pura del servidor: cruces de bloques (6 casos con bordes). */
import { encontrarCruces, seCruzan } from '../lib/logica/cruces';

const LUNES = (inicio: string, fin: string, id?: string) => ({
  id,
  dia: 1,
  hora_inicio: inicio,
  hora_fin: fin,
});

describe('seCruzan (servidor)', () => {
  it('lunes 07:00–09:00 vs 08:00–10:00 se cruzan', () => {
    expect(seCruzan(LUNES('07:00', '09:00'), LUNES('08:00', '10:00'))).toBe(true);
  });
  it('tocarse en el borde no es cruce', () => {
    expect(seCruzan(LUNES('07:00', '09:00'), LUNES('09:00', '10:00'))).toBe(false);
  });
  it('bloque contenido se cruza', () => {
    expect(seCruzan(LUNES('07:00', '12:00'), LUNES('08:00', '09:00'))).toBe(true);
  });
  it('días distintos no se cruzan', () => {
    expect(
      seCruzan(LUNES('07:00', '09:00'), {
        dia: 3,
        hora_inicio: '07:00',
        hora_fin: '09:00',
      }),
    ).toBe(false);
  });
  it('mismo horario se cruza', () => {
    expect(seCruzan(LUNES('07:00', '09:00'), LUNES('07:00', '09:00'))).toBe(true);
  });
  it('el cruce es simétrico', () => {
    expect(seCruzan(LUNES('08:00', '10:00'), LUNES('07:00', '09:00'))).toBe(true);
  });
});

describe('encontrarCruces (servidor)', () => {
  it('excluye al propio bloque por id', () => {
    const existentes = [LUNES('07:00', '09:00', 'a')];
    expect(encontrarCruces(LUNES('08:00', '10:00', 'a'), existentes)).toHaveLength(0);
  });
});
