import { create } from 'zustand';

import { artistRepository } from '../core/services';
import type { Artist } from '../models/artist';

interface ArtistState {
  artists: Artist[];
  isLoading: boolean;
  error?: string;
  loadArtists: (specialty?: string) => Promise<void>;
}

/** Controller de la pantalla "Tatuadores": lista y filtra por especialidad. */
export const useArtistStore = create<ArtistState>((set) => ({
  artists: [],
  isLoading: false,
  error: undefined,

  loadArtists: async (specialty) => {
    set({ isLoading: true, error: undefined });
    try {
      const artists = await artistRepository.getArtists(specialty);
      set({ artists, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },
}));
