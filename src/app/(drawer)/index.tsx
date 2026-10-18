import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { MenuButton } from '../../components/atoms/MenuButton';
import { NeonText } from '../../components/atoms/NeonText';
import { RevealOnScroll } from '../../components/atoms/RevealOnScroll';
import { ArtistWorkCard } from '../../components/molecules/ArtistWorkCard';
import { BodyDraftLogo } from '../../components/molecules/BodyDraftLogo';
import { useAuthStore } from '../../controllers/useAuthStore';
import { artistRepository } from '../../core/services';
import { useAppointmentStore } from '../../controllers/useAppointmentStore';
import { useDesignSocialStore } from '../../controllers/useDesignSocialStore';
import { useDesignStore } from '../../controllers/useDesignStore';
import { nextAppointment } from '../../models/appointment';
import { greetingFor } from '../../models/greeting';
import { gridItemWidth, type as typo, useResponsive, useTheme } from '../../theme';

const FEED_GAP = 14;

const STATUS: Record<'pending' | 'confirmed', string> = { pending: 'Pendiente', confirmed: 'Confirmada' };

/**
 * "Inicio". Ya NO lleva accesos a las secciones: para eso esta el menu
 * lateral (ver components/organisms/SidebarContent.tsx). Aqui va el
 * saludo, el CTA de crear diseno, la proxima cita y el feed con lo
 * ultimo que publicaron los tatuadores.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const name = (useAuthStore((s) => s.user?.user_metadata?.name as string | undefined)) ?? '';
  const initial = (name || '?').charAt(0).toUpperCase();
  const userId = useAuthStore((s) => s.user?.id);
  const { feed, isFeedLoading, loadFeed } = useDesignStore();
  const summaries = useDesignSocialStore((s) => s.summaries);
  const loadSummaries = useDesignSocialStore((s) => s.loadSummaries);
  const toggleLike = useDesignSocialStore((s) => s.toggleLike);
  const appointments = useAppointmentStore((s) => s.appointments);
  const loadAppointments = useAppointmentStore((s) => s.loadAppointments);
  const upcoming = nextAppointment(appointments);
  const [upcomingArtist, setUpcomingArtist] = useState<{ id: string; name: string } | null>(null);
  const layout = useResponsive();
  const contentWidth = Math.min(layout.width, layout.contentMaxWidth) - layout.gutter * 2;
  const cellWidth = gridItemWidth(contentWidth, layout.gridColumns, FEED_GAP);

  const styles = createStyles(colors);
  const scrollY = useSharedValue(0);
  const feedY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // La proxima cita sale de Supabase: antes aqui habia una de ejemplo
  // (14 de octubre, "Confirmada") que el usuario nunca agendo.
  useEffect(() => {
    if (userId) loadAppointments(userId);
  }, [userId, loadAppointments]);

  useEffect(() => {
    if (!upcoming) return;
    artistRepository
      .getArtistById(upcoming.artistId)
      .then((a) => a && setUpcomingArtist({ id: a.id, name: a.name }))
      .catch(() => {});
  }, [upcoming]);

  // Los contadores van aparte del feed: si fallan, las fotos se ven igual.
  useEffect(() => {
    if (feed.length > 0) loadSummaries(feed.map((item) => item.design.id), userId);
  }, [feed, userId, loadSummaries]);

  return (
    <Animated.ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingHorizontal: layout.gutter,
          maxWidth: layout.contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        },
      ]}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.header}>
        <MenuButton />
        <BodyDraftLogo variant="inline" size={28} />
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{initial}</Text>
        </View>
      </View>

      <Text style={[typo.title, { color: colors.textStrong }]}>
        {greetingFor(new Date())}
        {name ? `, ${name}` : ''}
      </Text>

      <View style={styles.ctaCard}>
        <NeonText tone="fuchsia" style={styles.sparkle} containerStyle={styles.sparkleContainer}>
          ✦
        </NeonText>
        <Text style={[typo.sectionTitle, { color: colors.textStrong }]}>Crea tu próximo tatuaje</Text>
        <Text style={[typo.body, { color: colors.textMuted, marginTop: 4, marginBottom: 16 }]}>
          Describe tu idea, pruébala sobre tu piel y agenda con un artista.
        </Text>
        <AppButton label="Crear diseño" size="M" onPress={() => router.push('/disena')} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[typo.sectionTitle, { color: colors.textStrong }]}>Próxima cita</Text>
        <Pressable onPress={() => router.push('/agenda')}>
          <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Ver todas</Text>
        </Pressable>
      </View>

      {upcoming ? (
        <Pressable
          onPress={() => router.push('/agenda')}
          style={({ pressed }) => [styles.appointmentCard, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <View style={styles.dateBadge}>
            <Text style={[typo.label, { color: colors.secondary, fontSize: 10 }]}>
              {new Date(upcoming.dateTime).toLocaleDateString('es', { month: 'short' }).replace('.', '')}
            </Text>
            <Text style={[typo.title, { color: colors.textStrong }]}>{new Date(upcoming.dateTime).getDate()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typo.bodyStrong, { color: colors.textStrong }]}>
              {upcomingArtist?.id === upcoming.artistId ? upcomingArtist.name : 'Tu tatuador'}
            </Text>
            <Text style={[typo.caption, { color: colors.textMuted }]}>
              {new Date(upcoming.dateTime).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.statusPill, upcoming.status === 'pending' && { backgroundColor: colors.accent + '26' }]}>
            <Text
              style={[
                typo.caption,
                { color: upcoming.status === 'confirmed' ? colors.success : colors.accent, fontFamily: typo.bodyStrong.fontFamily },
              ]}
            >
              {STATUS[upcoming.status as 'pending' | 'confirmed']}
            </Text>
          </View>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push('/appointment/new')}
          style={({ pressed }) => [styles.appointmentCard, styles.noAppointment, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <Text style={[typo.bodyStrong, { color: colors.textStrong }]}>No tienes citas por delante</Text>
            <Text style={[typo.caption, { color: colors.textMuted }]}>Elige un tatuador y reserva un horario.</Text>
          </View>
          <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Agendar</Text>
        </Pressable>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[typo.sectionTitle, { color: colors.textStrong }]}>Lo último de los artistas</Text>
        <Pressable onPress={() => router.push('/artists')}>
          <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Ver artistas</Text>
        </Pressable>
      </View>

      <View
        style={styles.feedGrid}
        onLayout={(e) => {
          feedY.value = e.nativeEvent.layout.y;
        }}
      >
        {feed.map((item) => (
          <RevealOnScroll key={item.design.id} scrollY={scrollY} sectionY={feedY} style={{ width: cellWidth }}>
            <ArtistWorkCard
              item={item}
              summary={summaries[item.design.id]}
              onPress={() => router.push(`/designs/${item.design.id}`)}
              onToggleLike={userId ? () => toggleLike(item.design.id, userId) : undefined}
            />
          </RevealOnScroll>
        ))}
      </View>

      {feed.length === 0 && !isFeedLoading && (
        <Text style={[typo.body, { color: colors.textMuted }]}>
          Todavía no hay trabajos publicados por tatuadores.
        </Text>
      )}
    </Animated.ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    content: { paddingBottom: 32, gap: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLabel: { ...typo.bodyStrong, color: colors.primary },
    ctaCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sparkleContainer: { position: 'absolute', top: 16, right: 20 },
    sparkle: { fontSize: 28 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    appointmentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateBadge: {
      width: 52,
      height: 52,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noAppointment: { borderStyle: 'dashed' },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: colors.success + '26',
    },
    feedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: FEED_GAP },
  });
}
