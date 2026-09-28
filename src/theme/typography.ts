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

export const type = {
  logoHero: { fontFamily: fonts.logo, fontSize: 112, lineHeight: 112, includeFontPadding: false },
  logoSection: { fontFamily: fonts.logo, fontSize: 88, lineHeight: 96, includeFontPadding: false },
  logoHeader: { fontFamily: fonts.logo, fontSize: 40, lineHeight: 48, includeFontPadding: false },
  logoInline: { fontFamily: fonts.logo, fontSize: 32, lineHeight: 40, includeFontPadding: false },
  tagline: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 5, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24 },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 17 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;
