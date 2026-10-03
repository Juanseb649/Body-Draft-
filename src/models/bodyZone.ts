/** Zonas del cuerpo disponibles para colocar un tatuaje. */
export const BODY_ZONES = [
  'forearm',
  'arm',
  'shoulder',
  'chest',
  'back',
  'ribs',
  'thigh',
  'calf',
  'ankle',
  'wrist',
  'hand',
  'neck',
] as const;

export type BodyZone = (typeof BODY_ZONES)[number];

/**
 * Nombre legible en la UI. El propio valor de BodyZone ya sirve como
 * `meshRegionId` (region equivalente en el maniquin 3D, ver
 * bodyModelService.ts) y es independiente de la silueta, de modo que
 * la misma zona aplica sin importar el sexo del maniquin.
 */
export const BODY_ZONE_LABELS: Record<BodyZone, string> = {
  forearm: 'Antebrazo',
  arm: 'Brazo',
  shoulder: 'Hombro',
  chest: 'Pecho',
  back: 'Espalda',
  ribs: 'Costillas',
  thigh: 'Muslo',
  calf: 'Pantorrilla',
  ankle: 'Tobillo',
  wrist: 'Muneca',
  hand: 'Mano',
  neck: 'Cuello',
};

/**
 * Silueta del maniquin 3D sobre la que se visualiza el diseno.
 *
 * Las dos cubren todas las zonas de BodyZone: la silueta solo cambia
 * las proporciones del cuerpo sobre el que se previsualiza el tatuaje,
 * no que se puede tatuar ni donde.
 *
 * Hubo una tercera, `neutral`, pensada como punto medio por defecto.
 * Se quito: en la practica nadie la elegia —quien entra a probarse un
 * tatuaje quiere verlo sobre un cuerpo parecido al suyo— y obligaba a
 * mantener un tercer .glb.
 */
export const BODY_SILHOUETTES = ['masculine', 'feminine'] as const;
export type BodySilhouette = (typeof BODY_SILHOUETTES)[number];

/** Etiqueta legible, tolerando que todavia no se haya elegido zona. */
export function bodyZoneLabel(zone?: BodyZone): string {
  return zone ? BODY_ZONE_LABELS[zone] : 'la zona elegida';
}
