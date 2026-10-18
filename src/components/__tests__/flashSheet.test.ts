import { FLASH_MOTIFS, flashWallLayout } from '../organisms/flashSheet';

describe('FLASH_MOTIFS', () => {
  it('mezcla estilos como una pared de estudio de verdad', () => {
    const styles = new Set(FLASH_MOTIFS.map((m) => m.style));
    for (const s of ['tradicional', 'tribal', 'realismo', 'dotwork', 'geometrico', 'japones', 'blackwork', 'linea fina']) {
      expect(styles).toContain(s);
    }
  });

  it('ningun trazo generado trae NaN ni esta vacio', () => {
    for (const motif of FLASH_MOTIFS) {
      for (const stroke of motif.strokes) {
        expect(stroke.d.length).toBeGreaterThan(0);
        expect(stroke.d).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('los motivos de realismo y dotwork tienen detalle de verdad (tramas, fibras, punteado)', () => {
    const detail = (name: string) =>
      FLASH_MOTIFS.find((m) => m.name === name)!.strokes.reduce((n, s) => n + (s.d.match(/M/g)?.length ?? 0), 0);
    expect(detail('ojo')).toBeGreaterThan(80);
    expect(detail('pluma')).toBeGreaterThan(40);
    expect(detail('mandala')).toBeGreaterThan(60);
  });
});

describe('flashWallLayout', () => {
  const phone = flashWallLayout(390, 844);

  it('cubre todo el ancho y el alto, con alto de sobra para deslizarse', () => {
    expect(Math.min(...phone.map((t) => t.x))).toBeLessThanOrEqual(0);
    expect(Math.max(...phone.map((t) => t.x + t.size))).toBeGreaterThanOrEqual(390);
    expect(Math.max(...phone.map((t) => t.y + t.size))).toBeGreaterThan(844);
  });

  it('sale igual cada vez (no cambia de un render a otro)', () => {
    expect(flashWallLayout(390, 844)).toEqual(phone);
  });

  it('numera el orden de tatuado sin repetir', () => {
    const orders = phone.map((t) => t.order).sort((a, b) => a - b);
    expect(orders).toEqual(orders.map((_, i) => i));
  });

  it('deja libre la zona del logo, tambien mientras la pared sube', () => {
    const clear = { x: 60, y: 60, width: 270, height: 200 };
    const drift = 125;
    const tiles = flashWallLayout(390, 844, { clear, drift });
    expect(tiles.length).toBeLessThan(phone.length);
    for (const t of tiles) {
      const cx = t.x + t.size / 2;
      const cy = t.y + t.size / 2;
      const insideNow = cx > clear.x && cx < clear.x + clear.width && cy > clear.y && cy < clear.y + clear.height;
      const insideAfterDrift =
        cx > clear.x && cx < clear.x + clear.width && cy - drift > clear.y && cy - drift < clear.y + clear.height;
      expect(insideNow || insideAfterDrift).toBe(false);
    }
  });

  it('en una tableta pone mas motivos, no motivos gigantes', () => {
    const tablet = flashWallLayout(1024, 1366);
    expect(tablet.length).toBeGreaterThan(phone.length);
    expect(Math.max(...tablet.map((t) => t.size))).toBeLessThanOrEqual(180);
  });

  it('sin medir la pantalla no dibuja nada', () => {
    expect(flashWallLayout(0, 0)).toEqual([]);
  });
});
