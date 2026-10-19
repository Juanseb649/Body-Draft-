import type { DesignComment, DesignSocialSummary } from '../models/designSocial';
import { supabase } from '../services/supabaseClient';

/** Fila de `public.design_comments`. */
interface CommentRow {
  id: string;
  design_id: string;
  user_id: string;
  author_name: string | null;
  author_avatar_url?: string | null;
  body: string;
  created_at: string;
}

function toComment(row: CommentRow): DesignComment {
  return {
    id: row.id,
    designId: row.design_id,
    userId: row.user_id,
    // Con la migracion 20261018200000 la base siempre pone un nombre
    // (perfil, registro o correo); esto es solo por si faltara aplicarla.
    authorName: row.author_name ?? '',
    authorAvatarUrl: row.author_avatar_url ?? undefined,
    body: row.body,
    createdAt: row.created_at,
  };
}

/**
 * Me gusta y comentarios de los disenos publicados. Vive en Supabase
 * por la misma razon que el catalogo: lo tienen que ver todas las
 * cuentas. Que cada quien solo escriba como si mismo lo garantiza la
 * RLS (ver 20261018120000_design_likes_comments.sql), no esta clase.
 */
export class SocialRepository {
  /**
   * Contadores de varios disenos de una vez (el feed entero en dos
   * consultas, no dos por tarjeta).
   */
  async getSummaries(designIds: string[], userId?: string): Promise<Record<string, DesignSocialSummary>> {
    const summaries: Record<string, DesignSocialSummary> = {};
    if (designIds.length === 0) return summaries;
    for (const id of designIds) summaries[id] = { likeCount: 0, commentCount: 0, likedByMe: false };

    const [likes, comments] = await Promise.all([
      supabase.from('design_likes').select('design_id, user_id').in('design_id', designIds),
      supabase.from('design_comments').select('design_id').in('design_id', designIds),
    ]);
    if (likes.error) throw likes.error;
    if (comments.error) throw comments.error;

    for (const row of (likes.data ?? []) as { design_id: string; user_id: string }[]) {
      const s = summaries[row.design_id];
      if (!s) continue;
      s.likeCount += 1;
      if (row.user_id === userId) s.likedByMe = true;
    }
    for (const row of (comments.data ?? []) as { design_id: string }[]) {
      const s = summaries[row.design_id];
      if (s) s.commentCount += 1;
    }
    return summaries;
  }

  async like(designId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('design_likes').insert({ design_id: designId, user_id: userId });
    // 23505 = ya existia: el resultado que se queria (que este) ya se cumple.
    if (error && error.code !== '23505') throw error;
  }

  async unlike(designId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('design_likes').delete().eq('design_id', designId).eq('user_id', userId);
    if (error) throw error;
  }

  /** Comentarios de un diseno, del mas viejo al mas nuevo (se leen como conversacion). */
  async getComments(designId: string): Promise<DesignComment[]> {
    const { data, error } = await supabase
      .from('design_comments')
      .select('*')
      .eq('design_id', designId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as CommentRow[]).map(toComment);
  }

  /** Publica un comentario; devuelve la fila tal como quedo (con el nombre que puso la base). */
  async addComment(designId: string, userId: string, body: string): Promise<DesignComment> {
    const { data, error } = await supabase
      .from('design_comments')
      .insert({ design_id: designId, user_id: userId, body })
      .select('*')
      .single();
    if (error) throw error;
    return toComment(data as CommentRow);
  }

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase.from('design_comments').delete().eq('id', commentId);
    if (error) throw error;
  }
}
