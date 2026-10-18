import { FLASH_MOTIFS, flashWallLayout } from '../organisms/flashSheet';

describe('flashWallLayout', () => {
  const phone = flashWallLayout(390, 844);

  it('cubre todo el ancho y el alto, con alto de sobra para deslizarse', () => {
    const right = Math.max(...phone.map((t) => t.x + t.size));
    const bottom = Math.max(...phone.map((t) => t.y + t.size));
    expect(Math.min(...phone.map((t) => t.x))).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(390);
    expect(bottom).toBeGreaterThan(844);
  });

  it('sale igual cada vez (no cambia de un render a otro)', () => {
    expect(flashWallLayout(390, 844)).toEqual(phone);
  });

  it('usa todo el repertorio y numera el orden de tatuado sin repetir', () => {
    expect(new Set(phone.map((t) => t.motif.name)).size).toBe(FLASH_MOTIFS.length);
    const orders = phone.map((t) => t.order).sort((a, b) => a - b);
    expect(orders).toEqual(orders.map((_, i) => i));
  });

  it('en una tableta pone mas motivos, no motivos gigantes', () => {
    const tablet = flashWallLayout(1024, 1366);
    expect(tablet.length).toBeGreaterThan(phone.length);
    expect(Math.max(...tablet.map((t) => t.size))).toBeLessThanOrEqual(180);
  });

  it('sin medir la pantalla no dibuja nada', () => {
    expect(flashWallLayout(0, 0)).toEqual([]);
  });

  it('ningun numero invalido llega al SVG', () => {
    for (const t of phone) {
      for (const v of [t.x, t.y, t.size, t.rotation]) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
