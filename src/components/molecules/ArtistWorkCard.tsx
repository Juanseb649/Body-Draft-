import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ArtistFeedItem } from '../../core/services';
import { fonts, type as typo, useTheme } from '../../theme';

/**
 * Tarjeta del feed de Inicio: un trabajo publicado por un tatuador.
 * Al tocarla se abre el perfil de ese artista, que es donde esta el
 * boton de agendar.
 */
export function ArtistWorkCard({ item, onPress }: { item: ArtistFeedItem; onPress?: () => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.design.title}, por ${item.artistName}`}
      style={({ pressed }) => [styles.card, pressed && { borderColor: colors.secondary }]}
    >
      <Image source={{ uri: item.design.imageUrl }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.design.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          por {item.artistName}
        </Text>
        {item.design.style && <Text style={styles.style}>{item.design.style}</Text>}
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
    body: { padding: 10, gap: 1 },
    title: { ...typo.bodyStrong, fontSize: 14, color: colors.textStrong },
    artist: { ...typo.caption, color: colors.textMuted },
    style: { ...typo.caption, fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.accent, marginTop: 2 },
  });
}
