import type { BodyZone } from './bodyZone';

/**
 * Las 12 zonas agrupadas como se piensa el cuerpo: brazos, torso y
 * piernas. Doce chips en una sola fila horizontal obligaban a deslizar
 * para encontrar "Tobillo"; en tres grupos de 3 a 5 se ven todas de un
 * vistazo.
 */
export type BodyZoneGroup = 'brazos' | 'torso' | 'piernas';

export const BODY_ZONE_GROUPS: { key: BodyZoneGroup; label: string; zones: BodyZone[] }[] = [
  { key: 'brazos', label: 'Brazos', zones: ['shoulder', 'arm', 'forearm', 'wrist', 'hand'] },
  { key: 'torso', label: 'Torso', zones: ['neck', 'chest', 'ribs', 'back'] },
  { key: 'piernas', label: 'Piernas', zones: ['thigh', 'calf', 'ankle'] },
];

/** El grupo de una zona (o el de los brazos, la zona mas tatuada, si no hay). */
export function groupOf(zone?: BodyZone): BodyZoneGroup {
  return BODY_ZONE_GROUPS.find((g) => zone && g.zones.includes(zone))?.key ?? 'brazos';
}

/**
 * Donde cae cada zona en la figura del selector (caja de 100×200, de
 * frente; los miembros del lado derecho de la imagen). La espalda no se
 * ve de frente: se marca detras del torso, con su propio punto.
 */
export const ZONE_HOTSPOTS: Record<BodyZone, { x: number; y: number }> = {
  neck: { x: 50, y: 33 },
  shoulder: { x: 67, y: 45 },
  chest: { x: 42, y: 56 },
  ribs: { x: 57, y: 74 },
  back: { x: 34, y: 80 },
  arm: { x: 74, y: 66 },
  forearm: { x: 79, y: 90 },
  wrist: { x: 82, y: 107 },
  hand: { x: 84, y: 120 },
  thigh: { x: 58, y: 132 },
  calf: { x: 59, y: 166 },
  ankle: { x: 59, y: 188 },
};
