import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

/** Atomo: boton primario reutilizado en toda la app (Atomic Design). */
export function AppButton({
  label,
  onPress,
  isLoading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [styles.button, (disabled || isLoading) && styles.disabled, pressed && styles.pressed]}
    >
      {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#6750A4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
