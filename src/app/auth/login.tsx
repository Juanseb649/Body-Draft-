import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { BodyDraftLogo } from '../../components/molecules/BodyDraftLogo';
import { SPLASH_HANDOFF_MS, SplashHandoff } from '../../components/molecules/SplashHandoff';
import { FlashWall } from '../../components/organisms/FlashWall';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useSettingsStore } from '../../controllers/useSettingsStore';
import { flatToneColor, fonts, type as typo, useResponsive, useTheme } from '../../theme';

/** Alto de la cabecera con el logo: ahi aterriza el logo del splash. */
const HEADER_LOGO_Y = 96;

/**
 * "Iniciar sesion": la pared de flash del estudio de fondo, y el
 * mostrador delante.
 *
 * Arranca igual que el splash nativo y se abre (SplashHandoff); detras,
 * los motivos de la pared se tatuan trazo a trazo (FlashWall) y el
 * formulario sube por partes. Al loguearse navega a una pantalla
 * DISTINTA ("/"), y el gesto de volver ya no puede regresar aqui
 * (Stack.Protected en app/_layout.tsx).
 */
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const layout = useResponsive();
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const { signIn, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const styles = createStyles(colors);
  const accent = flatToneColor(scheme, 'fuchsia');
  const wide = layout.breakpoint !== 'phone';

  // Cada parte del formulario entra despues de la anterior, cuando el
  // telon del splash ya se abrio. Sin animaciones, todo esta desde el inicio.
  const enter = (step: number) =>
    reduceMotion ? undefined : FadeInDown.delay(SPLASH_HANDOFF_MS - 200 + step * 80).duration(520).springify().damping(18);

  const handleSubmit = async () => {
    const ok = await signIn(email.trim(), password);
    if (ok) router.replace('/');
  };

  const inputStyle = (field: 'email' | 'password') => [
    styles.input,
    focused === field && { borderColor: accent, backgroundColor: colors.surface },
  ];

  return (
    <View style={styles.screen}>
      <FlashWall delayMs={reduceMotion ? 0 : SPLASH_HANDOFF_MS - 350} />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 24, justifyContent: wide ? 'center' : 'space-between' },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.header, { minHeight: HEADER_LOGO_Y * 2 }]}>
            <Animated.View entering={enter(0)}>
              <BodyDraftLogo size={wide ? 92 : 76} />
            </Animated.View>
          </View>

          <View
            style={[
              styles.sheet,
              wide ? styles.sheetWide : { paddingBottom: insets.bottom + 28 },
              { paddingHorizontal: wide ? 36 : layout.gutter + 4 },
            ]}
          >
            <Animated.View entering={enter(1)} style={styles.intro}>
              <Text style={styles.headline} accessibilityRole="header">
                Entra a tu estudio
              </Text>
              <Text style={styles.lead}>Tus bocetos, tus citas y los artistas que sigues, donde los dejaste.</Text>
            </Animated.View>

            <Animated.View entering={enter(2)} style={styles.field}>
              <Text style={styles.label}>Correo</Text>
              <TextInput
                style={inputStyle('email')}
                placeholder="tu@correo.com"
                placeholderTextColor={colors.placeholder}
                selectionColor={accent}
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                accessibilityLabel="Correo"
              />
            </Animated.View>

            <Animated.View entering={enter(3)} style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>
              <View>
                <TextInput
                  style={[inputStyle('password'), { paddingRight: 92 }]}
                  placeholder="Tu contraseña"
                  placeholderTextColor={colors.placeholder}
                  selectionColor={accent}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={() => email && password && handleSubmit()}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  accessibilityLabel="Contraseña"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.reveal}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Text style={[typo.bodyStrong, { color: colors.secondary, fontSize: 14 }]}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            {error && (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            )}

            <Animated.View entering={enter(4)} style={styles.actions}>
              <AppButton label="Entrar" onPress={handleSubmit} isLoading={isLoading} disabled={!email || !password} />
              <Pressable
                onPress={() => router.push('/auth/register')}
                hitSlop={12}
                style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}
                accessibilityRole="link"
              >
                <Text style={[typo.body, { color: colors.textMuted }]}>¿Primera vez?</Text>
                <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Crea tu cuenta</Text>
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SplashHandoff targetY={HEADER_LOGO_Y} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    fill: { flex: 1 },
    content: { flexGrow: 1 },
    header: { alignItems: 'center', justifyContent: 'center' },
    // El mostrador: una superficie solida (sin vidrio ni sombra) que
    // tapa la parte baja de la pared para que el formulario se lea.
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingTop: 30,
      gap: 18,
      width: '100%',
    },
    sheetWide: {
      maxWidth: 460,
      alignSelf: 'center',
      borderRadius: 32,
      paddingBottom: 36,
      marginBottom: 48,
    },
    intro: { gap: 6, marginBottom: 4 },
    headline: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.6, color: colors.textStrong },
    lead: { ...typo.body, fontSize: 16, lineHeight: 23, color: colors.text, maxWidth: 360 },
    field: { gap: 6 },
    label: { ...typo.bodyStrong, fontSize: 14, color: colors.text },
    input: {
      ...typo.body,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surfaceSunken,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    reveal: { position: 'absolute', right: 6, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 12 },
    error: { ...typo.body, fontSize: 14, color: colors.danger },
    actions: { gap: 18, marginTop: 6 },
    linkRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  });
}
