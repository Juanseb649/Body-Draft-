import { create } from 'zustand';

import { socialRepository } from '../core/services';
import {
  EMPTY_SUMMARY,
  toggleLike as toggledSummary,
  validateComment,
  type DesignComment,
  type DesignSocialSummary,
} from '../models/designSocial';

interface DesignSocialState {
  /** Contadores por id de diseno (feed y detalle comparten el mismo dato). */
  summaries: Record<string, DesignSocialSummary>;
  /** Comentarios por id de diseno; solo se cargan al abrir el detalle. */
  comments: Record<string, DesignComment[]>;
  isLoadingComments: boolean;
  isPosting: boolean;
  /** Error de la ultima accion, para mostrarlo junto al campo/boton. */
  error?: string;

  summaryOf: (designId: string) => DesignSocialSummary;
  loadSummaries: (designIds: string[], userId?: string) => Promise<void>;
  loadComments: (designId: string) => Promise<void>;
  toggleLike: (designId: string, userId: string) => Promise<boolean>;
  addComment: (designId: string, userId: string, raw: string) => Promise<boolean>;
  deleteComment: (comment: DesignComment) => Promise<boolean>;
  clearError: () => void;
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Controller de lo social de un diseno: me gusta y comentarios.
 *
 * El me gusta es optimista (el corazon responde al instante) y se
 * deshace si el servidor lo rechaza; un comentario NO, porque hasta que
 * la base lo guarda no se sabe con que nombre de autor va a aparecer.
 */
export const useDesignSocialStore = create<DesignSocialState>((set, get) => ({
  summaries: {},
  comments: {},
  isLoadingComments: false,
  isPosting: false,
  error: undefined,

  summaryOf: (designId) => get().summaries[designId] ?? EMPTY_SUMMARY,

  loadSummaries: async (designIds, userId) => {
    try {
      const fresh = await socialRepository.getSummaries(designIds, userId);
      set({ summaries: { ...get().summaries, ...fresh } });
    } catch (e) {
      // Los contadores son secundarios: sin ellos el feed se sigue viendo.
      console.warn('No se pudieron cargar los me gusta/comentarios:', e);
    }
  },

  loadComments: async (designId) => {
    set({ isLoadingComments: true, error: undefined });
    try {
      const list = await socialRepository.getComments(designId);
      const summary = get().summaryOf(designId);
      set({
        comments: { ...get().comments, [designId]: list },
        summaries: { ...get().summaries, [designId]: { ...summary, commentCount: list.length } },
        isLoadingComments: false,
      });
    } catch (e) {
      set({ isLoadingComments: false, error: messageOf(e) });
    }
  },

  toggleLike: async (designId, userId) => {
    const before = get().summaryOf(designId);
    const after = toggledSummary(before);
    set({ summaries: { ...get().summaries, [designId]: after }, error: undefined });
    try {
      if (after.likedByMe) await socialRepository.like(designId, userId);
      else await socialRepository.unlike(designId, userId);
      return true;
    } catch (e) {
      // Se vuelve a lo que habia: el corazon no puede mentir sobre el servidor.
      set({ summaries: { ...get().summaries, [designId]: before }, error: messageOf(e) });
      return false;
    }
  },

  addComment: async (designId, userId, raw) => {
    const valid = validateComment(raw);
    if (!valid.ok) {
      set({ error: valid.error });
      return false;
    }
    set({ isPosting: true, error: undefined });
    try {
      const comment = await socialRepository.addComment(designId, userId, valid.body);
      const summary = get().summaryOf(designId);
      set({
        comments: { ...get().comments, [designId]: [...(get().comments[designId] ?? []), comment] },
        summaries: { ...get().summaries, [designId]: { ...summary, commentCount: summary.commentCount + 1 } },
        isPosting: false,
      });
      return true;
    } catch (e) {
      set({ isPosting: false, error: messageOf(e) });
      return false;
    }
  },

  deleteComment: async (comment) => {
    set({ error: undefined });
    try {
      await socialRepository.deleteComment(comment.id);
      const list = (get().comments[comment.designId] ?? []).filter((c) => c.id !== comment.id);
      const summary = get().summaryOf(comment.designId);
      set({
        comments: { ...get().comments, [comment.designId]: list },
        summaries: {
          ...get().summaries,
          [comment.designId]: { ...summary, commentCount: Math.max(0, summary.commentCount - 1) },
        },
      });
      return true;
    } catch (e) {
      set({ error: messageOf(e) });
      return false;
    }
  },

  clearError: () => set({ error: undefined }),
}));
