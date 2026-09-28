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
import { duration } from '../../theme/motion';

/**
 * Animacion compartida de "tubo de neon": parpadeo de encendido y luego un
 * pulso continuo suave. La usan NeonText, SectionIcon y NeonSwoosh para que
 * todos los "logos" (texto e iconos de seccion) se enciendan igual. Se
 * apaga por completo si el usuario activo "Reducir animaciones" en Ajustes.
 */
export function useNeonFlicker() {
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(progress);
      progress.value = 1;
      return;
    }

    // Una sola cadena: parpadeo de encendido y, al final, el pulso continuo
    // (el ultimo paso de withSequence puede ser un withRepeat infinito).
    progress.value = withSequence(
      withTiming(1, { duration: 70 }),
      withTiming(0.25, { duration: 50 }),
      withTiming(1, { duration: 90 }),
      withTiming(0.35, { duration: 50 }),
      withTiming(1, { duration: duration.slow }),
      withRepeat(withSequence(withTiming(0.82, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1, true),
    );

    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  return useAnimatedStyle(() => ({ opacity: progress.value }));
}
