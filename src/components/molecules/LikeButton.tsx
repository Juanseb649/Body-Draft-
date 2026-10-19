import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { formatCount } from '../../models/designSocial';
import { flatToneColor, fonts, neonLightHaloColor, useTheme } from '../../theme';
import { duration, spring } from '../../theme/motion';
import { Icon } from '../atoms/Icon';

/**
 * Corazon + contador. Lleva el tono de "Body" del logo (fucsia en
 * oscuro, rojo neon en claro): es la accion "de marca" de un diseno.
 *
 * `compact` es para encima de la foto en el feed (fondo oscuro siempre);
 * el normal va sobre la superficie del tema.
 */
export function LikeButton({
  liked,
  count,
  onPress,
  compact = false,
  disabled = false,
}: {
  liked: boolean;
  count: number;
  onPress: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const pop = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  const brand = flatToneColor(scheme, 'fuchsia');
  const idle = compact ? '#FFFFFF' : colors.textMuted;
  const tint = liked ? brand : idle;
  // En claro el neon "brilla" con un halo del tono crudo; en oscuro la
  // guia pide colores planos, sin halo.
  const glow = liked && scheme === 'light' && !compact ? { boxShadow: `0 0 14px ${neonLightHaloColor('fuchsia', 0.45)}` } : null;

  const handlePress = () => {
    pop.set(withSequence(withTiming(1.25, { duration: duration.fast }), withSpring(1, spring.press)));
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: liked, disabled }}
      accessibilityLabel={liked ? `Quitar me gusta, ${count} en total` : `Me gusta, ${count} en total`}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : [styles.regular, { borderColor: liked ? brand : colors.border }],
        glow,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Animated.View style={animated}>
        <Icon name={liked ? 'heartFilled' : 'heart'} size={compact ? 18 : 22} color={tint} />
      </Animated.View>
      <Text style={[styles.count, { color: compact ? '#FFFFFF' : liked ? brand : colors.text, fontSize: compact ? 12 : 15 }]}>
        {formatCount(count)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compact: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(14,12,16,0.55)',
  },
  regular: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5 },
  // Cifras tabulares: el contador no "baila" de ancho al cambiar.
  count: { fontFamily: fonts.bodySemiBold, fontVariant: ['tabular-nums'] },
});
