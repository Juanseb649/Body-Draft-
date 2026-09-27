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
 * BodyDraft es neutral respecto al sexo del usuario: `neutral` es la
 * silueta por defecto y cubre todas las zonas de BodyZone. `masculine`
 * y `feminine` son variaciones opcionales de la misma malla base.
 */
export const BODY_SILHOUETTES = ['neutral', 'masculine', 'feminine'] as const;
export type BodySilhouette = (typeof BODY_SILHOUETTES)[number];
