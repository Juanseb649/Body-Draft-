import type { ReactNode } from 'react';
import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { logoToneColor, useTheme, type GlowTone } from '../../theme';
import { useNeonFlicker } from './useNeonFlicker';

/** Texto de "logo" solido y plano (sin difuminado), con encendido/pulso. */
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
  const color = logoToneColor(scheme, tone);
  const flicker = useNeonFlicker();

  return (
    <View style={containerStyle}>
      <Animated.Text accessibilityRole={accessibilityRole} style={[style, { color }, flicker]}>
        {children}
      </Animated.Text>
    </View>
  );
}
