import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import { designRepository } from '../core/services';
import type { BodySilhouette, BodyZone } from '../models/bodyZone';
import { defaultPlacement } from '../models/placement';
import type { TattooProposal } from '../models/tattooProposal';

interface EditorState extends TattooProposal {
  selectDesign: (designId: string) => void;
  setZone: (zone: BodyZone) => void;
  setSilhouette: (silhouette: BodySilhouette) => void;
  move: (dx: number, dy: number) => void;
  rotate: (degrees: number) => void;
  scale: (scale: number) => void;
  setOpacity: (opacity: number) => void;
  attachCameraSnapshot: (uri: string) => void;
  save: () => Promise<void>;
}

function initialProposal(): TattooProposal {
  return {
    id: Crypto.randomUUID(),
    // TODO: sustituir por el id del usuario autenticado.
    userId: 'current-user',
    designId: '',
    bodyZone: 'forearm',
    silhouette: 'neutral',
    placement: defaultPlacement(),
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Controller del editor: la unica fuente de verdad para la propuesta
 * que se esta armando (diseno + zona + silueta + colocacion), tanto
 * en la pantalla de camara como en la de maniquin 3D. Ambas Views
 * leen y escriben sobre el mismo store, por lo que un cambio de zona
 * o escala en una se refleja en la otra.
 */
export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialProposal(),

  selectDesign: (designId) => set({ designId }),
  setZone: (bodyZone) => set({ bodyZone }),
  setSilhouette: (silhouette) => set({ silhouette }),

  move: (dx, dy) =>
    set((s) => ({
      placement: { ...s.placement, offsetX: s.placement.offsetX + dx, offsetY: s.placement.offsetY + dy },
    })),

  rotate: (degrees) => set((s) => ({ placement: { ...s.placement, rotationDegrees: degrees } })),

  scale: (scale) => set((s) => ({ placement: { ...s.placement, scale } })),

  setOpacity: (opacity) => set((s) => ({ placement: { ...s.placement, opacity } })),

  /**
   * Adjunta la foto tomada con la camara (diseno ya superpuesto sobre
   * el cuerpo real). La vista de maniquin 3D no necesita este paso: se
   * re-renderiza a partir de bodyZone/silhouette/placement.
   */
  attachCameraSnapshot: (uri) => set({ cameraSnapshotUrl: uri }),

  save: async () => {
    const saved: TattooProposal = { ...toProposal(get()), status: 'saved' };
    await designRepository.saveProposal(saved);
    set(saved);
  },
}));

function toProposal(state: EditorState): TattooProposal {
  const { id, userId, designId, bodyZone, silhouette, placement, cameraSnapshotUrl, status, createdAt } = state;
  return { id, userId, designId, bodyZone, silhouette, placement, cameraSnapshotUrl, status, createdAt };
}

/** Resetea el editor a una propuesta en blanco (nuevo diseno). */
export function resetEditor(): void {
  useEditorStore.setState(initialProposal());
}
