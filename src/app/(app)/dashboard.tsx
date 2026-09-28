import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { NeonText } from '../../components/atoms/NeonText';
import { NeonWall } from '../../components/atoms/NeonWall';
import { SectionIcon } from '../../components/atoms/SectionIcon';
import { SECTIONS, type SectionKey } from '../../components/atoms/sectionIcons';
import { BodyDraftLogo } from '../../components/molecules/BodyDraftLogo';
import { useAuthStore } from '../../controllers/useAuthStore';
import { fonts, type as typo, useTheme } from '../../theme';

const SHORTCUTS: { section: SectionKey; href: Href }[] = [
  { section: 'disena', href: '/design/create' },
  { section: 'artistas', href: '/artists' },
  { section: 'agenda', href: '/appointment/mine' },
];

/**
 * Dashboard: pantalla de inicio del area autenticada. Disenos
 * recientes, propuestas guardadas, proxima cita y acceso rapido a
 * crear diseno. El resto de las secciones se navegan desde el sidebar
 * (ver (app)/_layout.tsx).
 */
export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const name = useAuthStore((s) => s.user?.user_metadata?.name as string | undefined);

  const styles = createStyles(colors);

  return (
    <View style={styles.screen}>
      <NeonWall />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
        <BodyDraftLogo size={104} />
        <NeonText tone="amber" style={typo.tagline} containerStyle={styles.tagline}>
          {name ? `hola, ${name}` : 'diseña · agenda · tatúa'}
        </NeonText>

        <View style={styles.actions}>
          <AppButton label="Crear diseño" onPress={() => router.push('/design/create')} />
        </View>

        <View style={styles.shortcuts}>
          {SHORTCUTS.map(({ section, href }) => (
            <Pressable
              key={section}
              accessibilityRole="button"
              accessibilityLabel={SECTIONS[section].label}
              onPress={() => router.push(href)}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            >
              <SectionIcon section={section} size={64} />
              <NeonText tone={SECTIONS[section].word} style={styles.tileLabel}>
                {SECTIONS[section].label}
              </NeonText>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Propuestas guardadas</Text>
          {/* TODO: listar TattooProposal del usuario (useDesignStore). */}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próxima cita</Text>
          {/* TODO: mostrar proximo Appointment (useAppointmentStore). */}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 24, gap: 24 },
    tagline: { alignSelf: 'center', marginTop: 4 },
    actions: { marginTop: 16 },
    shortcuts: { flexDirection: 'row', gap: 12 },
    tile: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tilePressed: { borderColor: colors.borderStrong },
    tileLabel: { fontFamily: fonts.logo, fontSize: 30, lineHeight: 38, paddingHorizontal: 4, includeFontPadding: false },
    section: {
      gap: 8,
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: { ...typo.sectionTitle, color: colors.textStrong },
  });
}
