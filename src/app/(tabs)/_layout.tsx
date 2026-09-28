import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { useAuthStore } from '../../controllers/useAuthStore';
import { useTheme } from '../../theme';

/**
 * Area autenticada. Sin barra de pestanas: la navegacion entre secciones
 * pasa por el dashboard ("Inicio", `index.tsx`), que lista cada seccion
 * con su icono y su nombre — no un menu inferior (ver ARCHITECTURE.md,
 * "Navegacion"). Si no hay sesion, redirige a Bienvenida.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const { session, isInitialized } = useAuthStore();

  if (!isInitialized) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  if (!session) return <Redirect href="/welcome" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="disena" />
      <Stack.Screen name="agenda" />
      <Stack.Screen name="ajustes" />
    </Stack>
  );
}
