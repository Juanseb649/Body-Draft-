import * as Crypto from 'expo-crypto';

import type { TattooDesign } from '../models/tattooDesign';
import type { AIService } from './aiService';

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

  async removeBackground(_imageUri: string): Promise<string> {
    throw new Error(
      'Integrar un modelo de segmentacion (Gemini vision o un servicio ' +
        'dedicado) y devolver la URL de la imagen sin fondo.',
    );
  }
}
