import { useNavigation } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';

const BARS = [0, 1, 2];

/**
 * Boton "hamburguesa" que abre el menu lateral. Solo tiene sentido
 * dentro del grupo `(drawer)/`: las pantallas apiladas encima (perfil de
 * artista, agendar cita) llevan chevron de volver, no este boton.
 */
export function MenuButton() {
  const navigation = useNavigation<DrawerNavigationProp<Record<string, undefined>>>();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => navigation.openDrawer()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Abrir menú"
      style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {BARS.map((i) => (
        <View key={i} style={[styles.bar, { backgroundColor: colors.text }]} />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bar: { width: 18, height: 2, borderRadius: 1 },
});
