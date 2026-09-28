import { Path } from 'react-native-svg';

import { logoToneColor, useTheme, type GlowTone } from '../../theme';

/** Trazo solido y plano (sin difuminado) de un tono de marca. */
export function NeonPath({
  d,
  tone,
  strokeWidth = 5,
  transform,
}: {
  d: string;
  tone: GlowTone;
  strokeWidth?: number;
  transform?: string;
}) {
  const { scheme } = useTheme();
  const color = logoToneColor(scheme, tone);

  return (
    <Path
      d={d}
      transform={transform}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  );
}
