import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './colors';

export type Scheme = 'light' | 'dark';

const STORAGE_KEY = 'bodydraft.themeScheme';

interface ThemeContextValue {
  scheme: Scheme;
  colors: ThemeColors;
  toggleTheme: () => void;
  setScheme: (scheme: Scheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Interruptor real claro/oscuro: arranca con la preferencia del sistema,
 * la persiste en AsyncStorage y la expone via `useTheme()`. Todo
 * componente que necesite colores debe usar este hook en vez de
 * importar `colors` de forma estatica (ver theme/colors.ts).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [scheme, setSchemeState] = useState<Scheme>(systemScheme === 'light' ? 'light' : 'dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setSchemeState(saved);
    });
  }, []);

  const setScheme = useCallback((next: Scheme) => {
    setSchemeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleTheme = useCallback(
    () => setScheme(scheme === 'dark' ? 'light' : 'dark'),
    [scheme, setScheme],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ scheme, colors: scheme === 'dark' ? darkColors : lightColors, toggleTheme, setScheme }),
    [scheme, toggleTheme, setScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() debe usarse dentro de <ThemeProvider>.');
  return ctx;
}
