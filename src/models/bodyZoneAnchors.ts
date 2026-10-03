import type { BodyZone } from './bodyZone';

/**
 * Donde cae cada zona del cuerpo sobre la malla del maniquin.
 *
 * No son coordenadas fijas: son RAYOS. Se lanzan contra la malla y se
 * usa el punto donde la tocan, con su normal. Tiene que ser asi porque
 * los dos maniquies estan en poses distintas —el masculino en pose de
 * A, con los brazos separados hasta |x| = 0.51, y el femenino con los
 * brazos caidos, hasta 0.30— y unas coordenadas que valieran para uno
 * caerian al aire en el otro. Un rayo horizontal a la altura del
 * antebrazo, en cambio, da con el brazo en los dos.
 *
 * El espacio es el de los modelos ya normalizados (ver
 * assets/models/README.md): 1,80 m de alto, pies en y = 0, centrado en
 * x/z y mirando a +Z. Las alturas salen de medir las secciones reales
 * de las dos mallas.
 *
 * `maxAbsX` esta para el torso: desde el costado, el primer impacto a
 * la altura de las costillas es el BRAZO, no el tronco. Con el limite
 * se descarta y se usa el siguiente.
 */
export interface ZoneAnchor {
  /** Origen del rayo, fuera del cuerpo. */
  from: [number, number, number];
  /** Hacia donde apunta, cerca del eje del cuerpo. */
  to: [number, number, number];
  /** Descarta impactos mas separados del eje que esto (torso). */
  maxAbsX?: number;
  /** Distancia de la camara al encuadrar la zona, en metros. */
  distance: number;
}

export const ZONE_ANCHORS: Record<BodyZone, ZoneAnchor> = {
  // Brazo: el rayo entra de lado. Las alturas estan elegidas para que
  // den con el brazo tanto en pose de A como con los brazos caidos.
  shoulder: { from: [1.2, 1.44, 0.25], to: [0.08, 1.42, 0], distance: 0.42 },
  arm: { from: [1.2, 1.25, 0.2], to: [0.08, 1.24, 0], distance: 0.4 },
  forearm: { from: [1.2, 1.05, 0.2], to: [0.08, 1.04, 0], distance: 0.36 },
  wrist: { from: [1.2, 0.92, 0.15], to: [0.08, 0.91, 0], distance: 0.3 },
  hand: { from: [1.2, 0.84, 0.15], to: [0.08, 0.84, 0], distance: 0.28 },

  // Tronco: de frente y de espaldas no hay brazo que estorbe.
  neck: { from: [0, 1.53, 1.0], to: [0, 1.52, 0], distance: 0.3 },
  chest: { from: [0.07, 1.3, 1.0], to: [0.06, 1.29, 0], distance: 0.48 },
  back: { from: [0.05, 1.3, -1.0], to: [0.04, 1.29, 0], distance: 0.5 },
  // Las costillas si se atacan de lado, de ahi el limite.
  ribs: { from: [1.2, 1.15, 0.3], to: [0.0, 1.13, 0.05], maxAbsX: 0.23, distance: 0.4 },

  // Piernas: por debajo de y = 0.72 no hay brazos en ninguno de los dos.
  thigh: { from: [0.9, 0.66, 0.7], to: [0.07, 0.65, 0], distance: 0.44 },
  calf: { from: [0.9, 0.33, 0.6], to: [0.07, 0.32, 0], distance: 0.36 },
  ankle: { from: [0.9, 0.13, 0.5], to: [0.07, 0.12, 0], distance: 0.28 },
};
