import { create } from 'zustand';

import { artistRepository } from '../core/services';
import type { Artist } from '../models/artist';

interface ArtistState {
  artists: Artist[];
  isLoading: boolean;
  loadArtists: (specialty?: string) => Promise<void>;
}

/** Controller de la pantalla "Tatuadores": lista y filtra por especialidad. */
export const useArtistStore = create<ArtistState>((set) => ({
  artists: [],
  isLoading: false,

  loadArtists: async (specialty) => {
    set({ isLoading: true });
    const artists = await artistRepository.getArtists(specialty);
    set({ artists, isLoading: false });
  },
}));
