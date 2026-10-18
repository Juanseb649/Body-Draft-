/**
 * Donde esta el basurero que aparece al arrastrar un boceto hacia
 * abajo, en las coordenadas del boceto (desplazamiento desde el centro
 * del escenario, como en DesignOverlay). Va en un modulo aparte porque
 * se llama desde worklets de gestos y conviene poder probarlo.
 */

/** Cuanto hay que arrastrar hacia abajo para que aparezca. */
export const TRASH_REVEAL_DRAG = 24;

/** Distancia del centro del basurero al borde inferior del escenario. */
export const TRASH_CENTER_FROM_BOTTOM = 60;

/** Radio de captura: mas generoso que el circulo dibujado, se acierta con el pulgar. */
export const TRASH_RADIUS = 72;

/**
 * Si el centro del boceto (desplazado `x`,`y` desde el centro de un
 * escenario `width`×`height`) esta sobre el basurero.
 */
export function isOverTrash(x: number, y: number, width: number, height: number): boolean {
  'worklet';
  if (width <= 0 || height <= 0) return false;
  const trashY = height / 2 - TRASH_CENTER_FROM_BOTTOM;
  return Math.hypot(x, y - trashY) <= TRASH_RADIUS;
}
