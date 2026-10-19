import {
  clampView,
  scanFrameFor,
  screenToContent,
  shouldAddPoint,
  strokeToPath,
  viewToFit,
  MAX_ZOOM,
} from '../zoneScan';

const phone = { width: 390, height: 600 };

describe('scanFrameFor', () => {
  it('un antebrazo da un recuadro alto y angosto; un pecho, uno ancho', () => {
    const forearm = scanFrameFor(phone, 'forearm');
    const chest = scanFrameFor(phone, 'chest');
    expect(forearm.height).toBeGreaterThan(forearm.width);
    expect(chest.width).toBeGreaterThan(chest.height);
  });

  it('una muneca se encuadra mas chica que una espalda', () => {
    expect(scanFrameFor(phone, 'wrist').width * scanFrameFor(phone, 'wrist').height).toBeLessThan(
      scanFrameFor(phone, 'back').width * scanFrameFor(phone, 'back').height,
    );
  });

  it.each([undefined, 'forearm', 'chest', 'back', 'wrist'] as const)(
    'el recuadro de %s cabe en el escenario y queda centrado en horizontal',
    (zone) => {
      for (const stage of [phone, { width: 1024, height: 700 }, { width: 320, height: 380 }]) {
        const f = scanFrameFor(stage, zone);
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.x + f.width).toBeLessThanOrEqual(stage.width);
        expect(f.y + f.height).toBeLessThanOrEqual(stage.height);
        expect(f.x).toBeCloseTo(stage.width - (f.x + f.width));
      }
    },
  );
});

describe('clampView', () => {
  it('sin zoom la foto no se puede desplazar', () => {
    expect(clampView({ scale: 1, x: 80, y: -40 }, phone)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('con zoom se recorre solo hasta el borde de la foto', () => {
    const v = clampView({ scale: 2, x: 9999, y: -9999 }, phone);
    expect(v).toEqual({ scale: 2, x: phone.width / 2, y: -phone.height / 2 });
  });

  it('el zoom tiene tope por arriba y por abajo', () => {
    expect(clampView({ scale: 40, x: 0, y: 0 }, phone).scale).toBe(MAX_ZOOM);
    expect(clampView({ scale: 0.2, x: 0, y: 0 }, phone).scale).toBe(1);
  });
});

describe('viewToFit + screenToContent', () => {
  it('al enfocar la zona, el centro del recuadro queda en el centro de la pantalla', () => {
    const frame = scanFrameFor(phone, 'forearm');
    const view = viewToFit(frame, phone);
    expect(view.scale).toBeGreaterThan(1);

    const center = { x: phone.width / 2, y: phone.height / 2 };
    const underCenter = screenToContent(center, view, phone);
    expect(underCenter.x).toBeCloseTo(frame.x + frame.width / 2, 0);
    expect(underCenter.y).toBeCloseTo(frame.y + frame.height / 2, 0);
  });

  it('el recuadro enfocado llena la pantalla sin pasarse', () => {
    const frame = scanFrameFor(phone, 'chest');
    const { scale } = viewToFit(frame, phone);
    expect(frame.width * scale).toBeLessThanOrEqual(phone.width + 0.001);
    expect(frame.height * scale).toBeLessThanOrEqual(phone.height + 0.001);
  });

  it('sin zoom, pantalla y foto coinciden', () => {
    expect(screenToContent({ x: 12, y: 340 }, { scale: 1, x: 0, y: 0 }, phone)).toEqual({ x: 12, y: 340 });
  });

  it('con zoom 2 centrado, un toque a 50 px del centro cae a 25 px en la foto', () => {
    const p = screenToContent({ x: phone.width / 2 + 50, y: phone.height / 2 }, { scale: 2, x: 0, y: 0 }, phone);
    expect(p.x).toBeCloseTo(phone.width / 2 + 25);
  });
});

describe('strokeToPath', () => {
  it('vacio no dibuja nada', () => {
    expect(strokeToPath([])).toBe('');
  });

  it('un toque deja un punto visible', () => {
    expect(strokeToPath([{ x: 1, y: 2 }])).toBe('M1 2 L1 2');
  });

  it('suaviza con curvas entre los puntos medios', () => {
    const d = strokeToPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(d).toBe('M0 0 Q10 0 10 5 L10 10');
  });
});

describe('shouldAddPoint', () => {
  it('descarta los puntos que casi no se movieron', () => {
    expect(shouldAddPoint(undefined, { x: 0, y: 0 }, 3)).toBe(true);
    expect(shouldAddPoint({ x: 0, y: 0 }, { x: 1, y: 1 }, 3)).toBe(false);
    expect(shouldAddPoint({ x: 0, y: 0 }, { x: 3, y: 0 }, 3)).toBe(true);
  });
});
