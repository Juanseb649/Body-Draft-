export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

/**
 * Cita solicitada por el usuario con un Artist, opcionalmente vinculada
 * a una TattooProposal guardada previamente.
 */
export interface Appointment {
  id: string;
  userId: string;
  artistId: string;
  /** Propuesta (diseno + zona + colocacion) que se llevara a la cita. */
  proposalId?: string;
  /** Diseno publicado por el tatuador del que salio la cita (ver detalle del diseno). */
  designId?: string;
  dateTime: string;
  status: AppointmentStatus;
  notes?: string;
}
