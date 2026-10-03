import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

import type { TattooDesign } from '../models/tattooDesign';
import type { AIService, ComposeOnPhotoInput } from './aiService';

const IMAGE_MODEL = 'gemini-3.1-flash-image';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiGenerateContentResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
}

/**
 * Convierte un error HTTP de la API en algo que tenga sentido mostrarle
 * al usuario en pantalla, en vez del JSON crudo de Google. El detalle
 * original se conserva al final para poder depurar.
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
    return `Se agotó la cuota de Gemini por ahora. Espera unos minutos o revisa el plan/facturación de tu API key. (${detail})`;
  }
  if (response.status === 401 || response.status === 403) {
    return `Gemini rechazó la API key (sin permiso para el modelo de imagen). (${detail})`;
  }
  if (response.status === 404) {
    return `Gemini no encontró el modelo "${IMAGE_MODEL}" para esta key. (${detail})`;
  }
  return `Gemini (${response.status}): ${detail}`;
}

/** Extensiones que no coinciden con su tipo MIME por simple traduccion. */
const MIME_BY_EXTENSION: Record<string, string> = { jpg: 'image/jpeg', heic: 'image/heic' };

/**
 * Deja una imagen lista para viajar dentro del JSON de la peticion.
 *
 * Gemini no descarga URLs: la imagen va en base64 en el cuerpo. Un
 * boceto recien elegido del carrete es un `file://` del telefono, y uno
 * ya procesado antes puede ser un data URI; se contemplan los dos.
 */
async function readAsInlineData(uri: string): Promise<{ mimeType: string; data: string }> {
  const dataUri = uri.match(/^data:([^;]+);base64,(.*)$/s);
  if (dataUri) return { mimeType: dataUri[1], data: dataUri[2] };

  const file = new File(uri);
  const extension = (file.extension || '.jpg').replace('.', '').toLowerCase();
  return {
    mimeType: file.type || MIME_BY_EXTENSION[extension] || `image/${extension}`,
    data: await file.base64(),
  };
}

/**
 * Implementacion de AIService sobre la API REST de Gemini.
 *
 * Llama al endpoint REST directamente con `fetch` en vez de usar un SDK
 * de Google: el SDK oficial (`@google/genai`) esta pensado ante todo
 * para Node y no vale la pena el riesgo de compatibilidad con
 * Hermes/React Native por una sola llamada HTTP.
 *
 * `generateFromDescription` pide imagen de verdad (`responseModalities:
 * ['TEXT','IMAGE']` sobre un modelo con salida de imagen) — antes este
 * metodo devolvia el TEXTO de la respuesta como si fuera una URL de
 * imagen, lo cual nunca podia renderizar nada.
 */
export class GeminiAIService implements AIService {
  constructor(private readonly apiKey: string) {}

