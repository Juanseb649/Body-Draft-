import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { ArtistCard } from '../../components/molecules/ArtistCard';
import { useArtistStore } from '../../controllers/useArtistStore';

/**
 * Pantalla "Tatuadores": lista de tatuadores con su especialidad y
 * portafolio; desde aqui se agenda la cita con la propuesta guardada.
 */
export default function ArtistsScreen() {
  const router = useRouter();
  const { artists, isLoading, loadArtists } = useArtistStore();

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={artists}
      keyExtractor={(a) => a.id}
      renderItem={({ item }) => (
        <ArtistCard artist={item} onPress={() => router.push(`/appointment/${item.id}`)} />
      )}
    />
  );
}
