import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, type SharedValue } from 'react-native-reanimated';

import { Icon } from '../atoms/Icon';

/** Distancia del basurero al borde inferior del escenario. */
export const TRASH_BOTTOM = 28;
export const TRASH_SIZE = 64;

/**
 * El basurero que aparece solo cuando se arrastra el boceto hacia
 * abajo. `visible` (0..1) lo hace subir y aparecer; `hot` (0..1) es que
 * el boceto ya esta encima: crece y se pone rojo, para que se sepa que
 * al soltar se va.
 *
 * Va siempre sobre camara o maniquin (fondo oscuro), asi que usa
 * blanco y un rojo fijo en los dos temas.
 */
export function TrashTarget({ visible, hot }: { visible: SharedValue<number>; hot: SharedValue<number> }) {
  const containerStyle = useAnimatedStyle(() => ({
    opacity: visible.get(),
    transform: [
      { translateY: (1 - visible.get()) * 40 },
      { scale: withSpring(1 + hot.get() * 0.22, { damping: 14, stiffness: 260 }) },
    ],
  }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: hot.get() }));

  return (
    <View pointerEvents="none" style={styles.wrap} aria-hidden>
      <Animated.View style={[styles.circle, containerStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.hotFill, fillStyle]} />
        <Icon name="trash" size={28} color="#FFFFFF" strokeWidth={2} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: TRASH_BOTTOM, alignItems: 'center' },
  circle: {
    width: TRASH_SIZE,
    height: TRASH_SIZE,
    borderRadius: TRASH_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(14,12,16,0.72)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  hotFill: { backgroundColor: '#E5374C', borderRadius: TRASH_SIZE / 2 },
});
