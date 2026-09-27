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
  dateTime: string;
  status: AppointmentStatus;
  notes?: string;
}
