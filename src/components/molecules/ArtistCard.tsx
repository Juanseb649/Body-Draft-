import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Artist } from '../../models/artist';
import { fonts, glow, type as typo, useTheme, type GlowTone } from '../../theme';
import { AppButton } from '../atoms/AppButton';

/** Molecula: fila de tatuador en la pantalla "Artistas". */
export function ArtistCard({
  artist,
  tone = 'fuchsia',
  onPress,
  onAgendarPress,
}: {
  artist: Artist;
  tone?: GlowTone;
  onPress?: () => void;
  onAgendarPress?: () => void;
}) {
  const { colors } = useTheme();
  const g = glow[tone];
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { borderColor: g.color, boxShadow: `0 0 16px ${g.color}55` }]}
    >
      <View style={[styles.avatar, { borderColor: g.core, boxShadow: `0 0 10px ${g.color}, inset 0 0 8px ${g.color}99` }]}>
        <Text style={[styles.avatarLabel, { color: g.core }]}>{artist.name.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{artist.name}</Text>
        <Text style={styles.specialty}>{artist.specialty}</Text>
        {artist.rating != null && <Text style={styles.rating}>★ {artist.rating}</Text>}
      </View>
      <AppButton label="Agendar" variant="secondary" size="S" onPress={onAgendarPress ?? onPress ?? (() => {})} />
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginHorizontal: 20,
      marginVertical: 6,
      gap: 12,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLabel: { fontFamily: fonts.logo, fontSize: 30, lineHeight: 36 },
    info: { flex: 1, gap: 1 },
    name: { ...typo.bodyStrong, color: colors.textStrong },
    specialty: { ...typo.caption, color: colors.textMuted },
    rating: { ...typo.caption, fontFamily: fonts.bodySemiBold, color: colors.accent },
  });
}
