import * as Crypto from 'expo-crypto';

import type { TattooDesign } from '../models/tattooDesign';
import type { AIService, ComposeOnPhotoInput } from './aiService';
import { toUploadFile } from './imageFileCache';

const IMAGE_MODEL = 'gpt-image-1';
const API_BASE = 'https://api.openai.com/v1';

interface OpenAiImageResponse {
  data?: { b64_json?: string }[];
}

/**
 * Convierte un error HTTP en algo que tenga sentido en pantalla, en
 * vez del JSON crudo. El detalle original se conserva para depurar.
 */
async function describeApiError(response: Response): Promise<string> {
  const body = await response.text();
  let detail = body;
  try {
    detail = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? body;
  } catch {
    // El cuerpo no era JSON; se usa tal cual.
  }

  if (response.status === 429) {
    return `Se agotó la cuota de OpenAI o hay demasiadas peticiones seguidas. Revisa el saldo de tu cuenta. (${detail})`;
  }
  if (response.status === 401) {
    return `OpenAI rechazó la API key. (${detail})`;
  }
  if (response.status === 403) {
    return `Tu organización de OpenAI no tiene acceso a "${IMAGE_MODEL}". Suele hacer falta verificarla. (${detail})`;
  }
  if (response.status === 400) {
    return `OpenAI rechazó la petición, normalmente por sus políticas de contenido. (${detail})`;
  }
  return `OpenAI (${response.status}): ${detail}`;
}

function firstImage(body: OpenAiImageResponse): string {
  const b64 = body.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI no devolvió ninguna imagen.');
  // gpt-image-1 siempre responde en base64, nunca con una URL.
  return `data:image/png;base64,${b64}`;
}

/**
 * Implementacion de AIService sobre la API de imagenes de OpenAI.
 *
 * Las dos operaciones que mas usa la app —quitar el fondo de un boceto
 * y componer un tatuaje sobre una foto— son EDICIONES de imagenes que
 * ya existen, asi que van a `/images/edits`, que acepta varias
 * imagenes de referencia como campos `image[]` repetidos de un
 * `multipart/form-data`. Solo `generateFromDescription` parte de cero
 * y usa `/images/generations`, que si es JSON.
 */
export class OpenAiService implements AIService {
  constructor(private readonly apiKey: string) {}

  private get headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  async generateFromDescription(prompt: string, style?: string): Promise<TattooDesign> {
    const fullPrompt = style
      ? `${prompt}. Estilo: ${style}. Diseño de tatuaje en trazo limpio sobre fondo transparente.`
      : `${prompt}. Diseño de tatuaje en trazo limpio sobre fondo transparente.`;

    const response = await fetch(`${API_BASE}/images/generations`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        background: 'transparent',
      }),
    });

    if (!response.ok) throw new Error(await describeApiError(response));

    return {
      id: Crypto.randomUUID(),
      ownerId: 'current-user',
      title: prompt,
      imageUrl: firstImage((await response.json()) as OpenAiImageResponse),
      source: 'aiGenerated',
      style,
      createdAt: new Date().toISOString(),
    };
  }

  async removeBackground(imageUri: string): Promise<string> {
    const form = new FormData();
    form.append('model', IMAGE_MODEL);
    form.append('background', 'transparent');
    form.append('image[]', toUploadFile(imageUri, 'boceto') as unknown as Blob);
    form.append(
      'prompt',
      'Recorta este diseño de tatuaje dejando SOLO la tinta sobre fondo completamente ' +
        'transparente. Quita el papel, la mesa, las sombras y cualquier reflejo. No lo ' +
        'redibujes ni cambies el trazo o las proporciones: el mismo diseño, recortado.'
    );

    const response = await fetch(`${API_BASE}/images/edits`, { method: 'POST', headers: this.headers, body: form });
    if (!response.ok) throw new Error(await describeApiError(response));
    return firstImage((await response.json()) as OpenAiImageResponse);
  }

  async composeOnPhoto({ photoUri, designUri, bodyZoneLabel }: ComposeOnPhotoInput): Promise<string> {
    const form = new FormData();
    form.append('model', IMAGE_MODEL);
    // El orden importa: la foto primero es la imagen a editar, el
    // diseño detras es la referencia de lo que hay que aplicar.
    form.append('image[]', toUploadFile(photoUri, 'foto') as unknown as Blob);
    form.append('image[]', toUploadFile(designUri, 'boceto') as unknown as Blob);
    form.append(
      'prompt',
      `La primera imagen es una foto real. La segunda es un diseño de tatuaje. Aplica el ` +
        `tatuaje sobre la piel en la zona: ${bodyZoneLabel}. Tiene que verse tatuado de ` +
        'verdad: siguiendo la curvatura del cuerpo, con la misma luz, sombras y tono de ' +
        'piel que el resto de la foto, y con la tinta ligeramente absorbida por la piel, ' +
        'no como una calcomanía plana. Respeta el diseño: mismo trazo, mismas proporciones, ' +
        'mismo motivo. No lo redibujes. No cambies nada más de la foto: ni la pose, ni la ' +
        'ropa, ni el fondo, ni la cara.'
    );

    const response = await fetch(`${API_BASE}/images/edits`, { method: 'POST', headers: this.headers, body: form });
    if (!response.ok) throw new Error(await describeApiError(response));
    return firstImage((await response.json()) as OpenAiImageResponse);
  }

  async analyzeReferenceImage(_imageUri: string): Promise<string[]> {
    throw new Error('Pendiente: describir la imagen con un modelo de visión y devolver sus elementos.');
  }

  async generateVariations(design: TattooDesign, _count = 3): Promise<TattooDesign[]> {
    throw new Error(`Pendiente: repetir generateFromDescription variando el prompt de ${design.title}.`);
  }

  adaptToStyle(design: TattooDesign, style: string): Promise<TattooDesign> {
    return this.generateFromDescription(design.description ?? design.title, style);
  }
}
