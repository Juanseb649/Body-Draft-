import { INITIAL_GLYPHS } from '../../components/molecules/logoGlyphs.generated';
import { centeredViewBox, initialOf } from '../avatar';

describe('initialOf', () => {
  it.each([
    ['Sebastián Ibarra', 'S'],
    ['  nora vega', 'N'],
    ['ñandú', 'Ñ'],
    ['álvaro', 'Á'],
    ['"Rubén"', 'R'],
    ['🔥 Lu', 'L'],
    ['7 agujas', '7'],
  ])('%s → %s', (name, expected) => {
    expect(initialOf(name)).toBe(expected);
  });

  it('sin nombre usable, un signo de pregunta', () => {
    expect(initialOf('')).toBe('?');
    expect(initialOf(undefined)).toBe('?');
    expect(initialOf('   ')).toBe('?');
  });
});


describe('centeredViewBox', () => {
  it.each(Object.keys(INITIAL_GLYPHS))('la "%s" queda con su tinta en el centro exacto', (ch) => {
    const { box } = INITIAL_GLYPHS[ch];
    const v = centeredViewBox(box);
    // Centro de la tinta = centro de la vista.
    expect((box.x1 + box.x2) / 2).toBeCloseTo(v.x + v.size / 2, 6);
    expect((box.y1 + box.y2) / 2).toBeCloseTo(v.y + v.size / 2, 6);
    // Y entra entera, con aire alrededor.
    expect(box.x1).toBeGreaterThanOrEqual(v.x);
    expect(box.x2).toBeLessThanOrEqual(v.x + v.size);
    expect(box.y1).toBeGreaterThanOrEqual(v.y);
    expect(box.y2).toBeLessThanOrEqual(v.y + v.size);
  });

  it('hay trazado para todas las mayusculas del español', () => {
    for (const ch of 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZÁÉÍÓÚ') expect(INITIAL_GLYPHS[ch]).toBeDefined();
  });
});
