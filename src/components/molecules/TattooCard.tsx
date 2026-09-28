import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { displayImageUrl, isArtistTemplate, type TattooDesign } from '../../models/tattooDesign';
import { colors, fonts, palette, type as typo } from '../../theme';

/**
 * Molecula: tarjeta de diseno usada en "Crear diseno", "Mis disenos" y
 * en el catalogo de plantillas de un tatuador.
 */
export function TattooCard({ design, onPress }: { design: TattooDesign; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image source={{ uri: displayImageUrl(design) }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {design.title}
        </Text>
        {isArtistTemplate(design) && <Text style={styles.badge}>Plantilla de tatuador</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { borderColor: palette.blue, boxShadow: `0 0 16px ${palette.blue}55` },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceRaised },
  body: { padding: 10 },
  title: { ...typo.bodyStrong, fontSize: 14, color: colors.textStrong },
  badge: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: palette.amber, marginTop: 2 },
});
