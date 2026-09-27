import type { TattooDesign } from '../models/tattooDesign';

/**
 * Puerto hacia el proveedor de IA (Gemini en el prototipo).
 *
 * Los Controllers (stores) nunca llaman a Gemini directamente: pasan
 * siempre por esta interfaz para que el proveedor pueda cambiarse sin
 * tocar la capa de presentacion.
 */
export interface AIService {
  /** "Serpiente con flores, estilo japones, tinta negra" -> TattooDesign. */
  generateFromDescription(prompt: string, style?: string): Promise<TattooDesign>;

  /** Identifica los elementos principales de una imagen de referencia. */
  analyzeReferenceImage(imageUri: string): Promise<string[]>;

  /** Genera variaciones de un diseno existente. */
  generateVariations(design: TattooDesign, count?: number): Promise<TattooDesign[]>;

  /** Adapta un diseno de referencia a un estilo determinado. */
  adaptToStyle(design: TattooDesign, style: string): Promise<TattooDesign>;

  /** Elimina el fondo de una imagen, lista para superponerse sobre
   * camara o maniquin 3D. */
  removeBackground(imageUri: string): Promise<string>;
}
