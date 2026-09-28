import { AppState } from 'react-native';
import { create } from 'zustand';

import { authService } from '../core/services';
import { supabase } from '../services/supabaseClient';
import type { Session, User } from '../services/authService';

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
}

let unsubscribe: (() => void) | null = null;

/**
 * Controller de autenticacion: sesion actual + acciones de
 * registro/login/logout. Se suscribe una sola vez (ver `initAuth()`,
 * llamado desde el layout raiz) a los cambios de sesion de Supabase
 * para que toda la app reaccione automaticamente a login/logout.
 */
export const useAuthStore = create<AuthState>((set) => ({
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
  });

  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
