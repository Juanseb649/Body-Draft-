import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/atoms/AppButton';
import { NeonText } from '../components/atoms/NeonText';
import { NeonWall } from '../components/atoms/NeonWall';
import { BodyDraftLogo } from '../components/molecules/BodyDraftLogo';
import { type as typo, useTheme } from '../theme';

/** Pantalla "Bienvenida": primera pantalla antes de iniciar sesion. */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <NeonWall />

      <View style={styles.center}>
        <BodyDraftLogo size={104} />
        <NeonText tone="amber" style={typo.tagline} containerStyle={styles.tagline}>
          diseña · agenda · tatúa
        </NeonText>
      </View>

      <View style={styles.actions}>
        <AppButton label="Comenzar" onPress={() => router.push('/auth/register')} />
        <Pressable onPress={() => router.push('/auth/login')} hitSlop={12} style={styles.link}>
          <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Ya tengo cuenta · Iniciar sesión</Text>
        </Pressable>
        <Text style={[typo.caption, { color: colors.textMuted, textAlign: 'center', marginTop: 12 }]}>
          Al continuar aceptas los Términos y la Política de privacidad
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    tagline: { marginTop: 16 },
    actions: { paddingHorizontal: 24, gap: 16 },
    link: { alignItems: 'center' },
  });
}
