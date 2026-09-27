import { create } from 'zustand';

import { designRepository } from '../core/services';
import type { TattooDesign } from '../models/tattooDesign';

interface DesignState {
  designs: TattooDesign[];
  isLoading: boolean;
  error?: string;
  loadDesigns: (ownerId?: string) => Promise<void>;
  generateWithAI: (prompt: string, style?: string) => Promise<TattooDesign | undefined>;
  uploadDesign: (design: TattooDesign) => Promise<void>;
}

/**
 * Controller (patron MVC) para la pantalla "Crear diseno" y "Mis
 * disenos". Orquesta DesignRepository y expone un estado que las
 * Views observan con el hook `useDesignStore()`; no contiene JSX ni
 * logica de navegacion.
 */
export const useDesignStore = create<DesignState>((set, get) => ({
  designs: [],
  isLoading: false,
  error: undefined,

  loadDesigns: async (ownerId) => {
    set({ isLoading: true, error: undefined });
    try {
      const designs = await designRepository.getDesigns(ownerId);
      set({ designs, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
    }
  },

  generateWithAI: async (prompt, style) => {
    set({ isLoading: true, error: undefined });
    try {
      const design = await designRepository.generateWithAI(prompt, style);
      set({ designs: [...get().designs, design], isLoading: false });
      return design;
    } catch (e) {
      set({ isLoading: false, error: String(e) });
      return undefined;
    }
  },

  uploadDesign: async (design) => {
    await designRepository.saveDesign(design);
    set({ designs: [...get().designs, design] });
  },
}));
