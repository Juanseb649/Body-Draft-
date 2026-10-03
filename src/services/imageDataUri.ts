import { File } from 'expo-file-system';

/** Extensiones cuyo tipo MIME no sale de traducir la extension. */
const MIME_BY_EXTENSION: Record<string, string> = { jpg: 'image/jpeg', heic: 'image/heic' };

export interface InlineImage {
  mimeType: string;
  data: string;
}

/**
 * Lee una imagen local y devuelve sus bytes en base64.
 *
 * Hace falta siempre que la imagen tenga que salir del sistema de
 * archivos de la app: ni la API de Gemini ni un WebView pueden abrir
 * un `file:///data/user/0/...`. Un data URI, en cambio, lo entienden
 * los dos.
 */
export async function readAsInlineData(uri: string): Promise<InlineImage> {
  const alreadyInline = uri.match(/^data:([^;]+);base64,(.*)$/s);
  if (alreadyInline) return { mimeType: alreadyInline[1], data: alreadyInline[2] };

  const file = new File(uri);
  const extension = (file.extension || '.jpg').replace('.', '').toLowerCase();
  return {
    mimeType: file.type || MIME_BY_EXTENSION[extension] || `image/${extension}`,
    data: await file.base64(),
  };
}

/**
 * Lo mismo pero ya montado como data URI.
 *
 * Un `http(s)://` se devuelve tal cual: eso un WebView si sabe pedirlo,
 * y bajarlo aqui para volver a incrustarlo solo gastaria memoria.
 */
export async function toDataUri(uri: string): Promise<string> {
  if (uri.startsWith('data:') || uri.startsWith('http://') || uri.startsWith('https://')) return uri;

  const { mimeType, data } = await readAsInlineData(uri);
  return `data:${mimeType};base64,${data}`;
}
