import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Artist } from '../../models/artist';
import { colors, fonts, glow, palette, type as typo } from '../../theme';

/** Molecula: fila de tatuador en la pantalla "Tatuadores". */
export function ArtistCard({ artist, onPress }: { artist: Artist; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarLabel}>{artist.name.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{artist.name}</Text>
        <Text style={styles.specialty}>{artist.specialty}</Text>
      </View>
      {artist.rating != null && <Text style={styles.rating}>★ {artist.rating}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 12,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { borderColor: palette.fuchsia, boxShadow: `0 0 16px ${palette.fuchsia}55` },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: glow.fuchsia.core,
    boxShadow: `0 0 10px ${palette.fuchsia}, inset 0 0 8px ${palette.fuchsia}99`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { fontFamily: fonts.logo, fontSize: 30, lineHeight: 36, color: glow.fuchsia.core },
  info: { flex: 1 },
  name: { ...typo.bodyStrong, color: colors.textStrong },
  specialty: { ...typo.caption, color: colors.textMuted },
  rating: { fontFamily: fonts.bodySemiBold, color: palette.amber },
});
