import { G, Path } from 'react-native-svg';

import { glow, type GlowTone } from '../../theme';

export function NeonPath({
  d,
  tone,
  strokeWidth = 5,
  core,
  transform,
}: {
  d: string;
  tone: GlowTone;
  strokeWidth?: number;
  core?: string;
  transform?: string;
}) {
  const g = glow[tone];
  const common = { d, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

  return (
    <G transform={transform}>
      <Path {...common} stroke={g.deep} strokeWidth={strokeWidth + 20} strokeOpacity={0.1} />
      <Path {...common} stroke={g.color} strokeWidth={strokeWidth + 11} strokeOpacity={0.18} />
      <Path {...common} stroke={g.color} strokeWidth={strokeWidth + 5} strokeOpacity={0.5} />
      <Path {...common} stroke={core ?? g.soft} strokeWidth={strokeWidth} />
    </G>
  );
}
