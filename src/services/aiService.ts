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

  /**
   * Recompone una foto del cuerpo con el tatuaje aplicado sobre la
   * piel: siguiendo su curvatura, su luz y su tono, en vez de pegado
   * plano encima.
   *
   * Es deliberadamente un paso APARTE y bajo demanda, no algo que
   * ocurra mientras la camara esta abierta:
   *
   * - Manda una foto del cuerpo del usuario a un servicio externo, asi
   *   que tiene que ser una decision suya y consentida (ver
   *   `settings.privacy.allowAiPhotoUpload`).
   * - Cuesta cuota de API por llamada, y tarda segundos.
   *
   * La vista previa en vivo sigue siendo local y gratis: esto es el
   * "enséñame cómo quedaría de verdad" sobre una foto ya tomada.
   */
  composeOnPhoto(input: ComposeOnPhotoInput): Promise<string>;
}

export interface ComposeOnPhotoInput {
  /** Foto del cuerpo recien capturada (file:// o data URI). */
  photoUri: string;
  /** Imagen del tatuaje, mejor si ya viene sin fondo. */
  designUri: string;
  /** Zona del cuerpo, en lenguaje natural ("antebrazo", "costillas"). */
  bodyZoneLabel: string;
}
