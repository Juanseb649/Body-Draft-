import type { Appointment } from '../models/appointment';
import type { TattooDesign } from '../models/tattooDesign';
import type { TattooProposal } from '../models/tattooProposal';

/**
 * Persistencia local (expo-sqlite). Los repositorios la combinan con
 * el acceso remoto (Firebase/API) segun corresponda a cada entidad.
 *
 * La implementacion real con expo-sqlite vive fuera de este esqueleto:
 * requiere definir el esquema de tablas y envolver `SQLiteProvider` /
 * `useSQLiteContext` (ver ARCHITECTURE.md, seccion "Persistencia").
 */
export interface StorageService {
  saveDesign(design: TattooDesign): Promise<void>;
  getDesigns(ownerId?: string): Promise<TattooDesign[]>;

  saveProposal(proposal: TattooProposal): Promise<void>;
  getProposals(userId: string): Promise<TattooProposal[]>;

  saveAppointment(appointment: Appointment): Promise<void>;
  getAppointments(userId: string): Promise<Appointment[]>;
}
