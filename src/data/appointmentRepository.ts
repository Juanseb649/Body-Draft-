import type { Appointment, AppointmentStatus } from '../models/appointment';
import { supabase } from '../services/supabaseClient';

/** Fila de `public.appointments` (ver supabase/migrations/, esquema profiles/appointments). */
interface AppointmentRow {
  id: string;
  client_id: string;
  artist_id: string;
  proposal_id: string | null;
  date_time: string;
  status: AppointmentStatus;
  notes: string | null;
}

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    userId: row.client_id,
    artistId: row.artist_id,
    proposalId: row.proposal_id ?? undefined,
    dateTime: row.date_time,
    status: row.status,
    notes: row.notes ?? undefined,
  };
}

/**
 * Persistencia y consulta de citas — vive en Supabase, no en el
 * almacenamiento local del dispositivo: una cita la tiene que poder ver
 * tanto el cliente que la agenda como el tatuador, y un dato compartido
 * entre dos cuentas no puede vivir solo en el telefono de una de ellas.
 * Las Row Level Security policies de `appointments` son las que
 * garantizan que cada cuenta solo vea las citas donde participa.
 */
export class AppointmentRepository {
  /** Citas donde `userId` participa, como cliente o como tatuador. */
  async getAppointments(userId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .or(`client_id.eq.${userId},artist_id.eq.${userId}`)
      .order('date_time', { ascending: true });
    if (error) throw error;
    return (data as AppointmentRow[]).map(toAppointment);
  }

  async book(appointment: Appointment): Promise<void> {
    const { error } = await supabase.from('appointments').insert({
      id: appointment.id,
      client_id: appointment.userId,
      artist_id: appointment.artistId,
      proposal_id: appointment.proposalId ?? null,
      date_time: appointment.dateTime,
      status: appointment.status,
      notes: appointment.notes ?? null,
    });
    if (error) throw error;
  }

  async cancel(appointment: Appointment): Promise<void> {
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointment.id);
    if (error) throw error;
  }
}
