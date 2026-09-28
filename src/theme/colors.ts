/** Tonos crudos de marca (tubos de neon). Fijos: se ven igual en ambos temas. */
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
 * Tokens de color (src/theme/colors.ts en la guia de diseno). Mismo
 * nombre en ambos temas; el resto del codigo solo debe leer
 * `useTheme().colors.token`, nunca un hex suelto.
 */
export const darkColors = {
  background: '#120A1C',
  surface: '#1A1026',
  surfaceSunken: '#0F0818',
  border: 'rgba(255,255,255,0.12)',
  textStrong: '#FFFFFF',
  text: '#EDE6F2',
  textMuted: '#B9AEC6',
  placeholder: '#8B7E98',
  primary: '#FF2BD6',
  primaryPressed: 'rgba(255,43,214,0.18)',
  onPrimary: '#1A0016',
  primaryTint: 'rgba(255,43,214,0.18)',
  secondary: '#22D3FF',
  secondaryTint: 'rgba(34,211,255,0.14)',
  accent: '#FFD23F',
  success: '#4BE3A5',
  danger: '#FF6B8A',
} as const;

/** Valores tal cual la tabla "Tokens de color" de la guia (pagina 14). */
export const lightColors = {
  background: '#FBF7F4',
  surface: '#FFFFFF',
  surfaceSunken: '#F3ECF0',
  border: '#E6DCE3',
  textStrong: '#1C1424',
  text: '#1C1424',
  textMuted: '#6B5E74',
  placeholder: '#8A7D93',
  primary: '#C8102E',
  primaryPressed: '#A30D25',
  onPrimary: '#FFFFFF',
  primaryTint: '#FDE8EB',
  secondary: '#0A6C96',
  secondaryTint: '#DDF6FF',
  accent: '#8A5A00',
  success: '#0B7A53',
  danger: '#8E1B2C',
} as const;

export type ThemeColors = { [K in keyof typeof darkColors]: string };

/** @deprecated usa `useTheme().colors` en vez de este import estatico. */
export const colors = darkColors;

export type GlowTone = 'fuchsia' | 'blue' | 'amber';

/** Tonos del tubo de neon: core (mas claro) - soft - color - deep. */
export const glow: Record<GlowTone, { core: string; soft: string; color: string; deep: string }> = {
  fuchsia: { core: palette.fuchsiaCore, soft: palette.fuchsiaSoft, color: palette.fuchsia, deep: palette.fuchsiaDeep },
  blue: { core: palette.blueCore, soft: palette.blueSoft, color: palette.blue, deep: palette.blueDeep },
  amber: { core: palette.amberCore, soft: palette.amberSoft, color: palette.amber, deep: palette.amberDeep },
};

/**
 * "Neón en claro" (guia, pagina "Tokens de color"): en modo claro el
 * nucleo del logo/icono es el tono ya oscurecido para contraste — el
 * mismo valor que `lightColors.primary/secondary/accent` — y el halo usa
 * el tono crudo original (mas brillante) en baja opacidad. `fuchsia` usa
 * el rojo explicito de la guia (rgb 255,45,85); `blue`/`amber` reusan su
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
  if (tone === 'fuchsia') return lightColors.primary;
  if (tone === 'blue') return lightColors.secondary;
  return lightColors.accent;
}

/** Color de halo (mas brillante que el nucleo) en modo claro, como rgb()/rgba(). */
export function neonLightHaloColor(tone: GlowTone, alpha = 1): string {
  return alpha >= 1 ? `rgb(${LIGHT_HALO_RGB[tone]})` : `rgba(${LIGHT_HALO_RGB[tone]},${alpha})`;
}
