import { INK_KEY_SOURCE } from '../organisms/inkKeySource';

type KeyInk = (
  p: Uint8ClampedArray,
  w: number,
  h: number,
  opts: { mode: 'color' | 'bn'; removeBg?: boolean },
) => { background: number[]; alreadyCut: boolean };

// Se evalua la MISMA cadena que corre en los WebView.
const keyInk = new Function(`${INK_KEY_SOURCE}; return keyInk;`)() as KeyInk;

/** Imagen de 20×20 de papel `paper` con un cuadro de 8×8 de `ink` al centro. */
function sketch(paper: number[], ink: number[], alpha = 255) {
  const w = 20;
  const h = 20;
  const p = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inside = x >= 6 && x < 14 && y >= 6 && y < 14;
      const c = inside ? ink : paper;
      p[i] = c[0];
      p[i + 1] = c[1];
      p[i + 2] = c[2];
      p[i + 3] = alpha;
    }
  }
  return { p, w, h, at: (x: number, y: number) => Array.from(p.slice((y * w + x) * 4, (y * w + x) * 4 + 4)) };
}

describe('keyInk', () => {
  it('quita el papel blanco y deja la tinta', () => {
    const img = sketch([250, 248, 244], [20, 20, 20]);
    keyInk(img.p, img.w, img.h, { mode: 'color' });
    expect(img.at(1, 1)[3]).toBe(0);
    expect(img.at(10, 10)[3]).toBe(255);
  });

  it('un color claro sobre blanco NO se borra (antes un amarillo quedaba transparente)', () => {
    const img = sketch([255, 255, 255], [250, 210, 40]);
    keyInk(img.p, img.w, img.h, { mode: 'color' });
    const [r, g, b, a] = img.at(10, 10);
    expect(a).toBe(255);
    // Sigue siendo amarillo: mucho rojo y verde, poco azul.
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(170);
    expect(b).toBeLessThan(90);
  });

  it('el papel no tiene que ser blanco: un fondo crema o gris tambien se quita', () => {
    const img = sketch([214, 200, 170], [180, 30, 40]);
    const { background } = keyInk(img.p, img.w, img.h, { mode: 'color' });
    expect(background).toEqual([214, 200, 170]);
    expect(img.at(0, 19)[3]).toBe(0);
    expect(img.at(10, 10)[3]).toBe(255);
  });

  it('en blanco y negro el color pasa a tinta oscura', () => {
    const img = sketch([255, 255, 255], [200, 30, 40]);
    keyInk(img.p, img.w, img.h, { mode: 'bn' });
    const [r, g, b, a] = img.at(10, 10);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(20); // sin tinte de color
    expect(a).toBeGreaterThan(150);
  });

  it('un PNG que ya viene recortado no se toca el fondo', () => {
    const img = sketch([0, 0, 0], [200, 30, 40], 0);
    // El dibujo opaco en el centro, borde transparente.
    for (let y = 6; y < 14; y++) for (let x = 6; x < 14; x++) img.p[(y * 20 + x) * 4 + 3] = 255;
    const { alreadyCut } = keyInk(img.p, img.w, img.h, { mode: 'color' });
    expect(alreadyCut).toBe(true);
    expect(img.at(10, 10)[3]).toBe(255);
  });

  it('con "Con fondo" (removeBg: false) el papel se queda', () => {
    const img = sketch([250, 250, 250], [20, 20, 20]);
    keyInk(img.p, img.w, img.h, { mode: 'color', removeBg: false });
    expect(img.at(1, 1)[3]).toBe(255);
  });
});
