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
  neck: { x: 50, y: 29 },
  shoulder: { x: 66, y: 39 },
  chest: { x: 43, y: 52 },
  ribs: { x: 60, y: 72 },
  back: { x: 37, y: 84 },
  arm: { x: 70, y: 56 },
  forearm: { x: 74, y: 84 },
  wrist: { x: 75.5, y: 98 },
  hand: { x: 76.5, y: 107 },
  thigh: { x: 58, y: 120 },
  calf: { x: 58, y: 166 },
  ankle: { x: 58, y: 188 },
};
