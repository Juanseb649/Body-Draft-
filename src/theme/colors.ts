/** Tonos crudos de marca (tubos de neon, solo para el halo en modo claro). */
export const palette = {
  fuchsia: '#FF2BD6',
  fuchsiaDeep: '#C4009E',
  fuchsiaCore: '#FFE6FA',
  fuchsiaSoft: '#FF9BEB',
  onFuchsia: '#1A0016',

  blue: '#22D3FF',
  blueDeep: '#0A7CFF',
  blueCore: '#E3FAFF',
  blueSoft: '#9BEBFF',
  onBlue: '#00202A',

  amber: '#FFD23F',
  amberDeep: '#FFB800',
  amberCore: '#FFF6D6',
  amberSoft: '#FFE58A',
  onAmber: '#2A2000',

  white: '#FFFFFF',
} as const;

/**
 * Tokens de color (src/theme/colors.ts en la guia de diseno, "Tokens de
 * color"). Mismo nombre en ambos temas; el resto del codigo solo debe
 * leer `useTheme().colors.token`, nunca un hex suelto.
 *
 * Oscuro: "sin neon" — negro calido (no negro puro, evita halo en OLED),
 * profundidad por 4 niveles de superficie (sunken < background < surface
 * < surfaceRaised), colores de marca planos, sombras solo negras.
 * Claro: mantiene el neon (ver `neonLightCore`/`neonLightHaloColor` y
 * "Neón en claro: 3 capas" en NeonText/NeonPath).
 */
export const darkColors = {
  background: '#131015',
  surface: '#1C1820',
  surfaceSunken: '#0E0C10',
  surfaceRaised: '#26212B',
  border: '#2F2935',
  textStrong: '#FFFFFF',
  text: '#EFEAF2',
  textMuted: '#A99FB0',
  placeholder: '#7E7486',
  primary: '#D42A40',
  primaryPressed: '#B21F33',
  primaryText: '#FF6B7D',
  onPrimary: '#FFFFFF',
  primaryTint: '#3A1820',
  secondary: '#5BC0EB',
  secondaryTint: '#1F3A48',
  selection: '#1F6F94',
  accent: '#F2B84B',
  success: '#4CC38A',
  danger: '#F28B82',
} as const;

export const lightColors = {
  background: '#FBF7F4',
  surface: '#FFFFFF',
  surfaceSunken: '#F3ECF0',
  surfaceRaised: '#F3ECF0',
  border: '#E6DCE3',
  textStrong: '#1C1424',
  text: '#1C1424',
  textMuted: '#6B5E74',
  placeholder: '#8A7D93',
  primary: '#C8102E',
  primaryPressed: '#A30D25',
  primaryText: '#C8102E',
  onPrimary: '#FFFFFF',
  primaryTint: '#FDE8EB',
  secondary: '#0A6C96',
  secondaryTint: '#DDF6FF',
  selection: '#0A6C96',
  accent: '#8A5A00',
  success: '#0B7A53',
  danger: '#8E1B2C',
} as const;

export type ThemeColors = { [K in keyof typeof darkColors]: string };

/** @deprecated usa `useTheme().colors` en vez de este import estatico. */
export const colors = darkColors;

export type GlowTone = 'fuchsia' | 'blue' | 'amber';

/** Tonos del tubo de neon (solo usados en modo claro). */
export const glow: Record<GlowTone, { core: string; soft: string; color: string; deep: string }> = {
  fuchsia: { core: palette.fuchsiaCore, soft: palette.fuchsiaSoft, color: palette.fuchsia, deep: palette.fuchsiaDeep },
  blue: { core: palette.blueCore, soft: palette.blueSoft, color: palette.blue, deep: palette.blueDeep },
  amber: { core: palette.amberCore, soft: palette.amberSoft, color: palette.amber, deep: palette.amberDeep },
};

/**
 * Color solido plano de un tono por tema — reemplaza al halo en oscuro
 * ("sin neon": colores de marca planos) y es el nucleo del tubo en claro.
 */
export function flatToneColor(scheme: 'light' | 'dark', tone: GlowTone): string {
  const c = scheme === 'dark' ? darkColors : lightColors;
  if (tone === 'fuchsia') return c.primaryText;
  if (tone === 'blue') return c.secondary;
  return c.accent;
}

/**
 * "Neón en claro" (guia, "Tokens de color"): en modo claro el nucleo del
 * logo/icono es el tono ya oscurecido para contraste y el halo usa el
 * tono crudo original (mas brillante) en baja opacidad. `fuchsia` usa el
 * rojo explicito de la guia (rgb 255,45,85); `blue`/`amber` reusan su
 * propio tono crudo de `palette` como halo, por simetria con el mismo
 * criterio.
 */
const LIGHT_HALO_RGB: Record<GlowTone, string> = {
  fuchsia: '255,45,85',
  blue: '34,211,255',
  amber: '255,210,63',
};

/** Nucleo solido de un "logo" en modo claro (mismo valor que `lightColors`). */
export function neonLightCore(tone: GlowTone): string {
  return flatToneColor('light', tone);
}

/** Color de halo (mas brillante que el nucleo) en modo claro, como rgb()/rgba(). */
export function neonLightHaloColor(tone: GlowTone, alpha = 1): string {
  return alpha >= 1 ? `rgb(${LIGHT_HALO_RGB[tone]})` : `rgba(${LIGHT_HALO_RGB[tone]},${alpha})`;
}
