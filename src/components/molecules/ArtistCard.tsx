import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Artist } from '../../models/artist';
import { flatToneColor, fonts, neonLightHaloColor, type as typo, useTheme, type GlowTone } from '../../theme';
import { AppButton } from '../atoms/AppButton';
import { Avatar } from '../atoms/Avatar';

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
  const { colors, scheme } = useTheme();
  const isLight = scheme === 'light';
  const core = flatToneColor(scheme, tone);
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) =>
        isLight
          ? [styles.row, pressed && { borderColor: core, boxShadow: `0 0 16px ${neonLightHaloColor(tone, 0.35)}` }]
          : [styles.row, pressed && { borderColor: core }]
      }
    >
      <Avatar name={artist.name} imageUrl={artist.avatarUrl} size={48} tone={tone} />
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
    info: { flex: 1, gap: 1 },
    name: { ...typo.bodyStrong, color: colors.textStrong },
    specialty: { ...typo.caption, color: colors.textMuted },
    rating: { ...typo.caption, fontFamily: fonts.bodySemiBold, color: colors.accent },
  });
}
