import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '../controllers/useSettingsStore';
import { darkColors, lightColors, type ThemeColors } from './colors';

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
 * seguir la preferencia del SO; si no, se usa el valor explicito.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.appearance.theme);

  const resolvedSystemScheme: Scheme = systemScheme === 'light' ? 'light' : 'dark';
  const scheme: Scheme = themePreference === 'system' ? resolvedSystemScheme : themePreference;

  const value = useMemo<ThemeContextValue>(
    () => ({ scheme, colors: scheme === 'dark' ? darkColors : lightColors }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() debe usarse dentro de <ThemeProvider>.');
  return ctx;
}
