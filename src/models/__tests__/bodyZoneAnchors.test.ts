import {
  distanceBetween,
  firstHit,
  islandsAt,
  islandUnder,
  readMannequin,
  type Island,
  type Mesh,
} from '../__fixtures__/mannequinMesh';
import { BODY_SILHOUETTES, BODY_ZONES, type BodySilhouette, type BodyZone } from '../bodyZone';
import { anchorsFor, ZONE_ANCHORS } from '../bodyZoneAnchors';

/**
 * Los anclajes son rayos que se lanzan contra la malla dentro del
 * WebView. Si uno apunta mal no hay ningun error: la camara vuela a
 * otra parte del cuerpo y el tatuaje se estampa alli.
 *
 * Eso fue un bug de verdad. Habia un solo juego de rayos para los dos
 * maniquies, con las alturas puestas a ojo, y las poses no se parecen.
 * En el masculino el rayo de "Brazo" pasaba por delante del biceps y
 * el primer impacto era el TORSO; el de "Pantorrilla" entraba en
 * diagonal y no tocaba ninguna pierna. Para que no vuelva a pasar, el
 * test no mira la forma de la tabla: lanza cada rayo contra el .glb de
 * verdad y comprueba donde cae.
 */

const MESHES: Record<BodySilhouette, Mesh> = {
  masculine: readMannequin('mannequin-masculine'),
  feminine: readMannequin('mannequin-feminine'),
};

/**
 * Zonas sobre un miembro: ahi el rayo apunta al EJE del brazo o de la
 * pierna, asi que el impacto tiene que quedar a menos de su radio.
 *
 * El hombro no esta en la lista aunque lo sea a medias: a su altura el
 * brazo todavia forma una sola pieza con el tronco, el rayo apunta al
 * centro del torso y el impacto cae en el deltoides, a un cuarto de
 * metro. Por eso se mide con la tolerancia del tronco.
 */
const LIMB_ZONES: BodyZone[] = ['arm', 'forearm', 'wrist', 'hand', 'thigh', 'calf', 'ankle'];
const ARM_ZONES: BodyZone[] = ['arm', 'forearm', 'wrist', 'hand'];
/** Todo lo que se coloca sobre un miembro, incluido el hombro. */
const OFF_AXIS_ZONES: BodyZone[] = [...LIMB_ZONES, 'shoulder'];

/** Cortar la malla cuesta, y varias zonas caen a la misma altura. */
const sliceCache = new Map<string, Island[]>();
function slice(silhouette: BodySilhouette, mesh: Mesh, height: number): Island[] {
  const key = `${silhouette}:${height.toFixed(4)}`;
  const cached = sliceCache.get(key);
  if (cached) return cached;
  const islands = islandsAt(mesh, height);
  sliceCache.set(key, islands);
  return islands;
}

