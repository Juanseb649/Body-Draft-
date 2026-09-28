import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useAuthStore } from '../controllers/useAuthStore';
import { useTheme } from '../theme';

/**
 * Puerta de entrada: no es una pantalla en si, decide a donde ir
 * segun si hay sesion activa. `isInitialized` evita un parpadeo hacia
 * /login mientras Supabase todavia esta resolviendo la sesion guardada.
 */
export default function Index() {
  const { colors } = useTheme();
  const { session, isInitialized } = useAuthStore();

  if (!isInitialized) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return <Redirect href={session ? '/dashboard' : '/login'} />;
}
