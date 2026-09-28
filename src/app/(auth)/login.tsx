import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { NeonWall } from '../../components/atoms/NeonWall';
import { BodyDraftLogo } from '../../components/molecules/BodyDraftLogo';
import { useAuthStore } from '../../controllers/useAuthStore';
import { palette, type as typo, useTheme } from '../../theme';

/**
 * Pantalla "Iniciar sesion". Al loguearse exitosamente navega a una
 * pantalla DISTINTA (el dashboard, ver (app)/dashboard.tsx) en vez de
 * quedarse en login o solo cambiar de estado en el mismo lugar.
 */
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { signIn, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const styles = createStyles(colors);

  const handleSubmit = async () => {
    const ok = await signIn(email.trim(), password);
    if (ok) router.replace('/dashboard');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <NeonWall />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <BodyDraftLogo size={88} />

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Correo"
            placeholderTextColor={colors.textMuted}
            selectionColor={palette.fuchsia}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={colors.textMuted}
            selectionColor={palette.fuchsia}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AppButton
            label="Iniciar sesión"
            onPress={handleSubmit}
            isLoading={isLoading}
            disabled={!email || !password}
          />

          <Pressable onPress={() => router.push('/register')} hitSlop={12}>
            <Text style={styles.link}>¿No tienes cuenta? Crea una</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 24, gap: 24, alignItems: 'stretch' },
    form: { gap: 12, marginTop: 8 },
    input: {
      ...typo.body,
      color: colors.text,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 18,
      padding: 14,
    },
    error: { ...typo.caption, color: colors.danger },
    link: { ...typo.bodyStrong, color: colors.secondary, textAlign: 'center', marginTop: 8 },
  });
}