describe('ZONE_ANCHORS', () => {
  it('tiene una tabla propia por maniqui, no una compartida', () => {
    for (const silhouette of BODY_SILHOUETTES) {
      expect(ZONE_ANCHORS[silhouette]).toBeDefined();
    }
    // Las dos poses son distintas, asi que las dos tablas tienen que
    // serlo. Compartirlas es exactamente lo que estaba roto.
    expect(ZONE_ANCHORS.masculine).not.toEqual(ZONE_ANCHORS.feminine);
  });

  describe.each(BODY_SILHOUETTES)('%s', (silhouette) => {
    const anchors = anchorsFor(silhouette);
    const mesh = MESHES[silhouette];

    it('cubre todas las zonas del cuerpo', () => {
      for (const zone of BODY_ZONES) {
        expect(anchors[zone]).toBeDefined();
      }
    });

    describe.each(BODY_ZONES)('%s', (zone) => {
      const { from, to, distance } = anchors[zone];

      it('sale de fuera del cuerpo y va casi horizontal', () => {
        // Fuera: los maniquies no pasan de 0.51 en x ni de 0.17 en z.
        expect(Math.hypot(from[0], from[2])).toBeGreaterThan(0.55);
        expect(Math.hypot(from[0], from[2])).toBeGreaterThan(Math.hypot(to[0], to[2]));
        // Horizontal: si el rayo subiera o bajara cruzaria el cuerpo a
        // una altura distinta de la que dice su nombre.
        expect(from[1]).toBeCloseTo(to[1], 5);
      });

      it('apunta a una altura que existe en el maniqui', () => {
        expect(to[1]).toBeGreaterThan(0);
        expect(to[1]).toBeLessThan(1.8);
      });

      it('encuadra la camara a una distancia razonable', () => {
        expect(distance).toBeGreaterThanOrEqual(0.25);
        expect(distance).toBeLessThanOrEqual(0.7);
      });

      it('toca la piel donde dice', () => {
        const hit = firstHit(mesh, from, to);
        expect(hit).not.toBeNull();

        // El impacto tiene que caer sobre el eje al que apunta el rayo,
        // dentro del grosor del propio miembro. Si en vez del biceps
        // hubiera dado en el torso, el masculino se iria 16 cm.
        const tolerance = LIMB_ZONES.includes(zone) ? 0.12 : 0.3;
        expect(distanceBetween(hit!, to)).toBeLessThan(tolerance);
        // A la altura exacta del rayo, sin desviarse arriba ni abajo.
        expect(hit![1]).toBeCloseTo(to[1], 4);
      });

      it('cae en la pieza del cuerpo que le toca', () => {
        // La comprobacion que de verdad dice "este boton senala el
        // brazo". No se fia del anclaje: corta la malla a la altura del
        // impacto y mira sobre QUE pieza ha caido. El brazo y la pierna
        // son piezas sueltas; el tronco es la que cruza el eje.
        //
        // Con los rayos de antes, en el maniqui masculino "Brazo",
        // "Antebrazo", "Muneca" y "Mano" caian los cuatro en el tronco,
        // a 15 cm del eje, porque el rayo pasaba por delante del brazo
        // y seguia hasta el pecho.
        const hit = firstHit(mesh, from, to);
        expect(hit).not.toBeNull();

        const island = islandUnder(slice(silhouette, mesh, hit![1]), hit!);
        expect(island).not.toBeNull();
        expect(island!.isTrunk).toBe(!LIMB_ZONES.includes(zone));
      });
    });

    it('el brazo cae por fuera del torso', () => {
      // La comprobacion que caza el bug original. El rayo de las
      // costillas da en el costado del tronco, asi que da la mitad del
      // ancho del torso; cualquier zona del brazo tiene que quedar
      // claramente por fuera de eso.
      const ribs = firstHit(mesh, anchors.ribs.from, anchors.ribs.to);
      expect(ribs).not.toBeNull();

      for (const zone of ARM_ZONES) {
        const hit = firstHit(mesh, anchors[zone].from, anchors[zone].to);
        expect(hit).not.toBeNull();
        expect(Math.abs(hit![0])).toBeGreaterThan(Math.abs(ribs![0]) + 0.05);
      }
    });

    it('recorre el brazo de la mano al hombro y la pierna de abajo arriba', () => {
      const heightOf = (zone: BodyZone) => anchors[zone].to[1];

      expect(heightOf('hand')).toBeLessThan(heightOf('wrist'));
      expect(heightOf('wrist')).toBeLessThan(heightOf('forearm'));
      expect(heightOf('forearm')).toBeLessThan(heightOf('arm'));
      expect(heightOf('arm')).toBeLessThan(heightOf('shoulder'));

      expect(heightOf('ankle')).toBeLessThan(heightOf('calf'));
      expect(heightOf('calf')).toBeLessThan(heightOf('thigh'));
      // Las piernas, por debajo de la entrepierna; el tronco, por encima.
      expect(heightOf('thigh')).toBeLessThan(heightOf('ribs'));
    });

    it('usa el mismo lado del cuerpo para todos los miembros', () => {
      // Mezclar lados haria que al cambiar de "Muslo" a "Pantorrilla"
      // la camara saltara de una pierna a la otra.
      for (const zone of OFF_AXIS_ZONES) {
        expect(anchors[zone].to[0]).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
