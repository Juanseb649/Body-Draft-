import { create } from 'zustand';

import { aiService, designRepository, type ArtistFeedItem } from '../core/services';
import type { TattooDesign } from '../models/tattooDesign';

interface DesignState {
  designs: TattooDesign[];
  /** Ultimos trabajos de tatuadores (Supabase) — feed de Inicio. */
  feed: ArtistFeedItem[];
  isLoading: boolean;
  isFeedLoading: boolean;
  error?: string;
  loadDesigns: (ownerId?: string) => Promise<void>;
  loadFeed: () => Promise<void>;
  generateWithAI: (prompt: string, style?: string) => Promise<TattooDesign | undefined>;
  uploadDesign: (design: TattooDesign) => Promise<void>;
  /** Recorta el boceto sobre fondo transparente (ver AIService). */
  removeBackground: (designId: string) => Promise<boolean>;
  /** Vuelve a la imagen tal como se importo. */
  restoreBackground: (designId: string) => Promise<void>;
  isProcessingImage: boolean;
}

/**
 * Controller (patron MVC) para la pantalla "Crear diseno" y "Mis
 * disenos". Orquesta DesignRepository y expone un estado que las
 * Views observan con el hook `useDesignStore()`; no contiene JSX ni
 * logica de navegacion.
 */
export const useDesignStore = create<DesignState>((set, get) => ({
  designs: [],
  feed: [],
  isLoading: false,
  isFeedLoading: false,
  error: undefined,

  loadDesigns: async (ownerId) => {
    set({ isLoading: true, error: undefined });
    try {
      const designs = await designRepository.getDesigns(ownerId);
      set({ designs, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  loadFeed: async () => {
    set({ isFeedLoading: true });
    try {
      const feed = await designRepository.getArtistFeed();
      set({ feed, isFeedLoading: false });
    } catch (e) {
      // El feed es contenido secundario: si falla, Inicio sigue siendo
      // usable, asi que no se pisa el `error` del flujo principal.
      set({ isFeedLoading: false, feed: [] });
      console.warn('No se pudo cargar el feed de artistas:', e);
    }
  },

  generateWithAI: async (prompt, style) => {
    set({ isLoading: true, error: undefined });
    try {
      const design = await designRepository.generateWithAI(prompt, style);
      set({ designs: [...get().designs, design], isLoading: false });
      return design;
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
      return undefined;
    }
  },

  uploadDesign: async (design) => {
    await designRepository.saveDesign(design);
    set({ designs: [...get().designs, design] });
  },

  isProcessingImage: false,

  removeBackground: async (designId) => {
    const design = get().designs.find((d) => d.id === designId);
    if (!design) return false;

    set({ isProcessingImage: true, error: undefined });
    try {
      // Se guarda aparte, en `processedImageUrl`, y no se pisa
      // `imageUrl`: asi se puede volver al original sin tener que pedir
      // otra vez el recorte (y gastar cuota de la API).
      const processedImageUrl = await aiService.removeBackground(design.imageUrl);
      const updated = { ...design, processedImageUrl };
      await designRepository.saveDesign(updated);
      set({
        designs: get().designs.map((d) => (d.id === designId ? updated : d)),
        isProcessingImage: false,
      });
      return true;
    } catch (e) {
      set({ isProcessingImage: false, error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  restoreBackground: async (designId) => {
    const design = get().designs.find((d) => d.id === designId);
    if (!design?.processedImageUrl) return;

    const updated = { ...design, processedImageUrl: undefined };
    await designRepository.saveDesign(updated);
    set({ designs: get().designs.map((d) => (d.id === designId ? updated : d)) });
  },
}));
