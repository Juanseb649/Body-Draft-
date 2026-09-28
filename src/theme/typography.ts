import type { TextStyle } from 'react-native';

export const fontAssets = {
  Sacramento: require('../../assets/fonts/Sacramento-Regular.ttf'),
  TiltNeon: require('../../assets/fonts/TiltNeon-Regular.ttf'),
  'Manrope-Regular': require('../../assets/fonts/Manrope-Regular.ttf'),
  'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
  'Manrope-Bold': require('../../assets/fonts/Manrope-Bold.ttf'),
};

export const fonts = {
  logo: 'Sacramento',
  display: 'TiltNeon',
  body: 'Manrope-Regular',
  bodySemiBold: 'Manrope-SemiBold',
  bodyBold: 'Manrope-Bold',
} as const;

/**
 * Escala tipografica de la guia de diseno (src/theme/typography.ts). Los
 * `lineHeight` de los tokens `logo*` se ampliaron respecto al valor
 * original de la guia: la fuente cursiva ("Sacramento") tiene ascendentes
 * y bucles altos que un line-height mas ajustado que el fontSize recorta
 * (se veia como un logo "mal cortado"). No se quito `includeFontPadding`
 * porque en Android ese padding extra es justo lo que evita el recorte.
 */
export const type = {
  logoHero: { fontFamily: fonts.logo, fontSize: 104, lineHeight: 104 * 1.3 },
  logoSection: { fontFamily: fonts.logo, fontSize: 60, lineHeight: 60 * 1.3 },
  logoInline: { fontFamily: fonts.logo, fontSize: 44, lineHeight: 44 * 1.3 },
  logoTile: { fontFamily: fonts.logo, fontSize: 30, lineHeight: 30 * 1.3 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24 },
  tagline: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.34 * 14, textTransform: 'uppercase' },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 17 },
  buttonMedium: { fontFamily: fonts.bodySemiBold, fontSize: 15 },
  buttonSmall: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.08 * 13, textTransform: 'uppercase' },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  tab: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
  tabActive: { fontFamily: fonts.bodyBold, fontSize: 11 },
} satisfies Record<string, TextStyle>;
