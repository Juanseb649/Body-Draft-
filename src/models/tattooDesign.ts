/** Origen de un TattooDesign. */
export type DesignSource =
  /** Subido por el usuario desde galeria/camara. */
  | 'userUpload'
  /** Generado o transformado por la IA (Gemini) a partir de una
   * descripcion o de una imagen de referencia. */
  | 'aiGenerated'
  /** Cargado por un tatuador como plantilla de su catalogo/portafolio. */
  | 'artistTemplate';

/**
 * Un diseno de tatuaje: la referencia visual antes de convertirse en
 * una TattooProposal (diseno + zona + colocacion).
 */
export interface TattooDesign {
  id: string;
  /** Usuario o tatuador que creo/subio el diseno. */
  ownerId: string;
  title: string;
  description?: string;
  /** Imagen original tal como fue subida o generada. */
  imageUrl: string;
  /** Version procesada por IA (p. ej. fondo removido) lista para
   * superponerse sobre la camara o el maniquin 3D. */
  processedImageUrl?: string;
  source: DesignSource;
  /** Estilo del tatuaje (p. ej. "japones", "blackwork", "fine line"). */
  style?: string;
  /** Si source es 'artistTemplate', id del tatuador dueno de la plantilla. */
  artistId?: string;
  createdAt: string;
}

export function isArtistTemplate(design: TattooDesign): boolean {
  return design.source === 'artistTemplate';
}

export function displayImageUrl(design: TattooDesign): string {
  return design.processedImageUrl ?? design.imageUrl;
}
