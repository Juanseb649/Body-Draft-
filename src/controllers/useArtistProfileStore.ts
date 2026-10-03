import { create } from 'zustand';

import { artistRepository, designRepository, type NewArtistWork } from '../core/services';
import type { ArtistProfilePatch } from '../data/artistRepository';
import type { Artist } from '../models/artist';
import type { TattooDesign } from '../models/tattooDesign';
import { useSettingsStore } from './useSettingsStore';

interface ArtistProfileState {
  profile?: Artist;
  /** Trabajos ya publicados por este tatuador (tabla `designs`). */
  works: TattooDesign[];
  isLoading: boolean;
  /** Separado de `isLoading`: guardar no debe vaciar el formulario. */
  isSaving: boolean;
  isPublishing: boolean;
  error?: string;

  load: (userId: string) => Promise<void>;
  save: (userId: string, patch: ArtistProfilePatch) => Promise<boolean>;
  publishWork: (userId: string, work: NewArtistWork) => Promise<boolean>;
  removeWork: (design: TattooDesign) => Promise<boolean>;
}

/**
 * Controller de "Editar perfil": el perfil publico del tatuador y su
 * catalogo de trabajos.
 *
 * Esta separado de `useArtistStore` (que lista tatuadores para los
 * clientes) porque son dos cosas distintas: alli se LEE el perfil de
 * otros, aqui se ESCRIBE el propio.
 */
export const useArtistProfileStore = create<ArtistProfileState>((set, get) => ({
  profile: undefined,
  works: [],
  isLoading: false,
  isSaving: false,
  isPublishing: false,
  error: undefined,

  load: async (userId) => {
    set({ isLoading: true, error: undefined });
    try {
      const profile = await artistRepository.getMyProfile(userId);
      // El catalogo solo existe para tatuadores; pedirlo para un
      // cliente seria una consulta garantizada a vacio.
      const works = profile ? await designRepository.getArtistTemplates(userId) : [];
      set({ profile, works, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: messageOf(e) });
    }
  },

  save: async (userId, patch) => {
    set({ isSaving: true, error: undefined });
    try {
      const profile = await artistRepository.updateMyProfile(userId, patch);
      set({ profile, isSaving: false });
      // El rol vive tambien en los ajustes locales (es lo que pinta el
      // sidebar); si no se sincroniza, la app seguiria llamandote
      // cliente despues de guardarte como tatuador.
      useSettingsStore.getState().setRole(patch.role);
      return true;
    } catch (e) {
      set({ isSaving: false, error: messageOf(e) });
      return false;
    }
  },

  publishWork: async (userId, work) => {
    set({ isPublishing: true, error: undefined });
    try {
      const design = await designRepository.publishArtistWork(userId, work);
      // Al principio de la lista: `getArtistTemplates` ordena por fecha
      // descendente, asi queda igual que tras recargar.
      set({ works: [design, ...get().works], isPublishing: false });
      return true;
    } catch (e) {
      set({ isPublishing: false, error: messageOf(e) });
      return false;
    }
  },

  removeWork: async (design) => {
    const previous = get().works;
    // Optimista: la lista responde al instante y se revierte si falla.
    set({ works: previous.filter((w) => w.id !== design.id), error: undefined });
    try {
      await designRepository.unpublishArtistWork(design);
      return true;
    } catch (e) {
      set({ works: previous, error: messageOf(e) });
      return false;
    }
  },
}));

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
