import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { Segmented } from '../../components/atoms/Segmented';
import { BodyDraftLogo } from '../../components/molecules/BodyDraftLogo';
import { FlashWall, useFlashClearArea } from '../../components/organisms/FlashWall';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useSettingsStore, type AccountRole } from '../../controllers/useSettingsStore';
import { fonts, type as typo, useResponsive, useTheme } from '../../theme';

/**
 * Pantalla "Crear cuenta". Si el proyecto de Supabase tiene
 * confirmacion por correo activada, `signUp` no devuelve sesion de
 * inmediato: se lo indicamos al usuario en vez de navegar a la app
 * sin estar realmente logueado.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { signUp, isLoading, error, session } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AccountRole>('client');
  const [specialty, setSpecialty] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const layout = useResponsive();
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const { ref: logoRef, clear: logoClear, onLayout: onLogoLayout } = useFlashClearArea();
  const { ref: formRef, clear: formArea, onLayout: onFormLayout } = useFlashClearArea(0);
  const wide = layout.breakpoint !== 'phone';
  const styles = createStyles(colors);
  const isArtist = role === 'artist';
  const enter = (step: number) =>
    reduceMotion ? undefined : FadeInDown.delay(150 + step * 80).duration(480).springify().damping(18);

  const handleSubmit = async () => {
    const ok = await signUp(email.trim(), password, {
      name: name.trim(),
      role,
      specialty: isArtist ? specialty.trim() || undefined : undefined,
    });
    if (!ok) return;
    if (session) router.replace('/');
    else setNeedsConfirmation(true);
  };

  return (
    <View style={styles.screen}>
      {/* La misma pared de flash que bienvenida y login. */}
      <FlashWall delayMs={reduceMotion ? 0 : 100} clear={logoClear} dim={formArea} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, justifyContent: wide ? 'center' : 'space-between' }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={enter(0)} style={styles.header}>
          <View ref={logoRef} onLayout={onLogoLayout} style={styles.logo}>
            <BodyDraftLogo size={wide ? 84 : 68} />
          </View>
        </Animated.View>

        <View ref={formRef} onLayout={onFormLayout}>
        <Animated.View
          entering={enter(1)}
          style={[
            styles.sheet,
            wide ? styles.sheetWide : { paddingBottom: insets.bottom + 28 },
            { paddingHorizontal: wide ? 36 : layout.gutter + 4 },
          ]}
        >
        <Text style={styles.headline} accessibilityRole="header">
          {needsConfirmation ? 'Revisa tu correo' : 'Abre tu estudio'}
        </Text>
        {needsConfirmation ? (
          <View style={styles.form}>
            <Text style={styles.confirmText}>
              Te enviamos un correo a {email} para confirmar tu cuenta. Confirma y vuelve a iniciar sesión.
            </Text>
            <AppButton label="Ir a iniciar sesión" onPress={() => router.replace('/auth/login')} />
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.secondary}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Correo"
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.secondary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.secondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {/* El rol se decide aqui y no despues en Ajustes: `profiles`
                se crea en el mismo registro, asi que un tatuador que lo
                elija ahora ya aparece en la lista de artistas sin tener
                que encontrar un ajuste escondido. */}
            <Text style={styles.label}>¿Cómo vas a usar BodyDraft?</Text>
            <Segmented
              value={role}
              onChange={setRole}
              options={[
                { value: 'client', label: 'Me quiero tatuar' },
                { value: 'artist', label: 'Soy tatuador' },
              ]}
            />

            {isArtist && (
              <TextInput
                style={styles.input}
                placeholder="Especialidad (p. ej. Blackwork, Realismo)"
                placeholderTextColor={colors.placeholder}
                selectionColor={colors.secondary}
                value={specialty}
                onChangeText={setSpecialty}
              />
            )}

            <Text style={styles.hint}>
              {isArtist
                ? 'Tu perfil será visible para quienes busquen tatuador y podrás recibir citas.'
                : 'Podrás diseñar, probar sobre el cuerpo y agendar con tatuadores.'}
            </Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <AppButton
              label="Crear cuenta"
              variant="secondary"
              onPress={handleSubmit}
              isLoading={isLoading}
              disabled={!name || !email || !password}
            />

            <Pressable onPress={() => router.push('/auth/login')} hitSlop={12}>
              <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
            </Pressable>
          </View>
        )}
        </Animated.View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    fill: { flex: 1 },
    content: { flexGrow: 1 },
    header: { alignItems: 'center', paddingVertical: 24 },
    logo: { alignItems: 'center', paddingVertical: 8 },
    // Directo sobre la pared apagada, igual que en login.
    sheet: {
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingTop: 28,
      gap: 8,
      width: '100%',
    },
    sheetWide: { maxWidth: 460, alignSelf: 'center', borderRadius: 32, paddingBottom: 36, marginBottom: 48 },
    headline: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.6, color: colors.textStrong },
    form: { gap: 12, marginTop: 8 },
    input: {
      ...typo.body,
      color: colors.text,
      backgroundColor: colors.surfaceSunken,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
    },
    label: { ...typo.label, color: colors.textMuted, marginTop: 4 },
    hint: { ...typo.caption, color: colors.textMuted },
    error: { ...typo.caption, color: colors.danger },
    link: { ...typo.bodyStrong, color: colors.primary, textAlign: 'center', marginTop: 8 },
    confirmText: { ...typo.body, color: colors.text, textAlign: 'center' },
  });
}
