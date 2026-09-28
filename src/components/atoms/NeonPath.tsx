import { G, Path } from 'react-native-svg';

import { glow, neonLightCore, neonLightHaloColor, useTheme, type GlowTone } from '../../theme';

/**
 * Trazo de "tubo de neon": nucleo solido + halo difuminado (capas de
 * distinto ancho/opacidad). Oscuro = receta original (`glow[tone]`);
 * claro = receta "Neón en claro" de la guia (nucleo oscurecido para
 * contraste, halo con el tono crudo mas brillante).
 */
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
  const { scheme } = useTheme();
  const common = { d, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

  if (scheme === 'light') {
    const halo = neonLightHaloColor(tone);
    return (
      <G transform={transform}>
        <Path {...common} stroke={halo} strokeWidth={strokeWidth + 20} strokeOpacity={0.2} />
        <Path {...common} stroke={halo} strokeWidth={strokeWidth + 11} strokeOpacity={0.35} />
        <Path {...common} stroke={halo} strokeWidth={strokeWidth + 5} strokeOpacity={0.55} />
        <Path {...common} stroke={core ?? neonLightCore(tone)} strokeWidth={strokeWidth} />
      </G>
    );
  }

  const g = glow[tone];
  return (
    <G transform={transform}>
      <Path {...common} stroke={g.deep} strokeWidth={strokeWidth + 20} strokeOpacity={0.1} />
      <Path {...common} stroke={g.color} strokeWidth={strokeWidth + 11} strokeOpacity={0.18} />
      <Path {...common} stroke={g.color} strokeWidth={strokeWidth + 5} strokeOpacity={0.5} />
      <Path {...common} stroke={core ?? g.soft} strokeWidth={strokeWidth} />
    </G>
  );
}
