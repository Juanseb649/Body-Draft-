import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { glow, neonLightCore, neonLightHaloColor, useTheme, type GlowTone } from '../../theme';
import { useNeonFlicker } from './useNeonFlicker';

/** Radios de la guia ("Receta del neón", solo oscuro): 3 copias con textShadowRadius 22/10/4. */
const DARK_HALO_RADII = [22, 10, 4];
/** Radios/opacidad de la guia ("Neón en claro: 3 capas"): 6/16/30 px @ .55/.35/.2. */
const LIGHT_HALO = [
  { radius: 30, alpha: 0.2 },
  { radius: 16, alpha: 0.35 },
  { radius: 6, alpha: 0.55 },
];

/** Texto de "logo": nucleo + halo difuminado, distinto por tema (ver NeonPath). */
export function NeonText({
  children,
  tone = 'fuchsia',
  style,
  containerStyle,
  accessibilityRole,
}: {
  children: ReactNode;
  tone?: GlowTone;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityRole?: 'header' | 'text';
}) {
  const { scheme } = useTheme();
  const flicker = useNeonFlicker();

  if (scheme === 'light') {
    const core = neonLightCore(tone);
    return (
      <View style={containerStyle}>
        {LIGHT_HALO.map(({ radius, alpha }) => {
          const color = neonLightHaloColor(tone, alpha);
          return (
            <Animated.Text
              key={radius}
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[style, styles.halo, { color, textShadowColor: color, textShadowRadius: radius }, flicker]}
            >
              {children}
            </Animated.Text>
          );
        })}
        <Animated.Text accessibilityRole={accessibilityRole} style={[style, { color: core }, flicker]}>
          {children}
        </Animated.Text>
      </View>
    );
  }

  const g = glow[tone];
  return (
    <View style={containerStyle}>
      {DARK_HALO_RADII.map((radius, i) => (
        <Animated.Text
          key={radius}
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            style,
            styles.halo,
            {
              color: i === 0 ? g.deep : g.color,
              textShadowColor: i === 0 ? g.deep : g.color,
              textShadowRadius: radius,
            },
            flicker,
          ]}
        >
          {children}
        </Animated.Text>
      ))}
      <Animated.Text accessibilityRole={accessibilityRole} style={[style, styles.core, { color: g.core }, flicker]}>
        {children}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textShadowOffset: { width: 0, height: 0 },
  },
  core: {
    textShadowColor: '#FFFFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
});
