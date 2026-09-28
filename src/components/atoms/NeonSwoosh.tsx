import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg from 'react-native-svg';

import type { GlowTone } from '../../theme';
import { NeonPath } from './NeonPath';
import { useNeonFlicker } from './useNeonFlicker';

const PAD = 16;
const VIEW_W = 240;
const VIEW_H = 30;

export function NeonSwoosh({
  width,
  tone = 'blue',
  double = false,
  style,
}: {
  width: number;
  tone?: GlowTone;
  double?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const boxW = VIEW_W + PAD * 2;
  const boxH = VIEW_H + (double ? 16 : 0) + PAD * 2;
  const height = (width * boxH) / boxW;
  const flicker = useNeonFlicker();

  return (
    <Animated.View style={[style, flicker]}>
      <Svg
        width={width}
        height={height}
        viewBox={`${-PAD} ${-PAD} ${boxW} ${boxH}`}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <NeonPath d="M10 20 C 70 10, 160 8, 230 16" tone={tone} strokeWidth={4} />
        {double && <NeonPath d="M40 36 C 100 30, 160 28, 210 32" tone={tone} strokeWidth={3} />}
      </Svg>
    </Animated.View>
  );
}
