import { gridItemWidth, layoutFor } from '../layout';

describe('layoutFor', () => {
  it.each([
    [375, 'phone', 2, false],
    [699, 'phone', 2, false],
    [768, 'tablet', 3, true],
    [1024, 'desktop', 4, true],
    [1920, 'desktop', 4, true],
  ])('%ipx → %s, %i columnas', (width, breakpoint, columns, split) => {
    const layout = layoutFor(width);
    expect(layout.breakpoint).toBe(breakpoint);
    expect(layout.gridColumns).toBe(columns);
    expect(layout.splitDetail).toBe(split);
  });

  it('en web el contenido no se estira mas alla del ancho maximo', () => {
    expect(layoutFor(2560).contentMaxWidth).toBe(1200);
  });
});

describe('gridItemWidth', () => {
  it('las celdas y los huecos suman, como mucho, el ancho del contenedor', () => {
    for (const [width, columns] of [[335, 2], [904, 3], [1136, 4]]) {
      const cell = gridItemWidth(width, columns, 14);
      expect(cell * columns + 14 * (columns - 1)).toBeLessThanOrEqual(width);
      expect(cell * columns + 14 * (columns - 1)).toBeGreaterThan(width - columns);
    }
  });
});
