import { create } from 'zustand';

import { designRepository } from '../core/services';
import type { TattooProposal } from '../models/tattooProposal';

interface ProposalsState {
  proposals: TattooProposal[];
  isLoading: boolean;
  error?: string;
  /** Las propuestas guardadas de la cuenta, de la mas nueva a la mas vieja. */
  load: (userId: string) => Promise<void>;
}

/**
 * Controller de "Propuestas guardadas". Las propuestas viven en el
 * telefono (StorageService sobre expo-sqlite, igual que siempre): son
 * del usuario y no las ve nadie mas, asi que no hace falta backend.
 */
export const useProposalsStore = create<ProposalsState>((set) => ({
  proposals: [],
  isLoading: false,
  error: undefined,

  load: async (userId) => {
    set({ isLoading: true, error: undefined });
    try {
      const list = await designRepository.getProposals(userId);
      set({
        proposals: [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },
}));
