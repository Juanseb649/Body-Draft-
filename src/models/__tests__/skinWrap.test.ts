import { clampSetting, defaultSkinWrap, wrapColumn, WIDTH_SCALE_RANGE } from '../skinWrap';

describe('wrapColumn', () => {
  const R = 100;

  it('con curvatura 0 el boceto queda plano: nada se mueve ni se apaga', () => {
    for (const d of [-150, -40, 0, 75]) {
      expect(wrapColumn(d, R, 0)).toEqual({ x: d, width: 1, alpha: 1 });
    }
  });

  it('en el eje del miembro no cambia nada, aunque este curvado', () => {
    expect(wrapColumn(0, R, 1)).toEqual({ x: 0, width: 1, alpha: 1 });
  });

  it('envuelto, una columna cae donde la pone el cilindro (R·sen(d/R)) y se estrecha', () => {
    const c = wrapColumn(50, R, 1)!;
    expect(c.x).toBeCloseTo(R * Math.sin(0.5));
    expect(c.width).toBeCloseTo(Math.cos(0.5));
    expect(c.x).toBeLessThan(50);
  });

  it('hacia el borde del miembro la tinta se apaga, pero sin desaparecer de golpe', () => {
    const middle = wrapColumn(10, R, 1)!;
    const edge = wrapColumn(140, R, 1)!;
    expect(edge.alpha).toBeLessThan(middle.alpha);
    expect(edge.alpha).toBeGreaterThan(0.25);
  });

  it('lo que queda detras del miembro no se dibuja', () => {
    expect(wrapColumn(R * 1.6, R, 1)).toBeNull();
    expect(wrapColumn(-R * 1.6, R, 0.5)).toBeNull();
  });

  it('es simetrico a los dos lados del eje', () => {
    const left = wrapColumn(-60, R, 0.8)!;
    const right = wrapColumn(60, R, 0.8)!;
    expect(left.x).toBeCloseTo(-right.x);
    expect(left.width).toBeCloseTo(right.width);
  });

  it('nunca proyecta fuera del ancho del miembro', () => {
    for (let d = -150; d <= 150; d += 5) {
      const c = wrapColumn(d, R, 1);
      if (c) expect(Math.abs(c.x)).toBeLessThanOrEqual(R);
    }
  });
});

describe('defaultSkinWrap', () => {
  it('un antebrazo parte mucho mas curvo que una espalda', () => {
    expect(defaultSkinWrap('forearm').curvature).toBeGreaterThan(defaultSkinWrap('back').curvature + 0.5);
  });

  it('parte con tinta negra, eje vertical y el ancho del recuadro', () => {
    expect(defaultSkinWrap()).toMatchObject({ ink: 'tinta', axisDegrees: 0, widthScale: 1 });
  });
});

describe('clampSetting', () => {
  it('respeta los limites', () => {
    expect(clampSetting(9, WIDTH_SCALE_RANGE)).toBe(WIDTH_SCALE_RANGE.max);
    expect(clampSetting(0, WIDTH_SCALE_RANGE)).toBe(WIDTH_SCALE_RANGE.min);
    expect(clampSetting(1.1, WIDTH_SCALE_RANGE)).toBe(1.1);
  });
});
