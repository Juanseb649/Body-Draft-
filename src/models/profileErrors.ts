/**
 * Traduce los errores de Supabase al tocar el perfil (foto, nombre) a
 * algo que se pueda leer en la pantalla. Lo crudo ("Bucket not found",
 * "Could not find the 'avatar_url' column") no le dice nada a quien usa
 * la app, y en los dos casos la causa es la misma: falta aplicar la
 * migracion de fotos de perfil en el servidor.
 */
export const PROFILE_SETUP_MISSING =
  'Las fotos de perfil todavía no están activadas en el servidor. Hay que aplicar la actualización de la base de datos (20261018200000_profile_names_and_avatars.sql) y volver a intentarlo.';

function fieldOf(error: unknown, field: 'message' | 'code'): string {
  if (error && typeof error === 'object' && field in error) return String((error as Record<string, unknown>)[field]);
  return field === 'message' ? String(error) : '';
}

export function friendlyProfileError(error: unknown): string {
  const message = fieldOf(error, 'message');
  const code = fieldOf(error, 'code');

  if (/bucket not found/i.test(message) || /avatar_url/i.test(message) || code === 'PGRST204') {
    return PROFILE_SETUP_MISSING;
  }
  if (/row-level security|permission denied/i.test(message) || code === '42501') {
    return 'No tienes permiso para cambiar este perfil. Cierra sesión y vuelve a entrar.';
  }
  if (/network|failed to fetch|timeout/i.test(message)) {
    return 'No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo.';
  }
  // Los mensajes propios de la app ya vienen en español (p. ej. el peso maximo).
  if (/pesa .* MB/.test(message)) return message;
  return `No se pudo guardar: ${message}`;
}

/** Limite del nombre visible: entra en una linea de comentario. */
export const NAME_MAX_LENGTH = 40;

export type NameValidation = { ok: true; name: string } | { ok: false; error: string };

/** Nombre visible: sin espacios de mas, ni vacio ni demasiado largo. */
export function validateDisplayName(raw: string): NameValidation {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length === 0) return { ok: false, error: 'Escribe tu nombre.' };
  if (name.length > NAME_MAX_LENGTH) return { ok: false, error: `Máximo ${NAME_MAX_LENGTH} caracteres.` };
  return { ok: true, name };
}
