import { Directory, File, Paths } from 'expo-file-system';

import { readAsInlineData } from './imageDataUri';

const CACHE_FOLDER = 'ai-uploads';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Lo que `FormData` de React Native espera para adjuntar un archivo. */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Deja una imagen como archivo real en disco, lista para subirla en un
 * `multipart/form-data`.
 *
 * Hace falta porque el `FormData` de React Native solo sabe adjuntar
 * `{ uri, name, type }` apuntando a un archivo: un data URI —que es
 * como llega un diseño generado por IA— no lo acepta, y acabaria
 * subiendo la cadena base64 como si fuera texto.
 *
 * Una imagen que YA es un archivo local se devuelve tal cual, sin
 * copiarla: lo normal es que el boceto venga del carrete.
 */
export function toUploadFile(uri: string, fallbackName: string): UploadFile {
  if (uri.startsWith('file://')) {
    const file = new File(uri);
    return { uri, name: file.name || fallbackName, type: file.type || 'image/jpeg' };
  }

  const { mimeType, data } = readInlineSync(uri);
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'png';

  const folder = new Directory(Paths.cache, CACHE_FOLDER);
  if (!folder.exists) folder.create({ intermediates: true });

  const name = `${fallbackName}-${Date.now()}.${extension}`;
  const file = new File(folder, name);
  file.create({ overwrite: true });
  file.write(base64ToBytes(data));

  return { uri: file.uri, name, type: mimeType };
}

/** Borra lo que `toUploadFile` haya dejado en cache. */
export function clearUploadCache(): void {
  const folder = new Directory(Paths.cache, CACHE_FOLDER);
  if (folder.exists) folder.delete();
}

/**
 * `readAsInlineData` es asincrono por los archivos, pero aqui solo se
 * llama con data URIs, donde el troceado es inmediato.
 */
function readInlineSync(uri: string): { mimeType: string; data: string } {
  const match = uri.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) throw new Error(`No se puede subir esta imagen: ${uri.slice(0, 32)}…`);
  return { mimeType: match[1], data: match[2] };
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export { readAsInlineData };
