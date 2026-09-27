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
  status: ProposalStatus;
  createdAt: string;
}
