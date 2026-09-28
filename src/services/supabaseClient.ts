import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

/**
 * Cliente de Supabase (backend de autenticacion). La sesion se
 * persiste en AsyncStorage para que el usuario siga logueado entre
 * aperturas de la app.
 *
 * TODO (requerido para que la app arranque): crear un proyecto gratis
 * en https://supabase.com, y copiar su Project URL y anon/publishable
 * key a un archivo `.env` en la raiz del proyecto:
 *
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=xxxx
 *
 * Sin esto, cualquier llamada de auth (signUp/signIn/signOut) fallara.
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
