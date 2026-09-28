export const palette = {
  fuchsia: '#FF2BD6',
  fuchsiaDeep: '#C4009E',
  fuchsiaCore: '#FFE6FA',
  fuchsiaSoft: '#FF9BEB',
  fuchsiaLight: '#FF7BE6',
  onFuchsia: '#1A0016',

  blue: '#22D3FF',
  blueDeep: '#0A7CFF',
  blueCore: '#E3FAFF',
  blueSoft: '#9BEBFF',
  blueLight: '#BFEFFF',
  onBlue: '#00202A',

  amber: '#FFD23F',
  amberDeep: '#FFB800',
  amberCore: '#FFF6D6',
  amberSoft: '#FFE58A',
  onAmber: '#2A2000',

  night: '#140B1F',
  wall: '#120A1C',
  ink: '#0F0818',
  void: '#0B0612',

  white: '#FFFFFF',
  text: '#EDE6F2',
  textMuted: '#C9BFD3',
  border: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.2)',
  danger: '#FF6B8A',
} as const;

export const darkColors = {
  background: palette.wall,
  surface: palette.night,
  surfaceRaised: '#1C1129',
  header: palette.ink,
  text: palette.text,
  textMuted: palette.textMuted,
  textStrong: palette.white,
  border: palette.border,
  borderStrong: palette.borderStrong,
  primary: palette.fuchsia,
  secondary: palette.blue,
  accent: palette.amber,
  danger: palette.danger,
} as const;

export const lightColors = {
  background: '#FAF7FC',
  surface: '#FFFFFF',
  surfaceRaised: '#F1E9F7',
  header: '#FFFFFF',
  text: '#2B1E35',
  textMuted: '#6B5E75',
  textStrong: '#150B1D',
  border: 'rgba(20,11,31,0.10)',
  borderStrong: 'rgba(20,11,31,0.18)',
  primary: palette.fuchsiaDeep,
  secondary: palette.blueDeep,
  accent: palette.amberDeep,
  danger: '#D6335A',
} as const;

export type ThemeColors = { [K in keyof typeof darkColors]: string };

/** @deprecated usa `useTheme().colors` en vez de este import estatico. */
export const colors = darkColors;

export type GlowTone = 'fuchsia' | 'blue' | 'amber';

export const glow: Record<GlowTone, { core: string; soft: string; color: string; deep: string }> = {
  fuchsia: { core: palette.fuchsiaCore, soft: palette.fuchsiaSoft, color: palette.fuchsia, deep: palette.fuchsiaDeep },
  blue: { core: palette.blueCore, soft: palette.blueSoft, color: palette.blue, deep: palette.blueDeep },
  amber: { core: palette.amberCore, soft: palette.amberSoft, color: palette.amber, deep: palette.amberDeep },
};
