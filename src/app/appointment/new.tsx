import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtistCard } from '../../components/molecules/ArtistCard';
import { useArtistStore } from '../../controllers/useArtistStore';
import type { GlowTone } from '../../theme';
import { type as typo, useTheme } from '../../theme';

const TONES: GlowTone[] = ['fuchsia', 'blue', 'amber'];

/**
 * "Nueva cita": primer paso de agendar desde la Agenda, donde todavia no
 * hay un tatuador elegido. Al elegir uno continua al calendario de
 * siempre (`appointment/[artistId]`), que es quien confirma la cita.
 */
export default function NewAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { artists, isLoading, error, loadArtists } = useArtistStore();

  const styles = createStyles(colors);

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

  const pick = (artistId: string) => router.push(`/appointment/${artistId}`);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={8} accessibilityLabel="Volver">
          <Text style={[typo.title, { color: colors.textStrong }]}>‹</Text>
        </Pressable>
        <Text style={[typo.logoSection, { color: colors.textStrong, fontSize: 30, lineHeight: 30 * 1.3 }]}>
          Nueva cita
        </Text>
        <View style={styles.iconButton} />
      </View>

      <Text style={[typo.label, { color: colors.textMuted, paddingHorizontal: 20, marginBottom: 4 }]}>
        Elige un tatuador
      </Text>
      {error && <Text style={[typo.caption, { color: colors.danger, paddingHorizontal: 20 }]}>{error}</Text>}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={artists}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <Text style={[typo.body, { color: colors.textMuted, marginHorizontal: 20, marginTop: 12 }]}>
              Todavía no hay tatuadores registrados. Cuando alguien active &quot;Soy tatuador&quot; en Ajustes, va a
              aparecer aquí.
            </Text>
          }
          renderItem={({ item, index }) => (
            <ArtistCard
              artist={item}
              tone={TONES[index % TONES.length]}
              onPress={() => pick(item.id)}
              onAgendarPress={() => pick(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
}
