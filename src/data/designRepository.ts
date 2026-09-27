import type { AIService } from '../services/aiService';
import type { StorageService } from '../services/storageService';
import type { TattooDesign } from '../models/tattooDesign';
import type { TattooProposal } from '../models/tattooProposal';

/**
 * Punto unico de acceso a TattooDesign y TattooProposal.
 *
 * Los Controllers (stores) no distinguen si un diseno viene de IA, de
 * una subida manual o de la plantilla de un tatuador: siempre pasan
 * por este repositorio, que decide donde persistirlo/leerlo.
 */
export class DesignRepository {
  constructor(
    private readonly storage: StorageService,
    private readonly ai: AIService,
  ) {}

  getDesigns(ownerId?: string): Promise<TattooDesign[]> {
    return this.storage.getDesigns(ownerId);
  }

  /** Disenos publicados por tatuadores como plantillas de su catalogo. */
  async getArtistTemplates(artistId: string): Promise<TattooDesign[]> {
    const all = await this.storage.getDesigns(artistId);
    return all.filter((d) => d.source === 'artistTemplate');
  }

  saveDesign(design: TattooDesign): Promise<void> {
    return this.storage.saveDesign(design);
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
