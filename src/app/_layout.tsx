import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';

import { initAuth } from '../controllers/useAuthStore';
import { fontAssets, ThemeProvider, useTheme } from '../theme';

/** Fondo solido con el color del tema mientras cargan las fuentes. */
function SplashView() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}

/** Envuelve la app real una vez que el tema esta listo, para poder
 * leer `colors` del tema en el fondo de la pantalla de carga. */
function AppShell() {
  const { colors, scheme } = useTheme();

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}

/** Navegador raiz: fuentes, gestos (requeridos por el Drawer), tema y auth. */
export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>{fontsLoaded ? <AppShell /> : <SplashView />}</ThemeProvider>
    </GestureHandlerRootView>
  );
}
