import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import { aiService, designRepository } from '../core/services';
import type { BodySilhouette, BodyZone } from '../models/bodyZone';
import { defaultPlacement, type Placement } from '../models/placement';
import type { TattooProposal } from '../models/tattooProposal';

interface EditorState extends TattooProposal {
  selectDesign: (designId: string) => void;
  setZone: (zone: BodyZone) => void;
  setSilhouette: (silhouette: BodySilhouette) => void;
  /** Aplica de golpe lo que dejo un gesto (mover + girar + escalar). */
  setPlacement: (patch: Partial<Placement>) => void;
  rotate: (degrees: number) => void;
  scale: (scale: number) => void;
  setOpacity: (opacity: number) => void;
  attachCameraSnapshot: (uri: string) => void;
  /** Descarta la captura y vuelve a la camara en vivo. */
  discardCameraSnapshot: () => void;
  /**
   * Manda la captura y el boceto a la IA para que lo componga sobre
   * la piel. Requiere consentimiento: lo comprueba la pantalla antes
   * de llamar aqui (ver settings.privacy.allowAiPhotoUpload).
   */
  renderWithAI: (designUri: string, bodyZoneLabel: string) => Promise<boolean>;
  isRendering: boolean;
  renderError?: string;
  save: () => Promise<void>;
}

function initialProposal(): TattooProposal {
  return {
    id: Crypto.randomUUID(),
    // TODO: sustituir por el id del usuario autenticado.
    userId: 'current-user',
    designId: '',
    bodyZone: 'forearm',
    silhouette: 'masculine',
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

  // Un solo `set` para todo el gesto: mover, girar y escalar llegan
  // juntos desde DesignOverlay al soltar el dedo, no frame a frame.
  setPlacement: (patch) => set((s) => ({ placement: { ...s.placement, ...patch } })),

  rotate: (degrees) => set((s) => ({ placement: { ...s.placement, rotationDegrees: degrees } })),

  scale: (scale) => set((s) => ({ placement: { ...s.placement, scale } })),

  setOpacity: (opacity) => set((s) => ({ placement: { ...s.placement, opacity } })),

  /**
   * Adjunta la foto tomada con la camara (diseno ya superpuesto sobre
   * el cuerpo real). La vista de maniquin 3D no necesita este paso: se
   * re-renderiza a partir de bodyZone/silhouette/placement.
   */
  attachCameraSnapshot: (uri) => set({ cameraSnapshotUrl: uri, renderedImageUrl: undefined, renderError: undefined }),

  discardCameraSnapshot: () =>
    set({ cameraSnapshotUrl: undefined, renderedImageUrl: undefined, renderError: undefined }),

  isRendering: false,
  renderError: undefined,

  renderWithAI: async (designUri, bodyZoneLabel) => {
    const photoUri = get().cameraSnapshotUrl;
    if (!photoUri) return false;

    set({ isRendering: true, renderError: undefined });
    try {
      const renderedImageUrl = await aiService.composeOnPhoto({ photoUri, designUri, bodyZoneLabel });
      set({ renderedImageUrl, isRendering: false });
      return true;
    } catch (e) {
      set({ isRendering: false, renderError: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  save: async () => {
    const saved: TattooProposal = { ...toProposal(get()), status: 'saved' };
    await designRepository.saveProposal(saved);
    set(saved);
  },
}));

function toProposal(state: EditorState): TattooProposal {
  // Se enumeran los campos a mano y no se hace un spread del estado:
  // asi lo de trabajo (isRendering, renderError y las propias acciones)
  // no acaba guardado dentro de la propuesta.
  const {
    id,
    userId,
    designId,
    bodyZone,
    silhouette,
    placement,
    cameraSnapshotUrl,
    renderedImageUrl,
    status,
    createdAt,
  } = state;
  return {
    id,
    userId,
    designId,
    bodyZone,
    silhouette,
    placement,
    cameraSnapshotUrl,
    renderedImageUrl,
    status,
    createdAt,
  };
}

/** Resetea el editor a una propuesta en blanco (nuevo diseno). */
export function resetEditor(): void {
  useEditorStore.setState(initialProposal());
}
