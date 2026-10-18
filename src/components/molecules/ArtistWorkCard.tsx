import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ArtistFeedItem } from '../../core/services';
import { EMPTY_SUMMARY, formatCount, type DesignSocialSummary } from '../../models/designSocial';
import { fonts, type as typo, useTheme } from '../../theme';
import { Icon } from '../atoms/Icon';
import { LikeButton } from './LikeButton';

/**
 * Tarjeta del feed: un trabajo publicado por un tatuador.
 *
 * La foto manda (es lo que se vino a ver): va a sangre, sin borde, y
 * los contadores flotan sobre ella. Tocarla abre el detalle del
 * diseno, que es donde se comenta y se agenda; el corazon funciona
 * ahi mismo sin abrir nada.
 */
export function ArtistWorkCard({
  item,
  summary = EMPTY_SUMMARY,
  onPress,
  onToggleLike,
}: {
  item: ArtistFeedItem;
  summary?: DesignSocialSummary;
  onPress?: () => void;
  onToggleLike?: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.design.title}, por ${item.artistName}. ${summary.likeCount} me gusta, ${summary.commentCount} comentarios`}
      accessibilityHint="Abre el diseño para comentarlo o agendarlo"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.media}>
        <Image
          source={{ uri: item.design.imageUrl }}
          style={styles.image}
          accessibilityIgnoresInvertColors
        />
        {item.design.style && (
          <View style={styles.styleTag}>
            <Text style={styles.styleLabel}>{item.design.style}</Text>
          </View>
        )}
        <View style={styles.counters}>
          {onToggleLike && (
            <LikeButton compact liked={summary.likedByMe} count={summary.likeCount} onPress={onToggleLike} />
          )}
          <View style={styles.commentPill} accessibilityElementsHidden importantForAccessibility="no">
            <Icon name="comment" size={16} color="#FFFFFF" />
            <Text style={styles.commentCount}>{formatCount(summary.commentCount)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.design.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artistName}
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: { gap: 8 },
    pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
    media: { borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surfaceRaised },
    // 4:5 y no cuadrado: un tatuaje suele ser mas alto que ancho, y la
    // grilla gana ritmo frente a las tarjetas cuadradas de siempre.
    image: { width: '100%', aspectRatio: 4 / 5 },
    styleTag: {
      position: 'absolute',
      top: 10,
      left: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: 'rgba(14,12,16,0.55)',
    },
    styleLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: '#FFFFFF', letterSpacing: 0.3 },
    counters: { position: 'absolute', left: 8, right: 8, bottom: 8, flexDirection: 'row', gap: 6 },
    commentPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(14,12,16,0.55)',
    },
    commentCount: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
    body: { paddingHorizontal: 4, gap: 0 },
    title: { ...typo.bodyStrong, fontSize: 15, color: colors.textStrong, letterSpacing: -0.2 },
    artist: { ...typo.caption, color: colors.textMuted },
  });
}
