import { Stack } from 'expo-router';

/** Navegador raiz (equivalente al GoRouter/MaterialApp de la version Flutter). */
export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#6750A4' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'BodyDraft' }} />
      <Stack.Screen name="design/create" options={{ title: 'Crear diseno' }} />
      <Stack.Screen name="editor/index" options={{ title: 'Ajustar tatuaje' }} />
      <Stack.Screen name="model3d/index" options={{ title: 'Vista en maniquin 3D' }} />
      <Stack.Screen name="artists/index" options={{ title: 'Tatuadores' }} />
      <Stack.Screen name="appointment/[artistId]" options={{ title: 'Agendar cita' }} />
      <Stack.Screen name="appointment/mine" options={{ title: 'Mis citas' }} />
    </Stack>
  );
}
