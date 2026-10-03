import { greetingFor } from '../greeting';

/** Fecha con una hora concreta; el dia da igual para el saludo. */
const at = (hour: number) => new Date(2026, 0, 15, hour, 30);

describe('greetingFor', () => {
  it('saluda segun el tramo del dia', () => {
    expect(greetingFor(at(9))).toBe('Buenos días');
    expect(greetingFor(at(15))).toBe('Buenas tardes');
    expect(greetingFor(at(22))).toBe('Buenas noches');
  });

  // Los bordes son justo donde un `<` de mas o de menos pasa
  // desapercibido: a las 12:00 ya es tarde, a las 20:00 ya es noche.
  it.each([
    [0, 'Buenas noches'],
    [5, 'Buenas noches'],
    [6, 'Buenos días'],
    [11, 'Buenos días'],
    [12, 'Buenas tardes'],
    [19, 'Buenas tardes'],
    [20, 'Buenas noches'],
    [23, 'Buenas noches'],
  ])('a las %i en punto dice "%s"', (hour, expected) => {
    expect(greetingFor(new Date(2026, 0, 15, hour, 0, 0))).toBe(expected);
  });

  it('cubre las 24 horas sin dejar ningun hueco', () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(greetingFor(at(hour))).toMatch(/^Buen/);
    }
  });
});
