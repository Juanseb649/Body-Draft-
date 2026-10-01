import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '../../components/atoms/Chip';
import { ArtistCard } from '../../components/molecules/ArtistCard';
import { SectionHeader } from '../../components/molecules/SectionHeader';
import { useArtistStore } from '../../controllers/useArtistStore';
import type { GlowTone } from '../../theme';
import { type as typo, useTheme } from '../../theme';

const FILTERS = ['Cerca de ti', 'Mejor valorados', 'Estilo'];
const TONES: GlowTone[] = ['fuchsia', 'blue', 'amber'];

/** Pantalla "Artistas": buscar y filtrar tatuadores, agendar cita. */
export default function ArtistsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { artists, isLoading, loadArtists, error } = useArtistStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(FILTERS[0]);

  const styles = createStyles(colors);

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

  const visible = artists.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 16 }}
      data={visible}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <SectionHeader section="artistas" />
          {error && <Text style={[typo.caption, { color: colors.danger }]}>{error}</Text>}
          <TextInput
            style={styles.search}
            placeholder="Buscar por nombre o estilo"
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
          />
          <View style={styles.chipRow}>
            {FILTERS.map((f) => (
              <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} tone="fuchsia" />
            ))}
          </View>
        </View>
      }
      renderItem={({ item, index }) => (
        <ArtistCard
          artist={item}
          tone={TONES[index % TONES.length]}
          onPress={() => router.push(`/artists/${item.id}`)}
          onAgendarPress={() => router.push(`/appointment/${item.id}`)}
        />
      )}
    />
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 20, gap: 12, marginBottom: 8 },
    search: {
      ...typo.body,
      color: colors.text,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  });
}
