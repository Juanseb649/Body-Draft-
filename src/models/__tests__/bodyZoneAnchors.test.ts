import { BODY_ZONES } from '../bodyZone';
import { ZONE_ANCHORS } from '../bodyZoneAnchors';

/**
 * Los anclajes son rayos que se lanzan contra la malla dentro del
 * WebView. Si uno apunta mal, no hay error: el tatuaje simplemente no
 * aparece, o aparece flotando en el aire. Estas comprobaciones cazan
 * los descuidos tipicos sin necesitar el motor 3D.
 */
describe('ZONE_ANCHORS', () => {
  it('cubre todas las zonas del cuerpo', () => {
    for (const zone of BODY_ZONES) {
      expect(ZONE_ANCHORS[zone]).toBeDefined();
    }
  });

  it.each(BODY_ZONES)('%s apunta desde fuera hacia el cuerpo', (zone) => {
    const { from, to } = ZONE_ANCHORS[zone];

    // El origen tiene que estar FUERA del maniquin (que no pasa de
    // ~0.51 en x ni de ~0.17 en z) y el destino cerca de su eje. Al
    // reves el rayo saldria desde dentro y no tocaria la piel.
    const originDistance = Math.hypot(from[0], from[2]);
    const targetDistance = Math.hypot(to[0], to[2]);
    expect(originDistance).toBeGreaterThan(0.55);
    expect(targetDistance).toBeLessThan(0.2);
    expect(originDistance).toBeGreaterThan(targetDistance);
  });

  it.each(BODY_ZONES)('%s apunta a una altura que existe en el maniqui', (zone) => {
    const { from, to } = ZONE_ANCHORS[zone];
    // Los maniquies miden 1,80 m con los pies en y = 0.
    for (const y of [from[1], to[1]]) {
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(1.8);
    }
    // El rayo va casi horizontal: si subiera o bajara mucho, cruzaria
    // el cuerpo por una zona distinta de la que dice su nombre.
    expect(Math.abs(from[1] - to[1])).toBeLessThan(0.05);
  });

  it.each(BODY_ZONES)('%s encuadra la camara a una distancia razonable', (zone) => {
    const { distance } = ZONE_ANCHORS[zone];
    expect(distance).toBeGreaterThan(0.2);
    expect(distance).toBeLessThan(1);
  });

  it('solo limita el ancho en las zonas del tronco', () => {
    // `maxAbsX` existe para descartar el brazo cuando el rayo entra de
    // costado. En un brazo seria justo al reves: lo descartaria a el.
    expect(ZONE_ANCHORS.ribs.maxAbsX).toBeDefined();
    expect(ZONE_ANCHORS.forearm.maxAbsX).toBeUndefined();
    expect(ZONE_ANCHORS.arm.maxAbsX).toBeUndefined();
  });
});
