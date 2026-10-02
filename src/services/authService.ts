import type { Session, User } from '@supabase/supabase-js';

import { supabase } from './supabaseClient';

/**
 * Puerto hacia el backend de autenticacion (Supabase Auth). Los
 * Controllers (useAuthStore) nunca llaman a Supabase directamente:
 * pasan siempre por esta interfaz para que el proveedor pueda
 * cambiarse sin tocar la capa de presentacion.
 */
/** Lo que se elige al crear la cuenta, ademas de email y contrasena. */
export interface SignUpProfile {
  name: string;
  role: 'client' | 'artist';
  /** Solo para tatuadores; en un cliente el trigger lo ignora. */
  specialty?: string;
}

export interface AuthService {
  signUp(email: string, password: string, profile: SignUpProfile): Promise<{ session: Session | null }>;
  signIn(email: string, password: string): Promise<{ session: Session }>;
  signOut(): Promise<void>;
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}

export class SupabaseAuthService implements AuthService {
  async signUp(email: string, password: string, profile: SignUpProfile): Promise<{ session: Session | null }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Esto acaba en `auth.users.raw_user_meta_data`, que es de donde
      // el trigger `handle_new_user()` saca el rol y la especialidad
      // para crear la fila de `profiles` (ver supabase/migrations/,
      // 20261002120000_role_from_signup.sql). Viaja en el mismo INSERT
      // del registro, asi que no hace falta sesion: funciona igual
      // aunque el proyecto exija confirmar el correo antes de darla.
      options: { data: { name: profile.name, role: profile.role, specialty: profile.specialty } },
    });
    if (error) throw error;
    // Si el proyecto de Supabase pide confirmacion por correo, `session`
    // viene null hasta que el usuario confirma el email.
    return { session: data.session };
  }

  async signIn(email: string, password: string): Promise<{ session: Session }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { session: data.session };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  }
}

export type { Session, User };
