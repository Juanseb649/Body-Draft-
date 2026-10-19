import type { ReactNode } from 'react';
import { useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { useSettingsStore } from '../../controllers/useSettingsStore';

/**
 * Hace que un elemento aparezca (fundido + leve subida) a medida que
 * entra en pantalla al deslizar, en vez de estar ya dibujado desde el
 * principio.
 *
 * `sectionY` es la posicion del contenedor dentro del scroll y `localY`
 * la del elemento dentro de ese contenedor: hacen falta las dos porque
 * `onLayout` da coordenadas relativas al padre, no al scroll completo.
 * Se desactiva con "Reducir animaciones" en Ajustes.
 */
export function RevealOnScroll({
  scrollY,
  sectionY,
  children,
  style,
}: {
  scrollY: SharedValue<number>;
  sectionY: SharedValue<number>;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const { height } = useWindowDimensions();
  const localY = useSharedValue(0);

  const animated = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1, transform: [{ translateY: 0 }] };

    const absoluteY = sectionY.value + localY.value;
    // Arranca cuando el elemento asoma por el borde inferior de la pantalla.
    const start = absoluteY - height * 0.95;
    const progress = interpolate(scrollY.value, [start, start + 140], [0, 1], Extrapolation.CLAMP);

    return { opacity: progress, transform: [{ translateY: (1 - progress) * 28 }] };
  });

  return (
    <Animated.View
      style={[style, animated]}
      onLayout={(e) => {
        localY.value = e.nativeEvent.layout.y;
      }}
    >
      {children}
    </Animated.View>
  );
}
