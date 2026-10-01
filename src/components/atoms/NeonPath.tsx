import { Path } from 'react-native-svg';

import { flatToneColor, neonLightCore, neonLightHaloColor, useTheme, type GlowTone } from '../../theme';

/**
 * Trazo de "tubo de neon": claro = receta "Neón en claro" de la guia
 * (nucleo oscurecido para contraste + halo difuminado con el tono crudo
 * mas brillante). Oscuro ("sin neon"): un solo trazo plano, sin halo.
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
      <>
        <Path {...common} stroke={halo} strokeWidth={strokeWidth + 20} strokeOpacity={0.2} transform={transform} />
        <Path {...common} stroke={halo} strokeWidth={strokeWidth + 11} strokeOpacity={0.35} transform={transform} />
        <Path {...common} stroke={halo} strokeWidth={strokeWidth + 5} strokeOpacity={0.55} transform={transform} />
        <Path {...common} stroke={core ?? neonLightCore(tone)} strokeWidth={strokeWidth} transform={transform} />
      </>
    );
  }

  return <Path {...common} stroke={core ?? flatToneColor('dark', tone)} strokeWidth={strokeWidth} transform={transform} />;
}
