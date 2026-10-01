import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { BodyDraftLogo } from '../../components/molecules/BodyDraftLogo';
import { useAuthStore } from '../../controllers/useAuthStore';
import { type as typo, useTheme } from '../../theme';

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
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const styles = createStyles(colors);

  const handleSubmit = async () => {
    const ok = await signUp(email.trim(), password, name.trim());
    if (!ok) return;
    if (session) router.replace('/');
    else setNeedsConfirmation(true);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <BodyDraftLogo size={72} />

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
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
    },
    error: { ...typo.caption, color: colors.danger },
    link: { ...typo.bodyStrong, color: colors.primary, textAlign: 'center', marginTop: 8 },
    confirmText: { ...typo.body, color: colors.text, textAlign: 'center' },
  });
}
