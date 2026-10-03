import { File } from 'expo-file-system';

import { supabase } from './supabaseClient';

/** Bucket creado en supabase/migrations/20261002140000_portfolio_storage.sql. */
const BUCKET = 'portfolio';

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
}

export class SupabaseImageUploadService implements ImageUploadService {
  async uploadPortfolioImage(localUri: string, ownerId: string): Promise<string> {
    const file = new File(localUri);
    const extension = (file.extension || '.jpg').replace('.', '').toLowerCase();
    const contentType = file.type || EXTENSION_MIME[extension] || 'image/jpeg';

    if (file.size && file.size > MAX_BYTES) {
      throw new Error(`La imagen pesa ${Math.round(file.size / 1024 / 1024)} MB; el máximo son 8 MB.`);
    }

    // La carpeta tiene que ser el id del usuario: la policy de Storage
    // compara el primer segmento de la ruta con auth.uid().
    const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    // `bytes()` y no el objeto File del navegador: en React Native no
    // existe FileReader sobre file://, y pasarle a supabase-js un
    // objeto { uri } sube un JSON con la ruta en vez de la imagen.
    const bytes = await file.bytes();

    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async removePortfolioImage(publicUrl: string): Promise<void> {
    const path = pathFromPublicUrl(publicUrl);
    // Una imagen que no esta en nuestro bucket (p. ej. una URL sembrada
    // por SQL) no es un error: simplemente no hay nada que borrar.
    if (!path) return;

    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  }
}

/**
 * Extrae la ruta dentro del bucket de una URL publica de Supabase
 * Storage, que tiene la forma
 * `.../storage/v1/object/public/portfolio/<uid>/<archivo>`.
 * Devuelve null si la URL no pertenece a este bucket.
 */
export function pathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = publicUrl.indexOf(marker);
  if (at < 0) return null;

  const path = publicUrl.slice(at + marker.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}
