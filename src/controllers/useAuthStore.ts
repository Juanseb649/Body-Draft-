import { AppState } from 'react-native';
import { create } from 'zustand';

import { authService } from '../core/services';
import { supabase } from '../services/supabaseClient';
import type { Session, User } from '../services/authService';
import { useSettingsStore } from './useSettingsStore';

interface AuthState {
  session: Session | null;
  user: User | null;
  /** false hasta la primera vez que se conoce el estado real de la sesion. */
  isInitialized: boolean;
  isLoading: boolean;
  error?: string;

  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Publica el rol en `profiles` (Supabase) — sin esto, "Soy tatuador"
   * en Ajustes es solo una preferencia local que nadie mas puede ver. */
  updateRole: (role: 'client' | 'artist') => Promise<boolean>;
}

let unsubscribe: (() => void) | null = null;

/**
 * Controller de autenticacion: sesion actual + acciones de
 * registro/login/logout. Se suscribe una sola vez (ver `initAuth()`,
 * llamado desde el layout raiz) a los cambios de sesion de Supabase
 * para que toda la app reaccione automaticamente a login/logout.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isInitialized: false,
  isLoading: false,
  error: undefined,

  signUp: async (email, password, name) => {
    set({ isLoading: true, error: undefined });
    try {
      const { session } = await authService.signUp(email, password, name);
      set({ session, user: session?.user ?? null, isLoading: false });
      return true;
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: undefined });
    try {
      const { session } = await authService.signIn(email, password);
      set({ session, user: session.user, isLoading: false });
      return true;
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  signOut: async () => {
    await authService.signOut();
    set({ session: null, user: null });
  },

  updateRole: async (role) => {
    const userId = get().user?.id;
    if (!userId) return false;
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) {
      set({ error: error.message });
      return false;
    }
    return true;
  },
}));

/**
 * Arranca la escucha de sesion + el auto-refresh de token segun el
 * estado de la app (foreground/background). Se llama una unica vez
 * desde `app/_layout.tsx`.
 */
export function initAuth(): void {
  if (unsubscribe) return;

  unsubscribe = authService.onAuthStateChange((session) => {
    useAuthStore.setState({ session, user: session?.user ?? null, isInitialized: true });

    // `profiles.role` (Supabase) es la fuente de verdad del rol — se
    // sincroniza al ajuste local para que "Soy tatuador" en Ajustes
    // refleje la cuenta real, no solo lo que se toco en este dispositivo.
    if (session?.user) {
      supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.role === 'artist' || data?.role === 'client') {
            useSettingsStore.getState().setRole(data.role);
          }
        });
    }
  });

  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
