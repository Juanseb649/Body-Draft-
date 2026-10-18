import * as Crypto from 'expo-crypto';

import type { TattooDesign } from '../models/tattooDesign';
import type { AIService, ComposeOnPhotoInput } from './aiService';
import { toDataUri } from './imageDataUri';
import { supabase } from './supabaseClient';

/** Lo que responde la Edge Function `ai` (supabase/functions/ai). */
interface AiFunctionResponse {
  image?: string;
  used?: number;
  limit?: number;
  error?: string;
  message?: string;
}

/** Como se invoca la funcion: supabase-js por defecto, un doble en los tests. */
export type InvokeAi = (body: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

const defaultInvoke: InvokeAi = (body) => supabase.functions.invoke('ai', { body });

/**
 * Implementacion de AIService que NO habla con ningun proveedor: manda
 * todo a la Edge Function `ai` de Supabase, con la sesion del usuario.
 *
 * Antes la app llevaba la API key de OpenAI/Gemini dentro (variables
 * EXPO_PUBLIC_*, que terminan en el bundle): cualquiera podia sacarla y
 * gastar el saldo del dueño sin limite. Ahora la clave vive en los
 * secrets de Supabase, la funcion comprueba quien llama y le descuenta
 * una unidad de su cuota diaria (tabla ai_usage).
 *
 * Las imagenes viajan como data URI dentro del JSON: la funcion las
 * reenvia al proveedor tal cual.
 */
export class ProxyAiService implements AIService {
  constructor(private readonly invoke: InvokeAi = defaultInvoke) {}

  private async call(body: Record<string, unknown>): Promise<string> {
    const { data, error } = await this.invoke(body);
    if (error) throw new Error(await describeError(error));
    const image = (data as AiFunctionResponse | null)?.image;
    if (!image) throw new Error('El servicio de IA no devolvió ninguna imagen.');
    return image;
  }

  async generateFromDescription(prompt: string, style?: string): Promise<TattooDesign> {
    const image = await this.call({ op: 'generate', prompt, ...(style ? { style } : {}) });
    return {
      id: Crypto.randomUUID(),
      ownerId: 'current-user',
      title: prompt,
      imageUrl: image,
      source: 'aiGenerated',
      style,
      createdAt: new Date().toISOString(),
    };
  }

  async removeBackground(imageUri: string): Promise<string> {
    return this.call({ op: 'removeBackground', image: await toDataUri(imageUri) });
  }

  async composeOnPhoto({ photoUri, designUri, bodyZoneLabel }: ComposeOnPhotoInput): Promise<string> {
    const [photo, design] = await Promise.all([toDataUri(photoUri), toDataUri(designUri)]);
    return this.call({ op: 'compose', photo, design, zone: bodyZoneLabel });
  }

  adaptToStyle(design: TattooDesign, style: string): Promise<TattooDesign> {
    return this.generateFromDescription(design.description ?? design.title, style);
  }

  analyzeReferenceImage(): Promise<string[]> {
    return Promise.reject(new Error('Analizar una imagen de referencia todavía no está disponible.'));
  }

  generateVariations(): Promise<TattooDesign[]> {
    return Promise.reject(new Error('Las variaciones de un diseño todavía no están disponibles.'));
  }
}

/**
 * El mensaje que la funcion manda en el cuerpo del error (ya en
 * español: cuota agotada, sesion, proveedor), o uno generico si ni
 * siquiera se llego a ella.
 */
export async function describeError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;
  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = (await (context as Response).json()) as AiFunctionResponse;
      if (body?.message) return body.message;
    } catch {
      // Cuerpo que no es JSON: sigue abajo.
    }
    const status = (context as Response).status;
    if (status === 404) return 'El servicio de IA todavía no está instalado en el servidor (falta desplegar la función "ai").';
  }
  const name = (error as { name?: string })?.name;
  if (name === 'FunctionsFetchError') return 'No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo.';
  const message = (error as { message?: string })?.message;
  return message ? `No se pudo usar la IA: ${message}` : 'No se pudo usar la IA.';
}
