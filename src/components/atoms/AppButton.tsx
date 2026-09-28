import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { glow, type as typo, type GlowTone } from '../../theme';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost';

const TONE: Record<Exclude<Variant, 'ghost'>, GlowTone> = {
  primary: 'fuchsia',
  secondary: 'blue',
  accent: 'amber',
};

function neonShadow(tone: GlowTone) {
  const { color } = glow[tone];
  return `0 0 10px ${color}, 0 0 24px ${color}8C, inset 0 0 10px ${color}99`;
}

/** Atomo: boton de tubo neon reutilizado en toda la app (Atomic Design). */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  selected = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  isLoading?: boolean;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
}) {
  const tone = variant === 'ghost' ? 'blue' : TONE[variant];
  const g = glow[tone];
  const inactive = disabled || isLoading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, selected }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        variant === 'ghost'
          ? styles.ghost
          : { borderColor: g.core, boxShadow: neonShadow(tone) },
        selected && { backgroundColor: g.color, boxShadow: neonShadow(tone) },
        inactive && !selected && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={g.core} />
      ) : (
        <Text
          style={[
            typo.button,
            compact && styles.compactLabel,
            { color: selected ? '#1A0016' : variant === 'ghost' ? g.soft : g.core },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    paddingHorizontal: 24,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22 },
  compactLabel: { fontSize: 15 },
  ghost: { borderColor: 'transparent', minHeight: 48 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
