/**
 * Transformacion de un diseno sobre una superficie (camara o maniquin 3D).
 *
 * Es el dato clave que permite reconstruir la misma vista mas adelante:
 * en lugar de guardar un modelo 3D distinto por propuesta, se guarda la
 * transformacion aplicada sobre la malla generica del maniquin
 * (BodySilhouette) y sobre el frame de camara capturado.
 */
export interface Placement {
  /** Posicion relativa (0-1) dentro de la zona del cuerpo seleccionada. */
  offsetX: number;
  offsetY: number;
  rotationDegrees: number;
  /** Escala relativa al tamano sugerido por defecto para la zona. */
  scale: number;
  opacity: number;
}

export function defaultPlacement(): Placement {
  return { offsetX: 0, offsetY: 0, rotationDegrees: 0, scale: 1, opacity: 1 };
}
