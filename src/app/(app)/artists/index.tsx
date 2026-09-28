import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { ArtistCard } from '../../../components/molecules/ArtistCard';
import { useArtistStore } from '../../../controllers/useArtistStore';
import { palette, useTheme } from '../../../theme';

/**
 * Pantalla "Tatuadores": lista de tatuadores con su especialidad y
 * portafolio; desde aqui se agenda la cita con la propuesta guardada.
 */
export default function ArtistsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { artists, isLoading, loadArtists } = useArtistStore();

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={palette.fuchsia} />
      </View>
    );
  }

  return (
    <FlatList
      data={artists}
      keyExtractor={(a) => a.id}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingVertical: 12 }}
      renderItem={({ item }) => (
        <ArtistCard artist={item} onPress={() => router.push(`/appointment/${item.id}`)} />
      )}
    />
  );
}
