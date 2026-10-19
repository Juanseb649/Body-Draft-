import { stagePointToImage, suggestZoneFromPose, type Landmark } from '../poseZone';

const IMAGE = { width: 1000, height: 1500 };

/**
 * Una persona de frente, de pie, ocupando la imagen: puntos de MediaPipe
 * (0..1). Brazos abiertos hacia abajo a los lados.
 */
function standingPerson(overrides: Record<number, Partial<Landmark>> = {}): Landmark[] {
  const pts: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
  const set = (i: number, x: number, y: number) => (pts[i] = { x, y, visibility: 0.95 });
  set(0, 0.5, 0.1); // nariz
  set(7, 0.46, 0.1);
  set(8, 0.54, 0.1);
  set(11, 0.4, 0.2); // hombro izq
  set(12, 0.6, 0.2);
  set(13, 0.34, 0.33); // codo
  set(14, 0.66, 0.33);
  set(15, 0.31, 0.46); // muñeca
  set(16, 0.69, 0.46);
  set(19, 0.3, 0.5); // indice
  set(20, 0.7, 0.5);
  set(23, 0.44, 0.52); // cadera
  set(24, 0.56, 0.52);
  set(25, 0.44, 0.7); // rodilla
  set(26, 0.56, 0.7);
  set(27, 0.44, 0.88); // tobillo
  set(28, 0.56, 0.88);
  set(31, 0.43, 0.92);
  set(32, 0.57, 0.92);
  for (const [i, o] of Object.entries(overrides)) pts[Number(i)] = { ...pts[Number(i)], ...o };
  return pts;
}

const at = (x: number, y: number) => ({ x: x * IMAGE.width, y: y * IMAGE.height });

describe('suggestZoneFromPose', () => {
  it.each([
    ['forearm', 0.325, 0.39],
    ['arm', 0.37, 0.27],
    ['thigh', 0.44, 0.61],
    ['calf', 0.56, 0.78],
    ['chest', 0.5, 0.28],
    ['neck', 0.5, 0.16],
  ] as const)('un recuadro sobre el cuerpo en %s sugiere esa zona', (zone, x, y) => {
    expect(suggestZoneFromPose(standingPerson(), IMAGE, at(x, y))?.zone).toBe(zone);
  });

  it('de espaldas (sin cara a la vista) el torso es la espalda', () => {
    const away = standingPerson({ 0: { visibility: 0.05 }, 7: { visibility: 0.05 }, 8: { visibility: 0.05 } });
    expect(suggestZoneFromPose(away, IMAGE, at(0.5, 0.3))?.zone).toBe('back');
  });

  it('un primer plano (pocos puntos visibles) no sugiere nada', () => {
    const closeUp: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
    closeUp[13] = { x: 0.2, y: 0.4, visibility: 0.9 };
    closeUp[15] = { x: 0.8, y: 0.5, visibility: 0.9 };
    expect(suggestZoneFromPose(closeUp, IMAGE, at(0.5, 0.45))).toBeNull();
  });

  it('si el recuadro cae fuera del cuerpo, no inventa una zona', () => {
    expect(suggestZoneFromPose(standingPerson(), IMAGE, at(0.95, 0.05))).toBeNull();
  });

  it('sin pose detectada, nada', () => {
    expect(suggestZoneFromPose(null, IMAGE, at(0.5, 0.5))).toBeNull();
    expect(suggestZoneFromPose([], IMAGE, at(0.5, 0.5))).toBeNull();
  });

  it('marca confianza alta solo cuando cae de lleno y lejos de otras zonas', () => {
    const s = suggestZoneFromPose(standingPerson(), IMAGE, at(0.44, 0.61));
    expect(s?.confidence).toBe('alta');
  });
});

describe('stagePointToImage', () => {
  it('con "cover" el centro del escenario es el centro de la imagen', () => {
    const p = stagePointToImage({ x: 195, y: 300 }, { width: 390, height: 600 }, { width: 3000, height: 4000 });
    expect(p.x).toBeCloseTo(1500);
    expect(p.y).toBeCloseTo(2000);
  });

  it('descuenta lo que el cover recorta a los lados', () => {
    // Imagen apaisada en escenario vertical: se recortan los costados.
    const p = stagePointToImage({ x: 0, y: 300 }, { width: 390, height: 600 }, { width: 4000, height: 3000 });
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeCloseTo(1500);
  });
});
