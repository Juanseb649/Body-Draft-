import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { glow, type GlowTone } from '../../theme';

const HALO_RADII = [22, 10, 4];

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
  const g = glow[tone];

  return (
    <View style={containerStyle}>
      {HALO_RADII.map((radius, i) => (
        <Text
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
          ]}
        >
          {children}
        </Text>
      ))}
      <Text accessibilityRole={accessibilityRole} style={[style, styles.core, { color: g.core }]}>
        {children}
      </Text>
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
