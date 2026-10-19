import type { BodySilhouette, BodyZone } from './bodyZone';
import { GENERATED_ZONE_ANCHORS } from './bodyZoneAnchors.generated';

/**
 * Donde cae cada zona del cuerpo sobre la malla de cada maniqui.
 *
 * No son coordenadas de un punto: son RAYOS horizontales. Se lanzan
 * contra la malla y se usa el punto donde la tocan, con su normal. Hace
 * falta el rayo porque lo que se quiere es la SUPERFICIE de la piel con
 * su inclinacion, y eso no se puede escribir a mano: depende de la
 * malla. El rayo apunta al eje del miembro, medido cortando el modelo.
 *
 * La tabla esta por silueta, y eso es justo lo que arreglo el bug de
 * que los botones senalaran otra parte del cuerpo. Antes habia un solo
 * juego de rayos para los dos maniquies, con las alturas puestas a ojo,
 * y las dos poses no se parecen: el masculino abre los brazos en
 * diagonal hasta |x| = 0.51 y el femenino los lleva casi pegados,
 * hasta 0.30. El rayo de "Brazo" pasaba por delante del biceps del
 * masculino y el primer impacto era el TORSO, asi que seleccionar
 * "Brazo" acercaba la camara al pecho; el de "Pantorrilla" entraba en
 * diagonal y no tocaba ninguna de las dos piernas.
 *
 * El espacio es el de los modelos ya normalizados (ver
 * assets/models/README.md): 1,80 m de alto, pies en y = 0, centrado en
 * x/z y mirando a +Z. Los miembros que se usan son los del lado +x.
 *
 * La tabla la genera `node tools/build-body-anchors.mjs`, que mide cada
 * .glb y comprueba cada rayo contra la malla antes de escribirlo. Hay
 * que regenerarla al cambiar un modelo.
 */
export interface ZoneAnchor {
  /** Origen del rayo, fuera del cuerpo. */
  from: [number, number, number];
  /** Punto del eje del miembro al que apunta. */
  to: [number, number, number];
  /** Distancia de la camara al encuadrar la zona, en metros. */
  distance: number;
}

export const ZONE_ANCHORS: Record<BodySilhouette, Record<BodyZone, ZoneAnchor>> = GENERATED_ZONE_ANCHORS;

/** Los rayos del maniqui que se este mirando. */
export function anchorsFor(silhouette: BodySilhouette): Record<BodyZone, ZoneAnchor> {
  return ZONE_ANCHORS[silhouette];
}
