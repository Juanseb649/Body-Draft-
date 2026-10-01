import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayImageUrl, isArtistTemplate, type TattooDesign } from '../../models/tattooDesign';
import { fonts, neonLightHaloColor, type as typo, useTheme } from '../../theme';

/**
 * Molecula: tarjeta de diseno usada en "Diseña" y en el catalogo de
 * plantillas de un tatuador.
 */
export function TattooCard({ design, onPress }: { design: TattooDesign; onPress?: () => void }) {
  const { colors, scheme } = useTheme();
  const styles = createStyles(colors);
  const pressedStyle =
    scheme === 'light'
      ? { borderColor: colors.secondary, boxShadow: `0 0 16px ${neonLightHaloColor('blue', 0.35)}` }
      : { borderColor: colors.secondary };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && pressedStyle]}
    >
      <Image source={{ uri: displayImageUrl(design) }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {design.title}
        </Text>
        {isArtistTemplate(design) && <Text style={styles.badge}>Plantilla de artista</Text>}
      </View>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    image: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceRaised },
    body: { padding: 10 },
    title: { ...typo.bodyStrong, fontSize: 14, color: colors.textStrong },
    badge: { ...typo.caption, fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.accent, marginTop: 2 },
  });
}
