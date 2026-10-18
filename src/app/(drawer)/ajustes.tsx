import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/atoms/Avatar';
import { Segmented } from '../../components/atoms/Segmented';
import { Spinner } from '../../components/atoms/Spinner';
import { SectionHeader } from '../../components/molecules/SectionHeader';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useProfileStore } from '../../controllers/useProfileStore';
import { useSettingsStore } from '../../controllers/useSettingsStore';
import { NAME_MAX_LENGTH } from '../../models/profileErrors';
import { palette, type as typo, useTheme } from '../../theme';

const REMINDER_OPTIONS = [2, 24, 48] as const;
const LOCALE_LABEL: Record<string, string> = { es: 'Español', en: 'English' };

/** Pestana "Ajustes": apariencia, notificaciones, cuenta y soporte. */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const { user, signOut, updateRole } = useAuthStore();
  const settings = useSettingsStore();

  const { profile, isSaving, error: profileError, load, changeAvatar, removeAvatar, rename, clearError } =
    useProfileStore();
  const styles = createStyles(colors);
  const name = profile.name ?? (user?.user_metadata?.name as string | undefined) ?? 'Tu nombre';
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');

  const startEditingName = () => {
    clearError();
    setDraftName(profile.name ?? (user?.user_metadata?.name as string | undefined) ?? '');
    setEditingName(true);
  };
  const cancelName = () => {
    clearError();
    setEditingName(false);
  };
  const saveName = async () => {
    if (!user?.id) return;
    if (await rename(user.id, draftName)) setEditingName(false);
  };

  useEffect(() => {
    if (user?.id) load(user.id);
  }, [user?.id, load]);

  const pickPhoto = async () => {
    if (!user?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    // Recorte cuadrado: el avatar es un circulo, y asi se elige que entra.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    await changeAvatar(user.id, result.assets[0].uri);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <SectionHeader section="ajustes" />

      <View style={styles.profileCard}>
        {/* Tocar la foto la cambia; sin foto se ven las iniciales. */}
        <Pressable
          onPress={pickPhoto}
          disabled={isSaving}
          style={({ pressed }) => pressed && { opacity: 0.75 }}
          accessibilityRole="button"
          accessibilityLabel={profile.avatarUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
        >
          <Avatar name={name} imageUrl={profile.avatarUrl} size={72} />
          {isSaving && (
            <View style={styles.avatarBusy}>
              <Spinner color="#FFFFFF" />
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typo.bodyStrong, { color: colors.textStrong, fontSize: 17 }]}>{name}</Text>
          <Text style={[typo.caption, { color: colors.textMuted }]}>{user?.email}</Text>
          <View style={[styles.rolePill, { backgroundColor: colors.secondaryTint }]}>
            <Text style={[typo.caption, { color: colors.secondary }]}>
              {settings.account.role === 'artist' ? 'Tatuador' : 'Cliente'}
            </Text>
          </View>
          <View style={styles.photoActions}>
            <Pressable onPress={pickPhoto} disabled={isSaving} hitSlop={8} accessibilityRole="button">
              <Text style={[typo.bodyStrong, { color: colors.secondary, fontSize: 14 }]}>
                {profile.avatarUrl ? 'Cambiar foto' : 'Agregar foto'}
              </Text>
            </Pressable>
            {profile.avatarUrl && (
              <Pressable
                onPress={() => user?.id && removeAvatar(user.id)}
                disabled={isSaving}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={[typo.bodyStrong, { color: colors.textMuted, fontSize: 14 }]}>Quitar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Nombre de usuario: el que se ve en Inicio, en el menu y firmando
          tus comentarios (la base actualiza los anteriores sola). */}
      <View style={styles.nameRow}>
        <Text style={styles.nameLabel}>Nombre de usuario</Text>
        {editingName ? (
          <>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              autoFocus
              maxLength={NAME_MAX_LENGTH + 10}
              returnKeyType="done"
              onSubmitEditing={saveName}
              placeholder="Cómo quieres que te vean"
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.secondary}
              style={styles.nameInput}
              accessibilityLabel="Nombre de usuario"
            />
            <View style={styles.nameActions}>
              <Pressable onPress={cancelName} hitSlop={8} accessibilityRole="button">
                <Text style={[typo.bodyStrong, { color: colors.textMuted }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={saveName}
                disabled={isSaving}
                style={({ pressed }) => [styles.saveName, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
              >
                {isSaving ? (
                  <Spinner size={18} color={colors.onPrimary} />
                ) : (
                  <Text style={[typo.bodyStrong, { color: colors.onPrimary }]}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable
            onPress={startEditingName}
            style={({ pressed }) => [styles.nameValue, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`Nombre de usuario: ${name}. Editar`}
          >
            <Text style={[typo.body, { color: colors.textStrong, flex: 1 }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Editar</Text>
          </Pressable>
        )}
      </View>
      {profileError && <Text style={[typo.caption, { color: colors.danger, marginTop: 8 }]}>{profileError}</Text>}

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
        {/* Es lo unico de la app que saca una foto del usuario de su
            telefono, asi que tiene interruptor propio y no queda
            enterrado en "Privacidad y datos". */}
        <Row
          label="Resultado realista con IA"
          hint="Envía la foto que tomes a Google para aplicar el tatuaje sobre tu piel"
          right={
            <Switch
              value={settings.privacy.allowAiPhotoUpload}
              onValueChange={settings.setAllowAiPhotoUpload}
              trackColor={{ false: colors.border, true: colors.selection }}
              thumbColor={palette.white}
            />
          }
        />
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
    avatarBusy: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(14,12,16,0.55)',
    },
    photoActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
    nameRow: { marginTop: 12, padding: 16, borderRadius: 20, backgroundColor: colors.surface, gap: 8 },
    nameLabel: { ...typo.bodyStrong, fontSize: 14, color: colors.textMuted },
    nameValue: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
    nameInput: {
      ...typo.body,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surfaceSunken,
      borderWidth: 1.5,
      borderColor: colors.secondary,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    nameActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20 },
    saveName: { minHeight: 40, minWidth: 96, paddingHorizontal: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
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
