import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '../../controllers/useAuthStore';
import { useTheme } from '../../theme';

/** Stack de las pantallas sin sesion: login y registro. */
export default function AuthLayout() {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);

  // Si ya hay sesion (p. ej. el usuario volvio atras con el gesto del
  // sistema), lo mandamos directo al dashboard en vez de mostrar login.
  if (session) return <Redirect href="/dashboard" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
