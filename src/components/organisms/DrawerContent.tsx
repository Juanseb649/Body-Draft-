import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../../controllers/useAuthStore';
import { fonts, palette, type as typo, useTheme } from '../../theme';
import { BodyDraftLogo } from '../molecules/BodyDraftLogo';

const SECTIONS: { label: string; href: Href }[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Diseña', href: '/design/create' },
  { label: 'Editor', href: '/editor' },
  { label: 'Maniquí 3D', href: '/model3d' },
  { label: 'Tatuadores', href: '/artists' },
  { label: 'Mis citas', href: '/appointment/mine' },
];

/**
 * Contenido del sidebar (drawer). Lista las secciones de la app,
 * el interruptor claro/oscuro y "Cerrar sesion". Ver (app)/_layout.tsx
 * para la animacion de apertura estilo Twitter/X (drawerType: 'back').
 */
export function DrawerContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, scheme, toggleTheme } = useTheme();
  const { user, signOut } = useAuthStore();

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
    >
      <BodyDraftLogo variant="inline" size={40} style={styles.logo} />

      {user?.email && <Text style={styles.email}>{user.email}</Text>}

      <View style={styles.sections}>
        {SECTIONS.map(({ label, href }) => (
          <Pressable
            key={label}
            onPress={() => router.push(href)}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          >
            <Text style={styles.itemLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.spacer} />

      <View style={styles.toggleRow}>
        <Text style={styles.itemLabel}>Modo oscuro</Text>
        <Switch
          value={scheme === 'dark'}
          onValueChange={toggleTheme}
          trackColor={{ false: colors.borderStrong, true: palette.fuchsia }}
          thumbColor={palette.white}
        />
      </View>

      <Pressable
        onPress={signOut}
        style={({ pressed }) => [styles.item, styles.logout, pressed && styles.itemPressed]}
      >
        <Text style={[styles.itemLabel, { color: colors.danger }]}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    content: { flexGrow: 1, paddingHorizontal: 20, gap: 4 },
    logo: { marginBottom: 8 },
    email: { ...typo.caption, color: colors.textMuted, marginBottom: 16 },
    sections: { gap: 2 },
    item: { paddingVertical: 14, borderRadius: 12, paddingHorizontal: 8 },
    itemPressed: { backgroundColor: colors.surfaceRaised },
    itemLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
    spacer: { flex: 1, minHeight: 24 },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    logout: { marginTop: 8 },
  });
}
