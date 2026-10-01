import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Segmented } from '../../components/atoms/Segmented';
import { SectionHeader } from '../../components/molecules/SectionHeader';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useSettingsStore } from '../../controllers/useSettingsStore';
import { palette, type as typo, useTheme } from '../../theme';

const REMINDER_OPTIONS = [2, 24, 48] as const;
const LOCALE_LABEL: Record<string, string> = { es: 'Español', en: 'English' };

/** Pestana "Ajustes": apariencia, notificaciones, cuenta y soporte. */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const { user, signOut, updateRole } = useAuthStore();
  const settings = useSettingsStore();

  const styles = createStyles(colors);
  const initial = (user?.email ?? '?').charAt(0).toUpperCase();

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <SectionHeader section="ajustes" />

      <View style={styles.profileCard}>
        <View style={[styles.avatar, { borderColor: colors.primary }]}>
          <Text style={[typo.bodyStrong, { color: colors.primary }]}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typo.bodyStrong, { color: colors.textStrong }]}>
            {(user?.user_metadata?.name as string | undefined) ?? 'Tu nombre'}
          </Text>
          <Text style={[typo.caption, { color: colors.textMuted }]}>{user?.email}</Text>
          <View style={[styles.rolePill, { backgroundColor: colors.secondaryTint }]}>
            <Text style={[typo.caption, { color: colors.secondary }]}>
              {settings.account.role === 'artist' ? 'Tatuador' : 'Cliente'}
            </Text>
          </View>
        </View>
      </View>

      <Group title="Apariencia">
        <Field label="Tema">
          <Segmented
            value={settings.appearance.theme}
            onChange={settings.setTheme}
            options={[
              { value: 'system', label: 'Sistema' },
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]}
          />
        </Field>
        <Field label="Intensidad del neón" hint="Solo en modo oscuro">
          <Segmented
            value={settings.appearance.neonIntensity}
            onChange={settings.setNeonIntensity}
            options={[
              { value: 'soft', label: 'Suave' },
              { value: 'medium', label: 'Media' },
              { value: 'intense', label: 'Intensa' },
            ]}
          />
        </Field>
        <Row
          label="Reducir animaciones"
          hint="Quita el parpadeo y el pulso del neón"
          right={
            <Switch
              value={settings.appearance.reduceMotion}
              onValueChange={settings.setReduceMotion}
              trackColor={{ false: colors.border, true: colors.selection }}
              thumbColor={palette.white}
            />
          }
        />
      </Group>

      <Group title="Notificaciones">
        <Row
          label="Recordatorio de cita"
          right={
            <Switch
              value={settings.notifications.appointmentReminder}
              onValueChange={settings.setAppointmentReminder}
              trackColor={{ false: colors.border, true: colors.selection }}
              thumbColor={palette.white}
            />
          }
        />
        <Pressable
          onPress={() => {
            const i = REMINDER_OPTIONS.indexOf(settings.notifications.reminderLeadHours);
            settings.setReminderLeadHours(REMINDER_OPTIONS[(i + 1) % REMINDER_OPTIONS.length]);
          }}
        >
          <Row label="Avisarme" right={<Text style={[typo.body, { color: colors.textMuted }]}>{settings.notifications.reminderLeadHours} h antes  ›</Text>} />
        </Pressable>
        <Row
          label="Mensajes de artistas"
          right={
            <Switch
              value={settings.notifications.artistMessages}
              onValueChange={settings.setArtistMessages}
              trackColor={{ false: colors.border, true: colors.selection }}
              thumbColor={palette.white}
            />
          }
        />
        <Row
          label="Novedades y promociones"
          right={
            <Switch
              value={settings.notifications.news}
              onValueChange={settings.setNews}
              trackColor={{ false: colors.border, true: colors.selection }}
              thumbColor={palette.white}
            />
          }
        />
      </Group>

      <Group title="Cuenta">
        <Pressable
          onPress={async () => {
            const previous = settings.account.role;
            const next = previous === 'artist' ? 'client' : 'artist';
            settings.setRole(next);
            // `profiles.role` en Supabase es la fuente de verdad para que
            // otros usuarios puedan encontrarte como tatuador — si falla,
            // revertimos el toggle local para no mentir en la UI.
            const ok = await updateRole(next);
            if (!ok) settings.setRole(previous);
          }}
        >
          <Row label="Soy tatuador" hint="Publica plantillas y recibe citas" right={<Text style={{ color: colors.textMuted }}>›</Text>} />
        </Pressable>
        <Pressable onPress={() => settings.setLocale(settings.account.locale === 'es' ? 'en' : 'es')}>
          <Row label="Idioma" right={<Text style={[typo.body, { color: colors.textMuted }]}>{LOCALE_LABEL[settings.account.locale]}  ›</Text>} />
        </Pressable>
        <Row label="Privacidad y datos" right={<Text style={{ color: colors.textMuted }}>›</Text>} />
      </Group>

      <Group title="Soporte">
        <Row label="Centro de ayuda" right={<Text style={{ color: colors.textMuted }}>›</Text>} />
        <Row label="Términos y privacidad" right={<Text style={{ color: colors.textMuted }}>›</Text>} last />
      </Group>

      <Pressable onPress={signOut} style={[styles.logout, { borderColor: colors.danger }]}>
        <Text style={[typo.bodyStrong, { color: colors.danger }]}>Cerrar sesión</Text>
      </Pressable>

      <Text style={[typo.caption, { color: colors.textMuted, textAlign: 'center', marginTop: 8 }]}>
        Tema resuelto: {scheme === 'dark' ? 'Oscuro' : 'Claro'}
      </Text>
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={{ ...typography(colors).groupTitle }}>{title}</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function Row({ label, hint, right, last }: { label: string; hint?: string; right?: React.ReactNode; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 56,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typo.bodyStrong, { color: colors.text }]}>{label}</Text>
        {hint && <Text style={[typo.caption, { color: colors.textMuted }]}>{hint}</Text>}
      </View>
      {right}
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[typo.bodyStrong, { color: colors.text }]}>{label}</Text>
        {hint && <Text style={[typo.caption, { color: colors.textMuted }]}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function typography(colors: ReturnType<typeof useTheme>['colors']) {
  return { groupTitle: { ...typo.label, color: colors.textMuted, marginBottom: 8, marginLeft: 4 } };
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    content: { paddingHorizontal: 20, paddingBottom: 48 },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 16,
    },
    avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    rolePill: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    logout: {
      marginTop: 24,
      minHeight: 52,
      borderWidth: 1.5,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
