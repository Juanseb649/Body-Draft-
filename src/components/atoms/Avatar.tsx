import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { centeredViewBox, initialOf } from '../../models/avatar';
import { flatToneColor, fonts, neonLightCore, neonLightHaloColor, useTheme, type GlowTone } from '../../theme';
import { INITIAL_GLYPHS } from '../molecules/logoGlyphs.generated';

/**
 * Avatar de una persona (cliente o tatuador): su foto de perfil, o si
 * no tiene, su inicial en la letra del logo, dentro de un aro de neon.
 *
 * La inicial se dibuja con el TRAZADO de la letra (ver
 * tools/build-logo-paths.mjs) y se centra por la caja real de su tinta:
 * centrar un <Text> en cursiva dejaba cada letra en otro sitio (la "B"
 * corrida, la "J" colgando), y en iOS ademas la recortaba.
 */
export function Avatar({
  name,
  imageUrl,
  size = 48,
  tone = 'fuchsia',
  shape = 'circle',
}: {
  name: string | null | undefined;
  imageUrl?: string | null;
  size?: number;
  tone?: GlowTone;
  /** `rounded` (cuadrado redondeado) para los comentarios. */
  shape?: 'circle' | 'rounded';
}) {
  const { scheme } = useTheme();
  // Si la foto no carga (URL vieja, sin red), se vuelve a las iniciales
  // en vez de dejar un hueco.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;

  const radius = shape === 'circle' ? size / 2 : size * 0.3;
  const ring = Math.max(1.5, size * 0.04);
  const color = scheme === 'light' ? neonLightCore(tone) : flatToneColor('dark', tone);
  const glow = scheme === 'light' ? { boxShadow: `0 0 ${Math.round(size * 0.2)}px ${neonLightHaloColor(tone, 0.5)}` } : null;
  const initial = initialOf(name);
  const glyph = INITIAL_GLYPHS[initial];

  return (
    <View
      style={[styles.base, { width: size, height: size, borderRadius: radius, borderWidth: ring, borderColor: color }, glow]}
      accessibilityRole="image"
      accessibilityLabel={name ? `Foto de ${name}` : 'Sin foto'}
    >
      {showImage ? (
        <Image
          source={{ uri: imageUrl! }}
          style={{ width: size - ring * 2, height: size - ring * 2, borderRadius: radius - ring }}
          onError={() => setFailedUrl(imageUrl ?? null)}
          accessibilityIgnoresInvertColors
        />
      ) : glyph ? (
        <InitialGlyph d={glyph.d} box={glyph.box} size={size - ring * 2} color={color} />
      ) : (
        // Sin trazado (un signo, una letra de otro alfabeto): texto
        // centrado con alto de linea igual al avatar.
        <Text
          style={{
            fontFamily: fonts.bodyBold,
            fontSize: size * 0.42,
            lineHeight: size - ring * 2,
            color,
            textAlign: 'center',
            includeFontPadding: false,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

function InitialGlyph({
  d,
  box,
  size,
  color,
}: {
  d: string;
  box: { x1: number; y1: number; x2: number; y2: number };
  size: number;
  color: string;
}) {
  const v = centeredViewBox(box, 0.6);
  // La cursiva es de trazo fino: en un avatar chico se perdia. Un
  // contorno del mismo color la engruesa un poco, mas cuanto mas chico.
  const stroke = (v.size / size) * Math.max(0.6, 1.6 - size / 80);
  return (
    <Svg width={size} height={size} viewBox={`${v.x} ${v.y} ${v.size} ${v.size}`} aria-hidden>
      <Path d={d} fill={color} stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  // Sin overflow hidden: en iOS cortaria el halo de neon. La foto ya
  // lleva su propio radio.
  base: { alignItems: 'center', justifyContent: 'center' },
});
