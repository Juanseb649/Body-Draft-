import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '../../controllers/useAuthStore';
import { useTheme } from '../../theme';

/** Stack de login/registro. Si ya hay sesion, va directo a la app. */
export default function AuthLayout() {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);

  if (session) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
