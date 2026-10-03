import type { BodySilhouette, BodyZone } from './bodyZone';
import type { Placement } from './placement';

/** Estado de una propuesta dentro del flujo de edicion/guardado. */
export type ProposalStatus = 'draft' | 'saved' | 'appointmentRequested';

/**
 * Una propuesta guardada por el usuario: un TattooDesign ya ubicado
 * sobre una BodyZone, lista para verse de dos formas:
 *
 * - `cameraSnapshotUrl`: foto tomada con la camara mostrando el diseno
 *   superpuesto sobre el cuerpo real del usuario en ese momento.
 * - `renderedImageUrl`: esa misma foto pero recompuesta por IA, con el
 *   tatuaje siguiendo la curvatura y la luz de la piel en vez de
 *   pegado plano encima.
 * - Maniquin 3D: se reconstruye en tiempo real combinando `designId`,
 *   `bodyZone`, `silhouette` y `placement` sobre la malla generica
 *   (ver bodyModelService.ts), por lo que no se guarda un modelo 3D
 *   distinto por propuesta sino los datos para re-renderizarlo.
 */
export interface TattooProposal {
  id: string;
  userId: string;
  designId: string;
  bodyZone: BodyZone;
  silhouette: BodySilhouette;
  placement: Placement;
  cameraSnapshotUrl?: string;
  /**
   * Resultado de la composicion con IA sobre `cameraSnapshotUrl`.
   *
   * Se guarda aparte y nunca pisa la foto original: si el resultado no
   * convence, se puede volver a la captura sin tener que repetirla (ni
   * gastar otra llamada a la API).
   */
  renderedImageUrl?: string;
  status: ProposalStatus;
  createdAt: string;
}
