import type { BodyZone } from './bodyZone';

/**
 * Como se aplica un boceto sobre la piel de una foto: la tinta, la
 * curvatura del miembro, su ancho y su inclinacion. Lo dibuja
 * components/organisms/skinWrapScene.ts; aqui viven los valores y la
 * matematica, para poder probarlos.
 */

export type InkMode = 'tinta' | 'color' | 'original';

export interface SkinWrapSettings {
  /** 0 = plano, 1 = envuelto del todo sobre un cilindro. */
  curvature: number;
  /** Diametro del miembro respecto al ancho del recuadro (1 = igual). */
  widthScale: number;
  /** Inclinacion del eje del miembro, en grados (0 = vertical). */
  axisDegrees: number;
  ink: InkMode;
}

export const CURVATURE_RANGE = { min: 0, max: 1 } as const;
export const WIDTH_SCALE_RANGE = { min: 0.5, max: 1.8 } as const;
export const AXIS_RANGE = { min: -90, max: 90 } as const;

/**
 * Curvatura de partida segun la zona: un antebrazo o una muneca son
 * casi cilindros; una espalda o un pecho, casi planos.
 */
const CURVATURE_BY_ZONE: Record<BodyZone, number> = {
  forearm: 0.9,
  wrist: 0.95,
  arm: 0.85,
  calf: 0.85,
  ankle: 0.9,
  thigh: 0.75,
  neck: 0.8,
  shoulder: 0.6,
  ribs: 0.45,
  hand: 0.35,
  chest: 0.3,
  back: 0.2,
};

export function defaultSkinWrap(zone?: BodyZone): SkinWrapSettings {
  return {
    curvature: zone ? CURVATURE_BY_ZONE[zone] : 0.6,
    widthScale: 1,
    // Eje vertical de partida: el recuadro guia ya pide encuadrar los
    // miembros de pie, y en pecho/espalda la curva va de lado a lado
    // del torso, que tambien es alrededor de un eje vertical. Si el
    // brazo salio inclinado en la foto, se corrige con "Inclinación".
    axisDegrees: 0,
    ink: 'tinta',
  };
}

export interface WrappedColumn {
  /** Donde cae el centro de la columna, relativo al eje del miembro. */
  x: number;
  /** Ancho de la columna en destino (1 = sin estrechar). */
  width: number;
  /** Cuanta tinta se ve: menos donde la piel deja de mirar a la camara. */
  alpha: number;
}

/**
 * Una columna del boceto plano, a `distance` del eje, llevada sobre un
 * cilindro de radio `radius` visto de frente. El boceto se "pega" a la
 * piel sin estirarse (la distancia es longitud de arco), asi que cae en
 * `R·sen(d/R)` y se estrecha con `cos(d/R)`. `curvature` mezcla entre
 * plano y cilindro.
 *
 * Devuelve null para lo que queda detras del miembro. La escena del
 * WebView repite esta misma formula (no puede importar este modulo):
 * si cambia aqui, hay que cambiarla alli.
 */
export function wrapColumn(distance: number, radius: number, curvature: number): WrappedColumn | null {
  const theta = distance / radius;
  if (curvature > 0 && Math.abs(theta) > (Math.PI / 2) * 0.985) return null;
  const cos = Math.cos(theta);
  return {
    x: distance + curvature * (radius * Math.sin(theta) - distance),
    width: 1 - curvature + curvature * cos,
    alpha: Math.max(0, 1 - curvature + curvature * (0.3 + 0.7 * cos)),
  };
}

export function clampSetting(value: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, value));
}
