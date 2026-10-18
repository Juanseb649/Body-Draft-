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

/**
 * La proxima cita de verdad: la mas cercana que todavia no paso y que
 * sigue en pie (pendiente o confirmada). Undefined si no hay ninguna,
 * y entonces Inicio lo dice en vez de inventar una.
 */
export function nextAppointment(appointments: Appointment[], now: Date = new Date()): Appointment | undefined {
  return appointments
    .filter((a) => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.dateTime).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];
}
