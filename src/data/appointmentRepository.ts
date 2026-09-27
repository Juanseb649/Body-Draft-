import type { Appointment } from '../models/appointment';
import type { StorageService } from '../services/storageService';

/**
 * Persistencia y consulta de citas. Guarda localmente para que "Mis
 * citas" funcione sin conexion y sincroniza con el backend cuando hay
 * red disponible.
 */
export class AppointmentRepository {
  constructor(private readonly storage: StorageService) {}

  getAppointments(userId: string): Promise<Appointment[]> {
    return this.storage.getAppointments(userId);
  }

  async book(appointment: Appointment): Promise<void> {
    await this.storage.saveAppointment(appointment);
    // TODO: sincronizar con el backend / notificar al tatuador.
  }

  cancel(appointment: Appointment): Promise<void> {
    return this.storage.saveAppointment({ ...appointment, status: 'cancelled' });
  }
}
