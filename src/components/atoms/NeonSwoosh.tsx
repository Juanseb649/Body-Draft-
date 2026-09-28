import type { StyleProp, ViewStyle } from 'react-native';
import Svg from 'react-native-svg';

import { glow, type GlowTone } from '../../theme';
import { NeonPath } from './NeonPath';

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

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`${-PAD} ${-PAD} ${boxW} ${boxH}`}
      style={style}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <NeonPath d="M10 20 C 70 10, 160 8, 230 16" tone={tone} strokeWidth={4} core={glow[tone].core} />
      {double && <NeonPath d="M40 36 C 100 30, 160 28, 210 32" tone={tone} strokeWidth={3} core={glow[tone].core} />}
    </Svg>
  );
}
