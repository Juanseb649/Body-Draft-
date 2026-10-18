import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/atoms/AppButton';
import { NeonText } from '../components/atoms/NeonText';
import { BodyDraftLogo } from '../components/molecules/BodyDraftLogo';
import { SPLASH_HANDOFF_MS, SplashHandoff, useSplashHandoffOnce } from '../components/molecules/SplashHandoff';
import { FlashWall, useFlashClearArea } from '../components/organisms/FlashWall';
import { useSettingsStore } from '../controllers/useSettingsStore';
import { type as typo, useResponsive, useTheme } from '../theme';

/**
 * Pantalla "Bienvenida": la primera, antes de iniciar sesion. La pared
 * de flash del estudio detras (igual que en login y registro), el logo
 * completo en el centro con su zona libre, y las dos acciones abajo.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const layout = useResponsive();
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const withHandoff = useSplashHandoffOnce();
  // Sin traspaso (no es la primera pantalla) se entra enseguida.
  const lead = withHandoff ? SPLASH_HANDOFF_MS : 250;
  const { ref: logoRef, clear: logoClear, onLayout: onLogoLayout } = useFlashClearArea(16);
  const styles = createStyles(colors);

  const enter = (step: number) =>
    reduceMotion ? undefined : FadeInDown.delay(lead - 200 + step * 90).duration(520).springify().damping(18);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <FlashWall delayMs={reduceMotion ? 0 : Math.max(0, lead - 350)} clear={logoClear} />

      <View style={styles.center}>
        <Animated.View entering={enter(0)}>
          <View ref={logoRef} onLayout={onLogoLayout} style={styles.logo}>
            <BodyDraftLogo size={104} />
            <NeonText tone="amber" style={typo.tagline} containerStyle={styles.tagline}>
              diseña · agenda · tatúa
            </NeonText>
          </View>
        </Animated.View>
      </View>

      <Animated.View
        entering={enter(1)}
        style={[
          styles.actions,
          { paddingBottom: insets.bottom + 24, paddingHorizontal: layout.gutter + 4 },
          layout.breakpoint !== 'phone' && styles.actionsWide,
        ]}
      >
        <Text style={styles.lead}>Prueba tu tatuaje sobre tu piel y agéndalo con quien lo va a hacer.</Text>
        <AppButton label="Comenzar" onPress={() => router.push('/auth/register')} />
        <Pressable
          onPress={() => router.push('/auth/login')}
          hitSlop={12}
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
          accessibilityRole="link"
        >
          <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Ya tengo cuenta · Iniciar sesión</Text>
        </Pressable>
        <Text style={[typo.caption, { color: colors.textMuted, textAlign: 'center' }]}>
          Al continuar aceptas los Términos y la Política de privacidad
        </Text>
      </Animated.View>

      {withHandoff && <SplashHandoff targetY={0} centered />}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    logo: { alignItems: 'center', paddingVertical: 12 },
    tagline: { marginTop: 16 },
    // Mostrador solido para que las acciones se lean sobre la pared.
    actions: {
      gap: 16,
      paddingTop: 28,
      backgroundColor: colors.background,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      width: '100%',
    },
    actionsWide: { maxWidth: 460, alignSelf: 'center', borderRadius: 32, marginBottom: 32 },
    lead: { ...typo.body, fontSize: 16, lineHeight: 23, color: colors.text, textAlign: 'center' },
    link: { alignItems: 'center' },
  });
}
