import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useSettingsStore } from '../../controllers/useSettingsStore';
import type { Rect } from '../../models/zoneScan';
import { flatToneColor, fonts, neonLightHaloColor, useTheme } from '../../theme';

const CORNER = 26;
const STROKE = 3;

/**
 * Recuadro guia sobre la camara en vivo: cuatro esquinas de visor con
 * la forma de la zona elegida, su nombre, y una linea que barre de
 * arriba a abajo mientras se encuadra (se apaga con "Reducir
 * animaciones").
 *
 * Esquinas en el azul de "Draft" y linea en el fucsia de "Body": el
 * mismo par de tubos de neon del logo.
 */
export function ScanFrame({ frame, label }: { frame: Rect; label: string }) {
  const { scheme } = useTheme();
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const sweep = useSharedValue(0);

  const blue = flatToneColor(scheme, 'blue');
  const fuchsia = flatToneColor(scheme, 'fuchsia');
  // Sobre la camara siempre hay imagen detras: un halo ayuda a leer el
  // trazo en los dos temas, pero en oscuro la guia lo quiere plano.
  const halo = scheme === 'light' ? { boxShadow: `0 0 10px ${neonLightHaloColor('blue', 0.7)}` } : null;

  useEffect(() => {
    if (reduceMotion) {
      sweep.set(0.5);
      return;
    }
    sweep.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [reduceMotion, sweep]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.get() * (frame.height - STROKE) }],
  }));

  const corner = (pos: object, edges: object) => (
    <View style={[styles.corner, pos, edges, { borderColor: blue }, halo]} />
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.frame, { left: frame.x, top: frame.y, width: frame.width, height: frame.height }]}>
        {corner({ top: 0, left: 0 }, { borderTopWidth: STROKE, borderLeftWidth: STROKE, borderTopLeftRadius: 14 })}
        {corner({ top: 0, right: 0 }, { borderTopWidth: STROKE, borderRightWidth: STROKE, borderTopRightRadius: 14 })}
        {corner({ bottom: 0, left: 0 }, { borderBottomWidth: STROKE, borderLeftWidth: STROKE, borderBottomLeftRadius: 14 })}
        {corner({ bottom: 0, right: 0 }, { borderBottomWidth: STROKE, borderRightWidth: STROKE, borderBottomRightRadius: 14 })}
        <Animated.View style={[styles.sweep, { backgroundColor: fuchsia, boxShadow: `0 0 12px ${fuchsia}` }, lineStyle]} />
      </View>
      <View style={[styles.labelWrap, { top: frame.y + frame.height + 12 }]}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute' },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  sweep: { position: 'absolute', left: 10, right: 10, top: 0, height: STROKE, borderRadius: STROKE, opacity: 0.85 },
  labelWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,12,16,0.55)',
  },
});
