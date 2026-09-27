import { GoogleGenerativeAI } from '@google/generative-ai';
import * as Crypto from 'expo-crypto';

import type { TattooDesign } from '../models/tattooDesign';
import type { AIService } from './aiService';

/**
 * Implementacion de AIService sobre la API de Google Gemini.
 *
 * Solo se encarga de hablar con Gemini y devolver TattooDesign; no
 * persiste nada (eso es responsabilidad de designRepository).
 */
export class GeminiAIService implements AIService {
  private model;

  constructor(apiKey: string) {
    const client = new GoogleGenerativeAI(apiKey);
    this.model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateFromDescription(prompt: string, style?: string): Promise<TattooDesign> {
    const fullPrompt = style
      ? `${prompt}. Estilo: ${style}. Genera un diseno de tatuaje en trazo ` +
        'limpio sobre fondo transparente.'
      : prompt;

    const result = await this.model.generateContent(fullPrompt);

    // TODO: cuando la respuesta incluya datos de imagen, subirla al
    // storage remoto y usar esa URL en lugar de un placeholder.
    return {
      id: Crypto.randomUUID(),
      ownerId: 'current-user',
      title: prompt,
      imageUrl: result.response.text(),
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
