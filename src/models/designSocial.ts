/**
 * Lo "social" de un diseno publicado por un tatuador: los me gusta y
 * los comentarios publicos que lo acompanan (tablas `design_likes` y
 * `design_comments`, ver supabase/migrations/).
 *
 * No es mensajeria: un comentario lo lee cualquiera que vea el diseno.
 */

/** Mismo limite que el CHECK de `design_comments.body`. */
export const COMMENT_MAX_LENGTH = 500;

export interface DesignComment {
  id: string;
  designId: string;
  userId: string;
  /** Lo rellena la base desde `profiles`; nunca lo manda la app. */
  authorName: string;
  /** Foto del autor, tambien copiada por la base (la RLS no deja leer perfiles ajenos). */
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
}

/** Contadores de un diseno, mas si el usuario actual ya le dio me gusta. */
export interface DesignSocialSummary {
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

/** Para quien la base no puso nombre (falta la migracion de nombres). */
export const UNKNOWN_AUTHOR = 'Usuario de BodyDraft';

/**
 * El nombre que se muestra en un comentario. Los comentarios PROPIOS
 * siempre llevan el nombre actual de la cuenta: asi un cambio de nombre
 * se ve al instante, y un comentario guardado sin nombre (perfil sin
 * fila, o la base sin la migracion 20261018200000) no sale anonimo.
 */
export function commentAuthorName(comment: DesignComment, me?: { id?: string; name?: string }): string {
  if (me?.id && comment.userId === me.id && me.name?.trim()) return me.name.trim();
  return comment.authorName.trim() || UNKNOWN_AUTHOR;
}

export const EMPTY_SUMMARY: DesignSocialSummary = { likeCount: 0, commentCount: 0, likedByMe: false };

export type CommentValidation = { ok: true; body: string } | { ok: false; error: string };

/**
 * Valida un comentario ANTES de mandarlo. La base aplica la misma
 * regla (no se confia solo en esto); aqui es para poder decirlo en la
 * pantalla en vez de mostrar el error crudo de Postgres.
 */
export function validateComment(raw: string): CommentValidation {
  const body = raw.trim();
  if (body.length === 0) return { ok: false, error: 'Escribe algo antes de publicar.' };
  if (body.length > COMMENT_MAX_LENGTH) {
    return { ok: false, error: `Máximo ${COMMENT_MAX_LENGTH} caracteres (llevas ${body.length}).` };
  }
  return { ok: true, body };
}

/** El resumen tal como queda despues de tocar el corazon (optimista). */
export function toggleLike(summary: DesignSocialSummary): DesignSocialSummary {
  const likedByMe = !summary.likedByMe;
  return {
    ...summary,
    likedByMe,
    likeCount: Math.max(0, summary.likeCount + (likedByMe ? 1 : -1)),
  };
}

/** 7 → "7", 1280 → "1,2 k", 2_400_000 → "2,4 M". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const [value, suffix] = n < 1_000_000 ? [n / 1000, 'k'] : [n / 1_000_000, 'M'];
  const rounded = Math.floor(value * 10) / 10;
  return `${String(rounded).replace('.', ',')} ${suffix}`;
}

/** "ahora", "hace 5 min", "hace 3 h", "hace 2 d", o la fecha corta. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}
