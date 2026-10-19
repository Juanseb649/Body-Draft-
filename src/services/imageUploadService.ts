import { File } from 'expo-file-system';

import { supabase } from './supabaseClient';

/** Bucket creado en supabase/migrations/20261002140000_portfolio_storage.sql. */
const BUCKET = 'portfolio';

/** Fotos de perfil: supabase/migrations/20261018200000_profile_names_and_avatars.sql. */
const AVATAR_BUCKET = 'avatars';

/** Una foto de perfil se ve chica: no hace falta mas. */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** Tamaño maximo por imagen. Mas que un limite tecnico es cortesia con
 * quien la va a descargar: el feed carga varias a la vez. */
const MAX_BYTES = 8 * 1024 * 1024;

const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

/**
 * Sube imagenes que tienen que poder verse desde OTRAS cuentas.
 *
 * El portafolio de un tatuador no puede quedarse como URI local
 * (`file:///...`): esa ruta solo existe en su telefono y en cualquier
 * otro la imagen sale rota. Los disenos personales del usuario si
 * siguen siendo locales — ver DesignRepository.
 */
export interface ImageUploadService {
  /** Sube la imagen y devuelve su URL publica, ya lista para `<Image>`. */
  uploadPortfolioImage(localUri: string, ownerId: string): Promise<string>;
  /** Borra una imagen subida antes, a partir de su URL publica. */
  removePortfolioImage(publicUrl: string): Promise<void>;
  /** Sube la foto de perfil de `userId` y devuelve su URL publica. */
  uploadAvatar(localUri: string, userId: string): Promise<string>;
  /** Borra una foto de perfil subida antes. */
  removeAvatar(publicUrl: string): Promise<void>;
}

export class SupabaseImageUploadService implements ImageUploadService {
  uploadPortfolioImage(localUri: string, ownerId: string): Promise<string> {
    return this.upload(BUCKET, localUri, ownerId, MAX_BYTES);
  }

  removePortfolioImage(publicUrl: string): Promise<void> {
    return this.remove(BUCKET, publicUrl);
  }

  uploadAvatar(localUri: string, userId: string): Promise<string> {
    return this.upload(AVATAR_BUCKET, localUri, userId, MAX_AVATAR_BYTES);
  }

  removeAvatar(publicUrl: string): Promise<void> {
    return this.remove(AVATAR_BUCKET, publicUrl);
  }

  private async upload(bucket: string, localUri: string, ownerId: string, maxBytes: number): Promise<string> {
    const file = new File(localUri);
    const extension = (file.extension || '.jpg').replace('.', '').toLowerCase();
    const contentType = file.type || EXTENSION_MIME[extension] || 'image/jpeg';

    if (file.size && file.size > maxBytes) {
      throw new Error(
        `La imagen pesa ${Math.round(file.size / 1024 / 1024)} MB; el máximo son ${Math.round(maxBytes / 1024 / 1024)} MB.`,
      );
    }

    // La carpeta tiene que ser el id del usuario: la policy de Storage
    // compara el primer segmento de la ruta con auth.uid().
    const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    // `bytes()` y no el objeto File del navegador: en React Native no
    // existe FileReader sobre file://, y pasarle a supabase-js un
    // objeto { uri } sube un JSON con la ruta en vez de la imagen.
    const bytes = await file.bytes();

    const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType, upsert: false });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  private async remove(bucket: string, publicUrl: string): Promise<void> {
    const path = pathFromPublicUrl(publicUrl, bucket);
    // Una imagen que no esta en nuestro bucket (p. ej. una URL sembrada
    // por SQL) no es un error: simplemente no hay nada que borrar.
    if (!path) return;

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  }
}

/**
 * Extrae la ruta dentro del bucket de una URL publica de Supabase
 * Storage, que tiene la forma
 * `.../storage/v1/object/public/portfolio/<uid>/<archivo>`.
 * Devuelve null si la URL no pertenece a este bucket.
 */
export function pathFromPublicUrl(publicUrl: string, bucket: string = BUCKET): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = publicUrl.indexOf(marker);
  if (at < 0) return null;

  const path = publicUrl.slice(at + marker.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}
