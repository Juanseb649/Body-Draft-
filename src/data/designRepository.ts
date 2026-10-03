import type { AIService } from '../services/aiService';
import type { ImageUploadService } from '../services/imageUploadService';
import type { StorageService } from '../services/storageService';
import type { TattooDesign } from '../models/tattooDesign';
import type { TattooProposal } from '../models/tattooProposal';
import { supabase } from '../services/supabaseClient';

/** Fila de `public.designs` (ver supabase/migrations/, catalogo de artistas). */
interface DesignRow {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  image_url: string;
  style: string | null;
  created_at: string;
  profiles: { name: string | null } | null;
}

/** Trabajo de un tatuador tal como se muestra en el feed de Inicio. */
export interface ArtistFeedItem {
  design: TattooDesign;
  artistName: string;
}

/** Trabajo nuevo que un tatuador publica en su catalogo. */
export interface NewArtistWork {
  title: string;
  description?: string;
  style?: string;
  /** URI que devuelve el selector de imagenes (file://...), o ya una URL. */
  localImageUri: string;
}

function toFeedItem(row: DesignRow): ArtistFeedItem {
  return {
    design: {
      id: row.id,
      ownerId: row.artist_id,
      artistId: row.artist_id,
      title: row.title,
      description: row.description ?? undefined,
      imageUrl: row.image_url,
      source: 'artistTemplate',
      style: row.style ?? undefined,
      createdAt: row.created_at,
    },
    artistName: row.profiles?.name ?? 'Tatuador',
  };
}

/**
 * Punto unico de acceso a TattooDesign y TattooProposal.
 *
 * Los Controllers (stores) no distinguen si un diseno viene de IA, de
 * una subida manual o de la plantilla de un tatuador: siempre pasan
 * por este repositorio, que decide donde persistirlo/leerlo.
 *
 * Reparto: los disenos PERSONALES (IA, subidas) viven en el storage
 * local del dispositivo; el catalogo publico de los tatuadores vive en
 * Supabase, porque se tiene que ver desde cualquier cuenta.
 */
export class DesignRepository {
  constructor(
    private readonly storage: StorageService,
    private readonly ai: AIService,
    private readonly images: ImageUploadService,
  ) {}

  getDesigns(ownerId?: string): Promise<TattooDesign[]> {
    return this.storage.getDesigns(ownerId);
  }

  /** Ultimos trabajos publicados por tatuadores — el feed de Inicio. */
  async getArtistFeed(limit = 8): Promise<ArtistFeedItem[]> {
    const { data, error } = await supabase
      .from('designs')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as DesignRow[]).map(toFeedItem);
  }

  /** Disenos publicados por UN tatuador (su portafolio/plantillas). */
  async getArtistTemplates(artistId: string): Promise<TattooDesign[]> {
    const { data, error } = await supabase
      .from('designs')
      .select('*, profiles(name)')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as DesignRow[]).map((row) => toFeedItem(row).design);
  }

  saveDesign(design: TattooDesign): Promise<void> {
    return this.storage.saveDesign(design);
  }

  /**
   * Publica un trabajo en el catalogo del tatuador. La imagen se sube
   * primero a Storage: guardar aqui la URI local del telefono haria que
   * el trabajo se viera roto en cualquier otra cuenta (ver
   * ImageUploadService).
   */
  async publishArtistWork(artistId: string, work: NewArtistWork): Promise<TattooDesign> {
    const imageUrl = work.localImageUri.startsWith('http')
      ? work.localImageUri
      : await this.images.uploadPortfolioImage(work.localImageUri, artistId);

    const { data, error } = await supabase
      .from('designs')
      .insert({
        artist_id: artistId,
        title: work.title,
        description: work.description || null,
        image_url: imageUrl,
        style: work.style || null,
      })
      .select('*, profiles(name)')
      .single();

    if (error) {
      // La fila no se creo, asi que la imagen recien subida quedaria
      // huerfana ocupando espacio sin que nada la referencie.
      await this.images.removePortfolioImage(imageUrl).catch(() => {});
      throw error;
    }

    return toFeedItem(data as DesignRow).design;
  }

  /** Quita un trabajo del catalogo, y con el su imagen en Storage. */
  async unpublishArtistWork(design: TattooDesign): Promise<void> {
    const { error } = await supabase.from('designs').delete().eq('id', design.id);
    if (error) throw error;

    // Se borra despues de la fila y no antes: si fallara el delete, es
    // preferible una imagen huerfana a un trabajo visible sin imagen.
    await this.images.removePortfolioImage(design.imageUrl).catch(() => {});
  }

  async generateWithAI(prompt: string, style?: string): Promise<TattooDesign> {
    const design = await this.ai.generateFromDescription(prompt, style);
    await this.storage.saveDesign(design);
    return design;
  }

  getProposals(userId: string): Promise<TattooProposal[]> {
    return this.storage.getProposals(userId);
  }

  saveProposal(proposal: TattooProposal): Promise<void> {
    return this.storage.saveProposal(proposal);
  }
}
