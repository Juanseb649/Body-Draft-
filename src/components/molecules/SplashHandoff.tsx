import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettingsStore } from '../../controllers/useSettingsStore';

/** Mismo fondo y mismo logo que el splash nativo (ver app/_layout.tsx). */
const SPLASH_BACKGROUND = '#171218';
const LOGO = { width: 260, height: 252 };

/** Cuanto dura el traspaso entero, para que la pantalla sepa cuando entrar. */
export const SPLASH_HANDOFF_MS = 950;

/**
 * Traspaso desde el splash: la pantalla arranca EXACTAMENTE como el
 * splash nativo (mismo fondo, mismo logo, mismo tamaño), asi que no se
 * nota el corte; despues el logo sube hacia su sitio en la cabecera
 * mientras se encoge, y el fondo se abre como un telon para dejar ver
 * la pantalla de debajo.
 *
 * Solo mueve transform y opacidad (corre en el hilo de UI). Con
 * "Reducir animaciones" no se monta: la pantalla aparece directa.
 */
export function SplashHandoff({
  targetY = 120,
  centered = false,
}: {
  /** Altura (bajo el area segura) donde aterriza el logo. */
  targetY?: number;
  /**
   * El logo de la pantalla ya esta en el centro, donde lo deja el
   * splash (bienvenida): no viaja, solo se funde en su sitio.
   */
  centered?: boolean;
}) {
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [done, setDone] = useState(reduceMotion);

  const curtain = useSharedValue(1);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
    lift.set(withDelay(180, withTiming(1, { duration: 620, easing: ease })));
    curtain.set(
      withDelay(
        380,
        withTiming(0, { duration: 560, easing: ease }, (finished) => {
          if (finished) runOnJS(setDone)(true);
        }),
      ),
    );
  }, [reduceMotion, curtain, lift]);

  // Del centro de la pantalla (donde lo deja el splash) a la cabecera.
  const travel = centered ? 0 : insets.top + targetY - height / 2;
  const shrink = centered ? 0.1 : 0.55;

  const backgroundStyle = useAnimatedStyle(() => ({ opacity: curtain.get() }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: curtain.get(),
    transform: [{ translateY: lift.get() * travel }, { scale: 1 - lift.get() * shrink }],
  }));

  if (done) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BACKGROUND }, backgroundStyle]} />
      <Animated.Image
        source={require('../../../assets/logo-bodydraft.png')}
        style={[LOGO, logoStyle]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});

/** El traspaso solo tiene sentido en la PRIMERA pantalla que se abre. */
let handoffShown = false;

/**
 * true solo para la primera pantalla que lo pide en esta sesion de la
 * app (la que se abre detras del splash nativo). Ir de bienvenida a
 * login no vuelve a mostrar el splash: seria un corte que no existe.
 */
export function useSplashHandoffOnce(): boolean {
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const [first] = useState(() => {
    const isFirst = !handoffShown;
    handoffShown = true;
    return isFirst;
  });
  return first && !reduceMotion;
}
