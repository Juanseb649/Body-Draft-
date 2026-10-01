import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useSettingsStore } from '../controllers/useSettingsStore';
import { darkColors, lightColors, type ThemeColors } from './colors';
import { duration, easing } from './motion';

export type Scheme = 'light' | 'dark';

interface ThemeContextValue {
  scheme: Scheme;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Resuelve el tema exactamente como documenta la guia de diseno
 * ("Cómo se resuelve el tema"): la preferencia (`appearance.theme`,
 * persistida en useSettingsStore) puede ser 'system', y en ese caso se
 * sigue la preferencia del SO; si no, se usa el valor explicito.
 *
 * El cambio de tema se funde en vez de saltar de golpe (guia: "El cambio
 * de tema anima fondos y textos 200 ms"). Como los colores viven en
 * StyleSheets normales y no en valores animados, el fundido se hace con
 * una capa del color de fondo ANTERIOR encima de todo, que se desvanece:
 * el efecto es un crossfade de la pantalla entera sin tener que animar
 * cada color por separado.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.appearance.theme);
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);

  const resolvedSystemScheme: Scheme = systemScheme === 'light' ? 'light' : 'dark';
  const scheme: Scheme = themePreference === 'system' ? resolvedSystemScheme : themePreference;

  const value = useMemo<ThemeContextValue>(
    () => ({ scheme, colors: scheme === 'dark' ? darkColors : lightColors }),
    [scheme],
  );

  const previousScheme = useRef(scheme);
  const [fadingFrom, setFadingFrom] = useState<Scheme | null>(null);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (previousScheme.current === scheme) return;

    const from = previousScheme.current;
    previousScheme.current = scheme;

    setFadingFrom(from);
    fade.value = 1;
    fade.value = withTiming(
      0,
      { duration: reduceMotion ? 150 : duration.base, easing: easing.standard },
      (finished) => {
        if (finished) runOnJS(setFadingFrom)(null);
      },
    );
  }, [scheme, reduceMotion, fade]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {fadingFrom && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: fadingFrom === 'dark' ? darkColors.background : lightColors.background },
            overlayStyle,
          ]}
        />
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() debe usarse dentro de <ThemeProvider>.');
  return ctx;
}
