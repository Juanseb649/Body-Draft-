import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { type as typo, useTheme } from '../../theme';
import { PRESS_SCALE, duration, spring } from '../../theme/motion';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost';
type Size = 'L' | 'M' | 'S';

const HEIGHT: Record<Size, number> = { L: 56, M: 44, S: 36 };
const PADDING: Record<Size, number> = { L: 24, M: 18, S: 14 };

/** "Oscuro secundario": texto mas claro que el borde — guia, "Botones y estados". */
const DARK_SECONDARY_TEXT = '#8FD6F5';
/** "Oscuro desactivado": no es un token de tema, solo aplica a este estado. */
const DARK_DISABLED_BG = '#2A2530';
const DARK_DISABLED_TEXT = '#6E6676';
/** Texto oscuro legible sobre el relleno dorado de "Acento" (ambos temas: oscuro=dorado claro, claro=dorado oscuro). */
const ON_ACCENT_DARK = '#2A2000';

/** Halo del boton primario en claro ("tubo rojo") — guia, pag. "Botones y estados". */
const LIGHT_PRIMARY_HALO = '0 0 18px rgba(255,45,85,.45), 0 8px 18px rgba(120,0,24,.28)';
/** Halo del boton secundario en claro ("tubo azul"). */
const LIGHT_SECONDARY_HALO = '0 0 10px rgba(34,211,255,.45), 0 0 8px rgba(34,211,255,.3), 0 6px 12px rgba(10,60,80,.18)';
/** Sombra negra del boton primario en oscuro ("sin neon"). */
const DARK_SHADOW = '0 8px 20px rgba(0,0,0,.35)';

/**
 * Boton. Oscuro = relleno/contorno plano ("sin neon", sombra solo negra);
 * claro = tubo de neon con halo. Ver guia de diseno, "Botones y estados"
 * — src/components/atoms/AppButton.tsx.
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
  const isDark = scheme === 'dark';
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

  const containerStyle = [
    styles.base,
    { minHeight: HEIGHT[size], paddingHorizontal: PADDING[size], borderRadius: HEIGHT[size] / 2 },
    variant === 'ghost'
      ? styles.ghost
      : isDark
        ? darkVariantStyle(variant, colors, selected)
        : lightVariantStyle(variant, colors),
    inactive && (isDark ? { backgroundColor: DARK_DISABLED_BG, borderWidth: 0, boxShadow: undefined } : styles.disabled),
  ];

  const textColor = inactive
    ? isDark
      ? DARK_DISABLED_TEXT
      : colors.textMuted
    : variant === 'ghost'
      ? colors.secondary
      : variant === 'accent'
        ? isDark
          ? ON_ACCENT_DARK
          : colors.onPrimary
        : isDark
          ? variant === 'secondary'
            ? DARK_SECONDARY_TEXT
            : colors.onPrimary
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

function darkVariantStyle(variant: Variant, colors: ReturnType<typeof useTheme>['colors'], selected: boolean) {
  if (variant === 'secondary') {
    return {
      borderWidth: 1.5,
      borderColor: colors.secondary,
      backgroundColor: selected ? colors.secondaryTint : 'transparent',
    };
  }
  if (variant === 'accent') {
    return { backgroundColor: colors.accent, boxShadow: DARK_SHADOW };
  }
  // primary
  return {
    backgroundColor: selected ? colors.primaryPressed : colors.primary,
    boxShadow: DARK_SHADOW,
  };
}

function lightVariantStyle(variant: Variant, colors: ReturnType<typeof useTheme>['colors']) {
  if (variant === 'secondary') {
    return {
      backgroundColor: 'rgba(255,255,255,0.8)',
      borderWidth: 2,
      borderColor: '#0A8FC4',
      boxShadow: LIGHT_SECONDARY_HALO,
    };
  }
  if (variant === 'accent') {
    return { backgroundColor: colors.accent, borderWidth: 0 };
  }
  // primary
  return {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: `${colors.primary}1F`,
    boxShadow: LIGHT_PRIMARY_HALO,
  };
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.4 },
});