  async generateFromDescription(prompt: string, style?: string): Promise<TattooDesign> {
    const fullPrompt = style
      ? `${prompt}. Estilo: ${style}. Genera un diseno de tatuaje en trazo ` +
        'limpio sobre fondo transparente.'
      : prompt;

    const response = await fetch(`${API_BASE}/${IMAGE_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });

    if (!response.ok) {
      throw new Error(await describeApiError(response));
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart?.inlineData) {
      const text = parts.find((p) => p.text)?.text;
      throw new Error(text ? `Gemini no genero una imagen: ${text}` : 'Gemini no genero ninguna imagen.');
    }

    return {
      id: Crypto.randomUUID(),
      ownerId: 'current-user',
      title: prompt,
      // Data URI: React Native renderiza esto directamente en <Image>,
      // sin necesitar todavia storage remoto (ver ARCHITECTURE.md,
      // "Pendiente" — subir a storage remoto sigue abierto por separado).
      imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      source: 'aiGenerated',
      style,
      createdAt: new Date().toISOString(),
    };
  }

  async analyzeReferenceImage(_imageUri: string): Promise<string[]> {
    throw new Error(
      'Enviar la imagen como inlineData a Gemini y parsear elementos ' +
        'principales del diseno (motivo, trazos, composicion).',
    );
  }

  async generateVariations(design: TattooDesign, _count = 3): Promise<TattooDesign[]> {
    throw new Error(`Repetir generateFromDescription variando el prompt base de ${design.title}.`);
  }

  adaptToStyle(design: TattooDesign, style: string): Promise<TattooDesign> {
    return this.generateFromDescription(design.description ?? design.title, style);
  }

  /**
   * Devuelve el boceto recortado sobre fondo transparente, listo para
   * superponerse sobre la piel o el maniquin.
   *
   * Un boceto fotografiado trae el papel, la mesa y su sombra; pegado
   * tal cual sobre un brazo se ve un recorte rectangular, no un
   * tatuaje. Aqui se le pide al mismo modelo de imagen que lo aisle.
   *
   * El resultado es un data URI y NO se sube a Storage: es una vista
   * previa de trabajo del usuario, no algo que vayan a ver otras
   * cuentas (a diferencia del portafolio, ver ImageUploadService).
   */
  async removeBackground(imageUri: string): Promise<string> {
    const { mimeType, data } = await readAsInlineData(imageUri);

    const response = await fetch(`${API_BASE}/${IMAGE_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data } },
              {
                text:
                  'Recorta este diseño de tatuaje dejando SOLO la tinta sobre fondo ' +
                  'completamente transparente. Quita el papel, la mesa, las sombras y ' +
                  'cualquier reflejo. No redibujes, no añadas elementos y no cambies ' +
                  'el trazo ni las proporciones: devuelve el mismo diseño, recortado. ' +
                  'Devuelve un PNG con canal alfa.',
              },
            ],
          },
        ],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });

    if (!response.ok) {
      throw new Error(await describeApiError(response));
    }

    const body = (await response.json()) as GeminiGenerateContentResponse;
    const parts = body.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart?.inlineData) {
      const text = parts.find((p) => p.text)?.text;
      throw new Error(text ? `Gemini no devolvió la imagen recortada: ${text}` : 'Gemini no devolvió ninguna imagen.');
    }

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }

  /**
   * Pega el tatuaje sobre la piel de la foto, siguiendo su curvatura.
   *
   * Se le mandan DOS imagenes en el mismo turno y el orden importa: la
   * foto primero y el diseno despues, con el texto detras explicando
   * cual es cual. Al reves el modelo tiende a tomar el diseno como la
   * imagen a editar.
   *
   * El prompt insiste en que NO redibuje: lo que se quiere es ver el
   * boceto del tatuador tal cual sobre la piel, no una version libre
   * que el modelo considere mas bonita.
   */
  async composeOnPhoto({ photoUri, designUri, bodyZoneLabel }: ComposeOnPhotoInput): Promise<string> {
    const [photo, design] = await Promise.all([readAsInlineData(photoUri), readAsInlineData(designUri)]);

    const response = await fetch(`${API_BASE}/${IMAGE_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType: photo.mimeType, data: photo.data } },
              { inlineData: { mimeType: design.mimeType, data: design.data } },
              {
                text:
                  `La primera imagen es una foto real. La segunda es un diseño de tatuaje. ` +
                  `Aplica el tatuaje sobre la piel en la zona: ${bodyZoneLabel}. ` +
                  'Tiene que verse tatuado de verdad: siguiendo la curvatura del cuerpo, ' +
                  'con la misma luz, sombras y tono de piel que el resto de la foto, y con ' +
                  'la tinta ligeramente absorbida por la piel, no como una calcomanía plana. ' +
                  'Respeta el diseño: mismo trazo, mismas proporciones, mismo motivo. No lo ' +
                  'redibujes ni lo reinterpretes. No cambies nada más de la foto: ni la pose, ' +
                  'ni la ropa, ni el fondo, ni la cara. Devuelve la foto completa editada.',
              },
            ],
          },
        ],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });

    if (!response.ok) {
      throw new Error(await describeApiError(response));
    }

    const body = (await response.json()) as GeminiGenerateContentResponse;
    const parts = body.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart?.inlineData) {
      const text = parts.find((p) => p.text)?.text;
      // Si el modelo se niega (p. ej. por politicas sobre fotos de
      // personas), su explicacion es mas util que un error generico.
      throw new Error(text ? `Gemini no devolvió la composición: ${text}` : 'Gemini no devolvió ninguna imagen.');
    }

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }
}
