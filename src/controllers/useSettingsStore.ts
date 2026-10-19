import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';
export type NeonIntensity = 'soft' | 'medium' | 'intense';
export type ReminderLeadHours = 2 | 24 | 48;
export type AccountRole = 'client' | 'artist';
export type Locale = 'es' | 'en';

interface SettingsState {
  appearance: {
    theme: ThemePreference;
    neonIntensity: NeonIntensity;
    reduceMotion: boolean;
  };
  notifications: {
    appointmentReminder: boolean;
    reminderLeadHours: ReminderLeadHours;
    artistMessages: boolean;
    news: boolean;
  };
  account: {
    role: AccountRole;
    locale: Locale;
  };
  /** Explicaciones de un solo uso que el usuario ya vio. */
  onboarding: {
    seenCreateIntro: boolean;
  };
  privacy: {
    /**
     * Permiso EXPLICITO para mandar una foto del cuerpo a la IA y
     * que la recomponga con el tatuaje aplicado.
     *
     * Arranca en false y solo lo pone a true el usuario aceptando el
     * aviso: todo lo demas de la camara ocurre en el telefono, y esta
     * es la unica parte donde una foto suya sale de el.
     */
    allowAiPhotoUpload: boolean;
  };

  setTheme: (theme: ThemePreference) => void;
  setNeonIntensity: (value: NeonIntensity) => void;
  setReduceMotion: (value: boolean) => void;
  setAppointmentReminder: (value: boolean) => void;
  setReminderLeadHours: (value: ReminderLeadHours) => void;
  setArtistMessages: (value: boolean) => void;
  setNews: (value: boolean) => void;
  setRole: (value: AccountRole) => void;
  markCreateIntroSeen: () => void;
  setAllowAiPhotoUpload: (value: boolean) => void;
  setLocale: (value: Locale) => void;
}

/**
 * Controller de la pantalla "Ajustes" (guia de diseno, seccion
 * "Sección de ajustes"). Persistido con AsyncStorage — la guia sugiere
 * expo-sqlite/kv-store; se uso AsyncStorage por ser el storage que ya
 * esta instalado para la sesion de Supabase, con la misma clave/valor
 * documentados en la tabla de la guia.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: { theme: 'system', neonIntensity: 'medium', reduceMotion: false },
      notifications: {
        appointmentReminder: true,
        reminderLeadHours: 24,
        artistMessages: true,
        news: false,
      },
      account: { role: 'client', locale: 'es' },
      onboarding: { seenCreateIntro: false },
      privacy: { allowAiPhotoUpload: false },

      setTheme: (theme) => set((s) => ({ appearance: { ...s.appearance, theme } })),
      setNeonIntensity: (neonIntensity) => set((s) => ({ appearance: { ...s.appearance, neonIntensity } })),
      setReduceMotion: (reduceMotion) => set((s) => ({ appearance: { ...s.appearance, reduceMotion } })),
      setAppointmentReminder: (appointmentReminder) =>
        set((s) => ({ notifications: { ...s.notifications, appointmentReminder } })),
      setReminderLeadHours: (reminderLeadHours) =>
        set((s) => ({ notifications: { ...s.notifications, reminderLeadHours } })),
      setArtistMessages: (artistMessages) => set((s) => ({ notifications: { ...s.notifications, artistMessages } })),
      setNews: (news) => set((s) => ({ notifications: { ...s.notifications, news } })),
      setRole: (role) => set((s) => ({ account: { ...s.account, role } })),
      markCreateIntroSeen: () => set((s) => ({ onboarding: { ...s.onboarding, seenCreateIntro: true } })),
      setAllowAiPhotoUpload: (allowAiPhotoUpload) => set((s) => ({ privacy: { ...s.privacy, allowAiPhotoUpload } })),
      setLocale: (locale) => set((s) => ({ account: { ...s.account, locale } })),
    }),
    { name: 'bodydraft.settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
