import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { SectionHeader } from '../../components/molecules/SectionHeader';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import { useProposalsStore } from '../../controllers/useProposalsStore';
import { bodyZoneLabel } from '../../models/bodyZone';
import type { TattooProposal } from '../../models/tattooProposal';
import { fonts, gridItemWidth, type as typo, useResponsive, useTheme } from '../../theme';

const GAP = 14;

/**
 * "Propuestas guardadas": lo que se guarda con "Guardar propuesta" en
 * Crea. Cada una muestra SOLO la imagen donde se aplico el tatuaje (la
 * foto o el maniqui) y la opcion de agendar con ella. Viven en el
 * telefono, como siempre: son de esta cuenta y no las ve nadie mas.
 */
export default function ProposalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const layout = useResponsive();
  const userId = useAuthStore((s) => s.user?.id);
  const { proposals, isLoading, error, load } = useProposalsStore();
  const loadProposal = useEditorStore((s) => s.loadProposal);
  const styles = createStyles(colors);

  // Al volver de Crea despues de guardar, la lista ya trae la nueva.
  useFocusEffect(
    useCallback(() => {
      if (userId) load(userId);
    }, [userId, load]),
  );

  const columns = layout.breakpoint === 'phone' ? 2 : layout.gridColumns;
  const contentWidth = Math.min(layout.width, layout.contentMaxWidth) - layout.gutter * 2;
  const cell = gridItemWidth(contentWidth, columns, GAP);

  /** Agendar con esta propuesta: se abre en el editor y se elige tatuador. */
  const book = (proposal: TattooProposal) => {
    loadProposal(proposal);
    router.push('/appointment/new');
  };

  return (
    <FlatList
      key={columns}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: layout.gutter,
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          width: '100%',
        },
      ]}
      data={proposals}
      keyExtractor={(p) => p.id}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? { gap: GAP } : undefined}
      ListHeaderComponent={
        <View style={styles.header}>
          <SectionHeader section="propuestas" />
          {error && <Text style={[typo.caption, { color: colors.danger }]}>{error}</Text>}
        </View>
      }
      ListEmptyComponent={
        isLoading ? null : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Todavía no guardaste propuestas</Text>
            <Text style={styles.emptyText}>
              En Crea, prueba un diseño sobre tu piel o en el maniquí y toca &quot;Guardar propuesta&quot;. Aparecerá aquí
              para agendarla.
            </Text>
            <AppButton label="Ir a Crea" size="M" onPress={() => router.navigate('/editor')} />
          </View>
        )
      }
      renderItem={({ item }) => (
        <View style={[styles.card, { width: cell }]}>
          {item.previewImageUrl ? (
            <Image
              source={{ uri: item.previewImageUrl }}
              style={styles.image}
              accessibilityLabel={`Propuesta en ${bodyZoneLabel(item.bodyZone).toLowerCase()}`}
            />
          ) : (
            <View style={[styles.image, styles.noImage]}>
              <Text style={styles.noImageText}>Sin imagen</Text>
            </View>
          )}
          <Pressable
            onPress={() => book(item)}
            style={({ pressed }) => [styles.book, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={`Agendar esta propuesta (${bodyZoneLabel(item.bodyZone)})`}
          >
            <Text style={[styles.bookLabel, { color: colors.onPrimary }]}>Agendar</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    content: { gap: GAP },
    header: { gap: 12, marginBottom: 8 },
    card: { gap: 10, marginBottom: GAP },
    // Solo la imagen: a sangre, sin marco, en 4:5 como el feed.
    image: { width: '100%', aspectRatio: 4 / 5, borderRadius: 22, backgroundColor: colors.surfaceRaised },
    noImage: { alignItems: 'center', justifyContent: 'center' },
    noImageText: { ...typo.caption, color: colors.textMuted },
    book: { minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    bookLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15 },
    empty: { gap: 12, paddingVertical: 32, alignItems: 'flex-start', maxWidth: 420 },
    emptyTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.textStrong },
    emptyText: { ...typo.body, fontSize: 16, lineHeight: 23, color: colors.text },
  });
}
