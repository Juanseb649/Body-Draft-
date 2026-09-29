import type { TattooDesign } from '../models/tattooDesign';
import type { TattooProposal } from '../models/tattooProposal';

/**
 * Persistencia local, PER-DISPOSITIVO: solo para datos que le pertenecen
 * a un unico usuario y no necesitan verse desde otra cuenta (disenos,
 * propuestas). Las citas no viven aqui — ver data/appointmentRepository.ts.
 *
 * Implementacion real: `SqliteStorageService` (services/sqliteStorageService.ts),
 * sobre `expo-sqlite/kv-store`.
 */
export interface StorageService {
  saveDesign(design: TattooDesign): Promise<void>;
  getDesigns(ownerId?: string): Promise<TattooDesign[]>;

  saveProposal(proposal: TattooProposal): Promise<void>;
  getProposals(userId: string): Promise<TattooProposal[]>;
}
