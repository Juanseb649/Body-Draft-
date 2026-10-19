import { Directory, File, Paths } from 'expo-file-system';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Guarda una imagen generada en el telefono (data URI) como archivo
 * propio de la app, en documentos y no en cache: es parte de una
 * propuesta guardada, y el sistema puede vaciar la cache cuando quiera.
 * Devuelve su `file://`.
 *
 * (Aqui vivia tambien `toUploadFile`, que dejaba imagenes en disco para
 * mandarlas a OpenAI desde la app. Ya no hace falta: la IA pasa por la
 * Edge Function `ai`, que recibe las imagenes como data URI.)
 */
export function saveDataUriToDocuments(dataUri: string, folderName: string, fallbackName: string): string {
  const { mimeType, data } = readInlineSync(dataUri);
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'png';

  const folder = new Directory(Paths.document, folderName);
  if (!folder.exists) folder.create({ intermediates: true });

  const name = `${fallbackName}-${Date.now()}.${extension}`;
  const file = new File(folder, name);
  file.create({ overwrite: true });
  file.write(base64ToBytes(data));
  return file.uri;
}

function readInlineSync(uri: string): { mimeType: string; data: string } {
  const match = uri.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) throw new Error(`No se puede guardar esta imagen: ${uri.slice(0, 32)}…`);
  return { mimeType: match[1], data: match[2] };
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
