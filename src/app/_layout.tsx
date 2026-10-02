import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image, View } from 'react-native';

import { initAuth } from '../controllers/useAuthStore';
import { fontAssets, ThemeProvider, useTheme } from '../theme';

/** Color de fondo del propio PNG del logo: evita un borde visible detras. */
const LOGO_BACKGROUND = '#171218';

// Mantiene el splash nativo (el logo de BodyDraft) hasta que las fuentes
// esten listas, para que no se vea un parpadeo en blanco al arrancar.
SplashScreen.preventAutoHideAsync().catch(() => {
  // En web/dev puede no estar montado todavia; no es critico.
});

/** Mismo logo del splash nativo, por si el tema tarda un frame mas. */
function LaunchView() {
  return (
    <View style={{ flex: 1, backgroundColor: LOGO_BACKGROUND, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={require('../../assets/logo-bodydraft.png')}
        style={{ width: 260, height: 252 }}
        resizeMode="contain"
        accessibilityLabel="Body Draft"
      />
    </View>
  );
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
        <Stack.Screen name="welcome" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(drawer)" />
        {/* Drill-down: se apilan ENCIMA del menu lateral y llevan chevron
            de volver, no boton de menu. */}
        <Stack.Screen name="artists/[id]" />
        <Stack.Screen name="appointment/new" />
        <Stack.Screen name="appointment/[artistId]" />
      </Stack>
    </>
  );
}

/** Navegador raiz: fuentes, gestos, tema y arranque del listener de auth. */
export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>{fontsLoaded ? <AppShell /> : <LaunchView />}</ThemeProvider>
    </GestureHandlerRootView>
  );
}
