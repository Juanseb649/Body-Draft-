import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { artistRepository } from '../../core/services';
import type { Artist } from '../../models/artist';
import { neonLightCore, neonLightHaloColor, type as typo, useTheme } from '../../theme';

/** Perfil del artista: bio + portafolio, con acceso a agendar cita. */
export default function ArtistProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const [artist, setArtist] = useState<Artist | undefined>(undefined);

  const styles = createStyles(colors);

  useEffect(() => {
    artistRepository.getArtistById(id).then(setArtist);
  }, [id]);

  if (!artist) return <View style={[styles.center, { backgroundColor: colors.background }]} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 96 }}
      data={artist.portfolioImageUrls}
      keyExtractor={(uri) => uri}
      numColumns={2}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={8}>
            <Text style={[typo.title, { color: colors.textStrong }]}>‹</Text>
          </Pressable>

          <View
            style={[
              styles.avatar,
              scheme === 'light'
                ? { borderColor: neonLightCore('fuchsia'), boxShadow: `0 0 12px ${neonLightHaloColor('fuchsia')}` }
                : { borderColor: colors.primaryText },
            ]}
          >
            <Text style={[styles.avatarLabel, { color: scheme === 'light' ? neonLightCore('fuchsia') : colors.primaryText }]}>
              {artist.name.charAt(0)}
            </Text>
          </View>
          <Text style={[typo.title, { color: colors.textStrong, marginTop: 12 }]}>{artist.name}</Text>
          <Text style={[typo.bodyStrong, { color: colors.secondary }]}>{artist.specialty}</Text>
          {artist.location && <Text style={[typo.caption, { color: colors.textMuted }]}>{artist.location}</Text>}
          {artist.bio && <Text style={[typo.body, { color: colors.text, marginTop: 12 }]}>{artist.bio}</Text>}

          <Text style={[typo.label, { color: colors.textMuted, marginTop: 24, marginBottom: 8 }]}>Portafolio</Text>
        </View>
      }
      renderItem={({ item }) => <Image source={{ uri: item }} style={styles.portfolioImage} />}
      ListFooterComponent={
        <View style={styles.footer}>
          <AppButton label="Agendar" onPress={() => router.push(`/appointment/${artist.id}`)} />
        </View>
      }
    />
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    center: { flex: 1 },
    header: { paddingHorizontal: 20, alignItems: 'center' },
    iconButton: { alignSelf: 'flex-start', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    avatarLabel: { fontSize: 44, fontFamily: 'Sacramento' },
    row: { gap: 12, paddingHorizontal: 20 },
    portfolioImage: { flex: 1, aspectRatio: 1, borderRadius: 14, backgroundColor: colors.surfaceRaised },
    footer: { paddingHorizontal: 20, marginTop: 24 },
  });
}
