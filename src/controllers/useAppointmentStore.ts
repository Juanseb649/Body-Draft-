import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import { appointmentRepository } from '../core/services';
import type { Appointment } from '../models/appointment';

interface BookAppointmentInput {
  userId: string;
  artistId: string;
  dateTime: string;
  proposalId?: string;
  notes?: string;
}

interface AppointmentState {
  appointments: Appointment[];
  isLoading: boolean;
  error?: string;
  loadAppointments: (userId: string) => Promise<void>;
  book: (input: BookAppointmentInput) => Promise<boolean>;
  cancel: (appointment: Appointment) => Promise<boolean>;
}

/** Controller de "Agendar cita" y "Mis citas". */
export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  isLoading: false,
  error: undefined,

  loadAppointments: async (userId) => {
    set({ isLoading: true, error: undefined });
    try {
      const appointments = await appointmentRepository.getAppointments(userId);
      set({ appointments, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  book: async (input) => {
    set({ isLoading: true, error: undefined });
    const appointment: Appointment = { id: Crypto.randomUUID(), status: 'pending', ...input };
    try {
      await appointmentRepository.book(appointment);
      set({ appointments: [...get().appointments, appointment], isLoading: false });
      return true;
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  cancel: async (appointment) => {
    set({ error: undefined });
    try {
      await appointmentRepository.cancel(appointment);
      set({
        appointments: get().appointments.map((a) =>
          a.id === appointment.id ? { ...a, status: 'cancelled' as const } : a,
        ),
      });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },
}));
