import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { NeonText } from '../../components/atoms/NeonText';
import { SectionIcon } from '../../components/atoms/SectionIcon';
import { SECTIONS, type SectionKey } from '../../components/atoms/sectionIcons';
import { BodyDraftLogo } from '../../components/molecules/BodyDraftLogo';
import { useAuthStore } from '../../controllers/useAuthStore';
import { type as typo, useTheme } from '../../theme';

type DashboardHref = '/disena' | '/editor' | '/agenda' | '/model3d' | '/artists' | '/ajustes';

/** Todas las secciones de la app: el dashboard es la unica forma de llegar a ellas. */
const DASHBOARD_SECTIONS: { section: SectionKey; href: DashboardHref }[] = [
  { section: 'disena', href: '/disena' },
  { section: 'crea', href: '/editor' },
  { section: 'agenda', href: '/agenda' },
  { section: 'explora', href: '/model3d' },
  { section: 'artistas', href: '/artists' },
  { section: 'ajustes', href: '/ajustes' },
];

/**
 * "Inicio": el dashboard. Reemplaza la barra de pestanas inferior — cada
 * seccion es una tarjeta con su logo animado y su nombre al lado (ver
 * ARCHITECTURE.md, "Navegacion").
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const name = (useAuthStore((s) => s.user?.user_metadata?.name as string | undefined)) ?? 'ahi';
  const initial = name.charAt(0).toUpperCase();

  const styles = createStyles(colors);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <BodyDraftLogo variant="inline" size={32} />
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{initial}</Text>
        </View>
      </View>

      <View style={styles.greeting}>
        <Text style={[typo.title, { color: colors.textStrong }]}>Hola, {name}</Text>
        <Text style={[typo.body, { color: colors.textMuted }]}>¿Qué vamos a tatuar hoy?</Text>
      </View>

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

      <Text style={[typo.sectionTitle, { color: colors.textStrong, marginTop: 4 }]}>Secciones</Text>
      <View style={styles.grid}>
        {DASHBOARD_SECTIONS.map(({ section, href }) => (
          <Pressable key={section} onPress={() => router.push(href)} style={styles.tile} accessibilityRole="button">
            <SectionIcon section={section} size={44} />
            <Text style={[typo.bodyStrong, { color: colors.text, marginTop: 8 }]}>{SECTIONS[section].label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[typo.sectionTitle, { color: colors.textStrong }]}>Próxima cita</Text>
        <Pressable onPress={() => router.push('/agenda')}>
          <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Ver todas</Text>
        </Pressable>
      </View>

      {/* TODO: reemplazar por la proxima Appointment real (useAppointmentStore). */}
      <View style={styles.appointmentCard}>
        <View style={styles.dateBadge}>
          <Text style={[typo.label, { color: colors.secondary, fontSize: 10 }]}>OCT</Text>
          <Text style={[typo.title, { color: colors.textStrong }]}>14</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typo.bodyStrong, { color: colors.textStrong }]}>Tu artista</Text>
          <Text style={[typo.caption, { color: colors.textMuted }]}>Antebrazo · 4:30 p. m.</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={[typo.caption, { color: colors.success, fontFamily: typo.bodyStrong.fontFamily }]}>Confirmada</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    content: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },
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
    greeting: { gap: 2 },
    ctaCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sparkleContainer: { position: 'absolute', top: 16, right: 20 },
    sparkle: { fontSize: 28 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: -8 },
    tile: {
      width: '31%',
      alignItems: 'center',
      paddingVertical: 16,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
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
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: colors.success + '26',
    },
  });
}
