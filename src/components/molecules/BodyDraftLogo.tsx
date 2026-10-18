import { useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { NeonPath } from '../atoms/NeonPath';
import { useNeonFlicker } from '../atoms/useNeonFlicker';
import { flatToneColor, neonLightCore, neonLightHaloColor, useTheme, type GlowTone } from '../../theme';
import { LOGO_GLYPHS, LOGO_UNITS } from './logoGlyphs.generated';

/**
 * Composicion del logo en unidades de fuente (tamaño 100), copiada del
 * logo oficial (assets/logo-bodydraft.png): "Draft" debajo y corrido a
 * la derecha de "Body", y el trazo subrayando "Draft".
 */
const STACKED = {
  body: { x: 0, y: 76 },
  draft: { x: 72, y: 158 },
  swoosh: 'M76 189 C 140 182, 232 179, 314 184',
  // Caja con aire para los halos del neon en tema claro.
  viewBox: { x: -10, y: -10, width: 340, height: 230 },
};

const INLINE = {
  body: { x: 0, y: 80 },
  draft: { x: 214, y: 80 },
  viewBox: { x: -6, y: -2, width: 460, height: 136 },
};

/** Separacion minima del logo con los bordes de la pantalla. */
const EDGE = 16;

/**
 * El logo "Body Draft".
 *
 * Se dibuja con los TRAZADOS de la fuente Sacramento (generados por
 * tools/build-logo-paths.mjs), no con <Text>. Como texto, iOS
 * recortaba todo lo que la cursiva dibuja fuera de la caja de la linea
 * (la cola de la "y" y el bucle de la "f" bajan casi media letra), y en
 * el iPhone se leia "Bodu Dralt". Un trazado vectorial no tiene caja que
 * recorte: se ve entero e identico en iOS, Android y web.
 *
 * `size` es el tamaño de la letra, como antes. El apilado nunca es mas
 * ancho que la pantalla.
 */
export function BodyDraftLogo({
  size: requestedSize = 112,
  variant = 'stacked',
  style,
}: {
  size?: number;
  variant?: 'stacked' | 'inline';
  style?: StyleProp<ViewStyle>;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const { scheme } = useTheme();
  const flicker = useNeonFlicker();
  const layout = variant === 'stacked' ? STACKED : INLINE;
  const { viewBox } = layout;

  const maxSize = ((screenWidth - EDGE * 2) * LOGO_UNITS) / viewBox.width;
  const size = variant === 'stacked' ? Math.min(requestedSize, maxSize) : requestedSize;
  // Pixeles por unidad de fuente.
  const k = size / LOGO_UNITS;

  return (
    <Animated.View style={[style, flicker]} accessible accessibilityRole="header" accessibilityLabel="Body Draft">
      <Svg
        width={viewBox.width * k}
        height={viewBox.height * k}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      >
        <Word d={LOGO_GLYPHS.Body.d} at={layout.body} tone="fuchsia" scheme={scheme} />
        <Word d={LOGO_GLYPHS.Draft.d} at={layout.draft} tone="blue" scheme={scheme} />
        {variant === 'stacked' && <NeonPath d={STACKED.swoosh} tone="blue" strokeWidth={3.2} />}
      </Svg>
    </Animated.View>
  );
}

/**
 * Una palabra: relleno del color de marca. En claro, ademas, el halo del
 * tubo de neon (tres contornos translucidos, como NeonText); en oscuro
 * la guia lo quiere plano.
 */
function Word({
  d,
  at,
  tone,
  scheme,
}: {
  d: string;
  at: { x: number; y: number };
  tone: GlowTone;
  scheme: 'light' | 'dark';
}) {
  const transform = `translate(${at.x} ${at.y})`;
  if (scheme === 'dark') {
    return <Path d={d} transform={transform} fill={flatToneColor('dark', tone)} />;
  }
  return (
    <G transform={transform}>
      <Path d={d} fill="none" stroke={neonLightHaloColor(tone)} strokeOpacity={0.2} strokeWidth={9} strokeLinejoin="round" />
      <Path d={d} fill="none" stroke={neonLightHaloColor(tone)} strokeOpacity={0.35} strokeWidth={5} strokeLinejoin="round" />
      <Path d={d} fill="none" stroke={neonLightHaloColor(tone)} strokeOpacity={0.55} strokeWidth={2.4} strokeLinejoin="round" />
      <Path d={d} fill={neonLightCore(tone)} />
    </G>
  );
}
