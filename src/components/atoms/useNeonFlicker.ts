import { useEffect } from 'react';
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useSettingsStore } from '../../controllers/useSettingsStore';
import { duration, easing } from '../../theme/motion';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Animacion de entrada de un "logo" (texto/icono de seccion). Distinta
 * por tema, igual que el resto del sistema de neon (guia, "Animaciones" —
 * "1 · Encendido del neon" y "3 · Pulso de brillo" son "Solo modo
 * claro"):
 *  - Claro: parpadeo de encendido ("tubo de neon") y despues un pulso
 *    continuo suave.
 *  - Oscuro ("sin neon"): sube 12px y aparece en 600ms, una sola vez —
 *    sin parpadeo ni pulso continuo.
 * Se apaga por completo (salta al estado final) si el usuario activo
 * "Reducir animaciones" en Ajustes.
 */
export function useNeonFlicker() {
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const { scheme } = useTheme();
  const isLight = scheme === 'light';

  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion || isLight ? 0 : 12);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    if (isLight) {
      translateY.value = 0;
      // Una sola cadena: parpadeo de encendido y, al final, el pulso
      // continuo (el ultimo paso de withSequence puede ser un withRepeat
      // infinito).
      opacity.value = withSequence(
        withTiming(1, { duration: 70 }),
        withTiming(0.25, { duration: 50 }),
        withTiming(1, { duration: 90 }),
        withTiming(0.35, { duration: 50 }),
        withTiming(1, { duration: duration.slow }),
        withRepeat(withSequence(withTiming(0.82, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1, true),
      );
    } else {
      opacity.value = withTiming(1, { duration: 600, easing: easing.standard });
      translateY.value = withTiming(0, { duration: 600, easing: easing.standard });
    }

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, isLight]);

  return useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));
}
