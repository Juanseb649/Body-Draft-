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
  loadAppointments: (userId: string) => Promise<void>;
  book: (input: BookAppointmentInput) => Promise<void>;
  cancel: (appointment: Appointment) => Promise<void>;
}

/** Controller de "Agendar cita" y "Mis citas". */
export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  isLoading: false,

  loadAppointments: async (userId) => {
    set({ isLoading: true });
    const appointments = await appointmentRepository.getAppointments(userId);
    set({ appointments, isLoading: false });
  },

  book: async (input) => {
    const appointment: Appointment = { id: Crypto.randomUUID(), status: 'pending', ...input };
    await appointmentRepository.book(appointment);
    set({ appointments: [...get().appointments, appointment] });
  },

  cancel: async (appointment) => {
    await appointmentRepository.cancel(appointment);
    set({
      appointments: get().appointments.map((a) =>
        a.id === appointment.id ? { ...a, status: 'cancelled' as const } : a,
      ),
    });
  },
}));
