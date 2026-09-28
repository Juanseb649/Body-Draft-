import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { glow, type as typo, useTheme, type GlowTone } from '../../theme';
import { PRESS_SCALE, duration, spring } from '../../theme/motion';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost';
type Size = 'L' | 'M' | 'S';

const TONE: Record<Exclude<Variant, 'ghost'>, GlowTone> = {
  primary: 'fuchsia',
  secondary: 'blue',
  accent: 'amber',
};

const HEIGHT: Record<Size, number> = { L: 56, M: 44, S: 36 };
const PADDING: Record<Size, number> = { L: 24, M: 18, S: 14 };

function neonHalo(color: string) {
  return `0 0 10px ${color}, 0 0 24px ${color}8C, inset 0 0 10px ${color}99`;
}

/** Halo del boton primario en claro ("tubo rojo") — guia, pag. "Botones y estados". */
const LIGHT_PRIMARY_HALO = '0 0 18px rgba(255,45,85,.45), 0 8px 18px rgba(120,0,24,.28)';
/** Halo del boton secundario en claro ("tubo azul"). */
const LIGHT_SECONDARY_HALO = '0 0 10px rgba(34,211,255,.45), 0 0 8px rgba(34,211,255,.3), 0 6px 12px rgba(10,60,80,.18)';

/**
 * Boton de tubo neon (oscuro) / relleno solido (claro). Ver guia de
 * diseno, "Botones y estados" — src/components/atoms/AppButton.tsx.
 */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'L',
  isLoading = false,
  disabled = false,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  disabled?: boolean;
  selected?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const tone = variant === 'ghost' ? 'blue' : TONE[variant];
  const g = glow[tone];
  const inactive = disabled || isLoading;
  const pressProgress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressProgress.value * (1 - PRESS_SCALE) }],
  }));

  const handlePressIn = () => {
    pressProgress.value = withTiming(1, { duration: duration.fast });
  };
  const handlePressOut = () => {
    pressProgress.value = withSpring(0, spring.press);
  };

  const isDark = scheme === 'dark';
  const isFilled = isDark ? selected : variant !== 'ghost';

  const containerStyle = [
    styles.base,
    { minHeight: HEIGHT[size], paddingHorizontal: PADDING[size], borderRadius: HEIGHT[size] / 2 },
    variant === 'ghost'
      ? styles.ghost
      : isDark
        ? {
            borderWidth: 2,
            borderColor: g.core,
            boxShadow: neonHalo(g.color),
            backgroundColor: selected ? `${g.color}2E` : 'transparent',
          }
        : isFilled
          ? variant === 'primary'
            ? {
                backgroundColor: colors.primary,
                borderWidth: 3,
                borderColor: `${colors.primary}1F`,
                boxShadow: LIGHT_PRIMARY_HALO,
              }
            : variant === 'secondary'
              ? {
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  borderWidth: 2,
                  borderColor: '#0A8FC4',
                  boxShadow: LIGHT_SECONDARY_HALO,
                }
              : { backgroundColor: colors.accent, borderWidth: 0 }
          : { borderWidth: 1.5, borderColor: colors.border },
    inactive && styles.disabled,
  ];

  const textColor = variant === 'ghost'
    ? (isDark ? g.soft : colors.secondary)
    : isDark
      ? (selected ? '#1A0016' : g.core)
      : variant === 'secondary'
        ? colors.secondary
        : colors.onPrimary;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, selected }}
      hitSlop={size === 'S' ? 4 : 0}
    >
      <Animated.View style={[containerStyle, animatedStyle]}>
        {isLoading ? (
          <Spinner size={20} color={textColor} />
        ) : (
          <Text style={[size === 'L' ? typo.button : size === 'M' ? typo.buttonMedium : typo.buttonSmall, { color: textColor }]}>
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.4 },
});
