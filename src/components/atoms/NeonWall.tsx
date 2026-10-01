import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { palette, useTheme, type GlowTone } from '../../theme';

const TINT: Record<GlowTone, string> = {
  fuchsia: palette.fuchsia,
  blue: palette.blue,
  amber: palette.amber,
};

export function NeonWall({
  primary = 'fuchsia',
  secondary = 'blue',
  cell = 40,
}: {
  primary?: GlowTone;
  secondary?: GlowTone;
  cell?: number;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { colors, scheme } = useTheme();
  // "Modo oscuro: sin neon" (guia): sin resplandor ni retícula, solo el
  // fondo plano. En claro se mantiene la pared con retícula + resplandor.
  const isDark = scheme === 'dark';
  const gridOpacity = isDark ? 0 : 0.035;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={`glow${id}`} cx="50%" cy="40%" rx="90%" ry="45%" fx="50%" fy="40%">
            <Stop offset="0" stopColor={TINT[primary]} stopOpacity={isDark ? 0 : 0.1} />
            <Stop offset="0.55" stopColor={TINT[secondary]} stopOpacity={isDark ? 0 : 0.04} />
            <Stop offset="0.8" stopColor={TINT[secondary]} stopOpacity={0} />
          </RadialGradient>
          <Pattern id={`grid${id}`} width={cell} height={cell} patternUnits="userSpaceOnUse">
            <Path d={`M0 1 H${cell} M1 0 V${cell}`} stroke="#000000" strokeOpacity={gridOpacity} strokeWidth={2} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={colors.background} />
        <Rect width="100%" height="100%" fill={`url(#glow${id})`} />
        <Rect width="100%" height="100%" fill={`url(#grid${id})`} />
      </Svg>
    </View>
  );
}
